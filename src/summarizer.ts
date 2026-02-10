import { GoogleGenAI } from '@google/genai';
import { Ollama } from 'ollama';
import { type Activity, type JulesClient } from '@google/jules-sdk';
// @google/jules-mcp is imported dynamically to avoid hard dependency in CI/test environments
type SessionStateResult = Awaited<ReturnType<typeof import('@google/jules-mcp')['getSessionState']>>;
type ReviewChangesResult = Awaited<ReturnType<typeof import('@google/jules-mcp')['codeReview']>>;
import parseDiff from 'parse-diff';
import micromatch from 'micromatch';
import { encode } from 'gpt-tokenizer';
import Bottleneck from 'bottleneck';
import { type ExpertPersona, resolvePersona, resolvePersonaByName, formatRulesForPrompt } from './expert-personas.js';
import { loadSkillRules } from './skill-loader.js';

// --- Configuration Constants ---
const CLOUD_MODEL_NAME = 'gemini-2.5-flash-lite';
const LOCAL_MODEL_DEFAULT = 'gemma3:4b';

const TOKEN_LIMIT_PER_FILE = 2000;
const MAX_TOTAL_TOKENS = 6000;

const IGNORE_PATTERNS = [
  '**/package-lock.json',
  '**/yarn.lock',
  '**/*.map',
  '**/dist/**',
  '**/*.min.js',
  '**/*.d.ts'
];

// Keep TonePreset as a type alias for backward compatibility
export type TonePreset = string;

interface ActivityLogEntry {
  index: number;
  type: string;
  summarySnippet: string;
  hadCodeChanges: boolean;
}

interface CachedSessionState {
  result: SessionStateResult;
  fetchedAt: number;
}

const SESSION_STATE_TTL_MS = 30_000;

export interface SummarizerConfig {
  backend?: 'cloud' | 'local';
  apiKey?: string;
  localModelName?: string;
  cloudModelName?: string;
  tone?: string;
  personaId?: string;
  skillsDir?: string;
  tier?: 'free' | 'tier1';
  sessionId?: string;
}

export class SessionSummarizer {
  private backend: 'cloud' | 'local';
  private localModelName: string;
  private persona: ExpertPersona | undefined;
  private customToneModifier: string;
  private skillsDir: string | undefined;
  private skillContext: string | null = null; // null = not yet loaded
  private genAI: GoogleGenAI | null = null;
  private genModel: any | null = null;
  private ollama: Ollama | null = null;
  private limiter: Bottleneck;
  private sessionId: string | undefined;
  private julesClient: JulesClient | null = null;
  private activityLog: ActivityLogEntry[] = [];
  private cachedSessionState: CachedSessionState | null = null;

  constructor(config: SummarizerConfig = {}) {
    this.backend = config.backend || 'local';
    this.localModelName = config.localModelName || LOCAL_MODEL_DEFAULT;
    this.skillsDir = config.skillsDir;
    this.sessionId = config.sessionId;

    // Resolve persona: try personaId first, then match tone string to persona name, then fall back to custom tone
    if (config.personaId) {
      this.persona = resolvePersona(config.personaId);
    } else if (config.tone) {
      this.persona = resolvePersonaByName(config.tone);
    }
    // If no persona matched and a tone string was given, use it as a custom modifier
    this.customToneModifier = this.persona ? '' : (config.tone || '');

    if (this.backend === 'cloud') {
      const key = config.apiKey || process.env.GEMINI_API_KEY;
      if (!key) throw new Error('Missing GEMINI_API_KEY for cloud backend');
      this.genAI = new GoogleGenAI({ apiKey: key });
      this.genModel = config.cloudModelName || CLOUD_MODEL_NAME;
      const isTier1 = config.tier === 'tier1';
      this.limiter = new Bottleneck({
        minTime: isTier1 ? 20 : 4000,
        maxConcurrent: isTier1 ? 5 : 1
      });
    } else {
      this.ollama = new Ollama();
      this.limiter = new Bottleneck({ maxConcurrent: 1 });
    }
  }

  /** Lazily load skill rules for the active persona. Cached after first load. */
  private async getSkillContext(): Promise<string> {
    if (this.skillContext !== null) return this.skillContext;
    if (!this.persona?.skillRef) {
      this.skillContext = '';
      return '';
    }
    try {
      const rules = await loadSkillRules(this.persona.skillRef, {
        tags: this.persona.focusTags,
        maxRules: this.persona.maxRules,
        skillsDir: this.skillsDir,
      });
      this.skillContext = formatRulesForPrompt(rules);
    } catch {
      this.skillContext = '';
    }
    return this.skillContext;
  }

  /** Build the persona prompt blocks (role, expertise, personality). */
  private async buildPersonaBlocks(): Promise<{ roleBlock: string; expertiseBlock: string; personalityBlock: string }> {
    if (!this.persona) {
      // Custom tone fallback
      return {
        roleBlock: 'You are the AI Developer.',
        expertiseBlock: '',
        personalityBlock: this.customToneModifier ? `PERSONALITY/TONE: ${this.customToneModifier}` : '',
      };
    }
    const expertise = await this.getSkillContext();
    return {
      roleBlock: this.persona.role,
      expertiseBlock: expertise ? `\n      EXPERTISE CONTEXT (best practices guiding your analysis):\n      ${expertise}` : '',
      personalityBlock: this.persona.personality ? `\n      PERSONALITY: ${this.persona.personality}` : '',
    };
  }

  private async getJulesClient(): Promise<JulesClient> {
    if (!this.julesClient) {
      const { connect } = await import('@google/jules-sdk');
      this.julesClient = connect();
    }
    return this.julesClient;
  }

  private async getCachedSessionState(): Promise<SessionStateResult | undefined> {
    if (!this.sessionId) return undefined;
    const now = Date.now();
    if (this.cachedSessionState && (now - this.cachedSessionState.fetchedAt) < SESSION_STATE_TTL_MS) {
      return this.cachedSessionState.result;
    }
    try {
      const client = await this.getJulesClient();
      const { getSessionState } = await import('@google/jules-mcp');
      const result = await getSessionState(client, this.sessionId);
      this.cachedSessionState = { result, fetchedAt: now };
      return result;
    } catch (err) {
      console.error('[Summarizer] Failed to fetch session state:', (err as Error).message);
      return this.cachedSessionState?.result;
    }
  }

  private getTrajectoryString(): string {
    const recent = this.activityLog.slice(-5);
    if (recent.length === 0) return 'No prior activities.';
    return recent.map((a, i) => `${i + 1}. [${a.type}] ${a.summarySnippet}`).join('\n');
  }

  async generateRollingSummary(
    previousState: string,
    currentActivity: Activity
  ): Promise<string> {
    const activityContext = this.simplifyActivity(currentActivity);
    const isCodeTask = !!activityContext.context;

    // Fetch session goal for context-aware prompts
    const sessionState = await this.getCachedSessionState();
    const sessionGoal = sessionState?.prompt;
    const trajectory = this.getTrajectoryString();

    let summary: string;
    if (isCodeTask) {
      summary = await this.executeRequest(await this.getCodePrompt(activityContext, sessionGoal, trajectory));
    } else {
      summary = await this.executeRequest(await this.getPlanningPrompt(activityContext, sessionGoal, trajectory));
    }

    // Record in activity log
    this.activityLog.push({
      index: this.activityLog.length,
      type: currentActivity.type,
      summarySnippet: summary.slice(0, 80),
      hadCodeChanges: isCodeTask,
    });

    return summary;
  }

  // --- PROMPT 1: THE ACTIVE CODER (For Diffs) ---
  private async getCodePrompt(context: any, sessionGoal?: string, trajectory?: string): Promise<string> {
    const { roleBlock, expertiseBlock, personalityBlock } = await this.buildPersonaBlocks();
    const goalBlock = sessionGoal ? `\n      SESSION GOAL: ${sessionGoal}` : '';
    const trajectoryBlock = trajectory ? `\n      TRAJECTORY SO FAR:\n      ${trajectory}` : '';
    const hasExpertise = !!expertiseBlock;

    return `
      ROLE: ${roleBlock}
      TASK: Report the technical action taken in this activity, grounded in the session's goal and trajectory.${hasExpertise ? ' Weave in 1-2 brief, actionable recommendations from your expertise where relevant to the changes.' : ''}
      ${goalBlock}${trajectoryBlock}${expertiseBlock}

      INPUT DATA GUIDANCE:
      - 'status': 'truncated_large_file' -> Infer changes from 'affectedScopes'.
      - 'status': 'included' -> Read 'diff' for logic details.

      COMMIT MESSAGE: ${context.commitMessage || 'N/A'}
      CHANGED FILES:
      ${JSON.stringify(context.context)}

      INSTRUCTIONS:
      1. STYLE: Direct Technical Statement. Start with the Verb.
         - YES: "Refactored \`SessionSummarizer\` to inject session goal context into code prompts, enabling trajectory-aware summaries."
         - YES: "Added \`generateStatus()\` method to \`summarizer.ts\` that queries MCP session state for rolling status narratives."
         - NO: "I am updating..." or "Updated code" (too vague)
      2. FORMATTING: Wrap ALL filenames/classes/functions in backticks (\`).
      3. SPECIFICITY: Reference specific files, functions, or variables affected. Explain WHY the change was made relative to the session goal.
      4. LENGTH: ${hasExpertise ? '250-500' : '200-400'} chars.${personalityBlock ? `\n      5. ${personalityBlock}` : ''}

      OUTPUT:
    `;
  }

  // --- PROMPT 2: THE OBJECTIVE REPORTER (For Plans/Messages) ---
  private async getPlanningPrompt(context: any, sessionGoal?: string, trajectory?: string): Promise<string> {
    const { roleBlock, expertiseBlock, personalityBlock } = await this.buildPersonaBlocks();
    const goalBlock = sessionGoal ? `\n      SESSION GOAL: ${sessionGoal}` : '';
    const trajectoryBlock = trajectory ? `\n      TRAJECTORY SO FAR:\n      ${trajectory}` : '';

    return `
      ROLE: ${roleBlock}
      TASK: Summarize the event, grounded in the session's goal and what has happened so far.
      ${goalBlock}${trajectoryBlock}${expertiseBlock}

      NEW ACTIVITY:
      ${JSON.stringify(context)}

      INSTRUCTIONS:
      1. STYLE: Objective & Natural.
         - BAD: "Hey, I made a plan..." (Too chatty)
         - BAD: "Strategizing the execution..." (Too corporate)
         - GOOD: "Generated a plan to restructure the authentication flow: migrate from session cookies to JWT tokens across 4 middleware files."
         - GOOD: "Plan approved. Implementation will add rate limiting to the /api/stream endpoint and introduce a Bottleneck-based queue."

      2. BAN LIST: Do NOT start sentences with "Hey", "Okay", "So", "Alright", "Well".

      3. CONTENT:
         - Use the 'title' or 'description' fields from the input.
         - Summarize the specific goal and connect it to the session trajectory.
         - Be specific about what the plan/message addresses.

      4. LENGTH: 200-400 chars.
      5. FORMATTING: Wrap filenames/classes in backticks (\`) when referenced.${personalityBlock ? `\n      6. ${personalityBlock}` : ''}

      OUTPUT:
    `;
  }

  // --- NEW: Generate rolling status narrative ---
  async generateStatus(activityIndex: number): Promise<string> {
    if (!this.sessionId) throw new Error('sessionId required for generateStatus');

    const client = await this.getJulesClient();
    const { codeReview } = await import('@google/jules-mcp');

    const [sessionState, review] = await Promise.all([
      this.getCachedSessionState(),
      codeReview(client, this.sessionId).catch(() => undefined),
    ]);

    if (!sessionState) throw new Error('Could not fetch session state');

    const trajectory = this.getTrajectoryString();
    const insights = review?.insights;
    const filesSummary = review?.summary;

    return this.executeRequest(`
      ROLE: You are a Session Activity Reporter.
      TASK: Describe what happened at this point in the coding session.

      SESSION GOAL: ${sessionState.prompt || 'Unknown'}
      SESSION STATUS: ${sessionState.status}
      ACTIVITY COUNT: ${activityIndex + 1}

      TRAJECTORY (last 5 activities):
      ${trajectory}

      ${filesSummary ? `FILES TOUCHED: ${filesSummary.totalFiles} total (${filesSummary.created} created, ${filesSummary.modified} modified, ${filesSummary.deleted} deleted)` : ''}
      ${insights ? `INSIGHTS: ${insights.planRegenerations} plan regenerations, ${insights.failedCommandCount} failed commands, ${insights.completionAttempts} completion attempts` : ''}
      ${sessionState.lastAgentMessage ? `LAST AGENT MESSAGE: ${sessionState.lastAgentMessage.content.slice(0, 200)}` : ''}

      INSTRUCTIONS:
      1. Describe what phase of work was underway (planning, implementing, debugging, testing, etc.)
      2. Summarize what was accomplished toward the session goal
      3. Note any signals worth watching (failed commands, plan regenerations, etc.)
      4. LENGTH: 200-500 chars
      5. STYLE: Neutral, informative. Past tense. No first person.

      OUTPUT:
    `, { preserveNewlines: true });
  }

  // --- NEW: Generate per-activity code review ---
  async generateCodeReview(activityId: string): Promise<string> {
    if (!this.sessionId) throw new Error('sessionId required for generateCodeReview');

    const client = await this.getJulesClient();
    const { showDiff, codeReview } = await import('@google/jules-mcp');

    const [diff, review] = await Promise.all([
      showDiff(client, this.sessionId, { activityId }),
      codeReview(client, this.sessionId, { activityId }).catch(() => undefined),
    ]);

    if (!diff.unidiffPatch) throw new Error('No diff available for this activity');

    // Truncate large diffs to stay within token limits
    const truncatedPatch = diff.unidiffPatch.length > 8000
      ? diff.unidiffPatch.slice(0, 8000) + '\n... (truncated)'
      : diff.unidiffPatch;

    return this.executeRequest(`
      ROLE: You are a Code Reviewer.
      TASK: Provide a concise code review for the changes in this activity.

      FILES CHANGED: ${diff.files.map(f => `${f.path} (+${f.additions}/-${f.deletions})`).join(', ')}

      DIFF:
      ${truncatedPatch}

      ${review?.formatted ? `REVIEW CONTEXT:\n${review.formatted.slice(0, 1000)}` : ''}

      INSTRUCTIONS:
      Format your output EXACTLY as follows with each section on its own line:

      **Patterns**
      - item

      **Trade-offs**
      - item

      **Risks**
      - item

      **Highlights**
      - item

      Rules:
      1. Each section header must be bold (**Name**) on its own line
      2. Each bullet must start with "- " on its own line
      3. Wrap filenames in backticks
      4. LENGTH: 300-600 chars total
      5. If a section has nothing notable, omit it entirely

      OUTPUT:
    `, { preserveNewlines: true });
  }

  async styleTransfer(existingSummary: string, activityType: string): Promise<string> {
    const { roleBlock, expertiseBlock, personalityBlock } = await this.buildPersonaBlocks();
    const isCode = activityType === 'changeSet';
    const hasExpertise = !!expertiseBlock;

    const raw = await this.executeRequest(`
      ROLE: ${roleBlock}
      TASK: Rewrite the following summary through your expert lens while preserving ALL technical details.${hasExpertise ? ' Weave in 1-2 brief, actionable recommendations from your expertise where relevant.' : ''}

      ORIGINAL SUMMARY:
      ${existingSummary}

      ACTIVITY TYPE: ${isCode ? 'Code Change' : 'Planning/Message'}${expertiseBlock}

      INSTRUCTIONS:
      1. Preserve ALL technical details: filenames, function names, class names, and backtick-wrapped references.
      2. ${hasExpertise ? 'Add brief, actionable insight from your expertise where the code change is relevant. Keep recommendations concise.' : 'Rewrite the summary in the voice described above.'}
      3. LENGTH: ${hasExpertise ? '250-500' : '200-400'} chars.
      4. Maintain backtick formatting for all code references.
      5. Do NOT start with "I" or use first person.
      6. Output PLAIN TEXT only. No markdown formatting — no *, **, _, or quotation marks for emphasis or dialogue.
      7. Write as a single continuous paragraph. No line breaks.${personalityBlock ? `\n      8. ${personalityBlock}` : ''}

      OUTPUT:
    `);
    return this.cleanStyleTransferOutput(raw);
  }

  /** Strip markdown formatting artifacts that LLMs add despite being told not to. */
  private cleanStyleTransferOutput(text: string): string {
    // Preserve backtick code spans, strip everything else
    const spans: string[] = [];
    let cleaned = text.replace(/`[^`]+`/g, (m) => {
      spans.push(m);
      return `\x00${spans.length - 1}\x00`;
    });
    // Remove *, **, _ emphasis markers
    cleaned = cleaned.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1');
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
    // Remove stray leading/trailing quotes used as dialogue
    cleaned = cleaned.replace(/(^|\s)"(\w)/g, '$1$2');
    cleaned = cleaned.replace(/(\w)"(\s|$)/g, '$1$2');
    // Restore backtick spans
    cleaned = cleaned.replace(/\x00(\d+)\x00/g, (_, i) => spans[parseInt(i)]);
    return cleaned.trim();
  }

  public getLabelData(activity: Activity) {
    const changeSetArtifact = activity.artifacts?.find(a => a.type === 'changeSet');
    if (!changeSetArtifact || !changeSetArtifact.gitPatch) return [];
    const files = parseDiff(changeSetArtifact.gitPatch.unidiffPatch);
    return files
      .filter(f => !micromatch.isMatch(f.to || f.from || '', IGNORE_PATTERNS))
      .map(file => ({
        path: file.to || file.from || 'unknown',
        additions: file.additions,
        deletions: file.deletions
      }));
  }

  private async executeRequest(prompt: string, options?: { attempt?: number; preserveNewlines?: boolean }): Promise<string> {
    const attempt = options?.attempt ?? 1;
    const keepNewlines = options?.preserveNewlines;

    return this.limiter.schedule(async () => {
      try {
        let text = '';
        if (this.backend === 'cloud' && this.genAI) {
          const result = await this.genAI.models.generateContent({
            model: this.genModel,
            contents: prompt,
          });
          text = result.text || '';
        } else if (this.backend === 'local' && this.ollama) {
          const response = await this.ollama.chat({
            model: this.localModelName,
            messages: [{ role: 'user', content: prompt }],
            options: { temperature: 0.2, num_ctx: 8192, num_predict: 128 }
          });
          text = response.message.content;
        }
        text = text.replace(/```/g, '');
        if (keepNewlines) {
          return text.replace(/[ \t]+/g, ' ').trim();
        }
        return text.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
      } catch (error: any) {
        const isRetryable =
          error.status === 429 || error.message?.includes('429') ||
          error.status === 503 || error.message?.includes('503') ||
          error.message?.includes('overloaded');

        if (this.backend === 'cloud' && isRetryable && attempt < 5) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 60000);
          console.log(`[Summarizer] Retrying in ${backoffMs / 1000}s (attempt ${attempt}/5)...`);
          await new Promise(r => setTimeout(r, backoffMs));
          return this.executeRequest(prompt, { attempt: attempt + 1, preserveNewlines: keepNewlines });
        }
        console.error(`[Summarizer] Error:`, error.message);
        throw error;
      }
    });
  }

  // --- UPDATED SIMPLIFY ACTIVITY ---
  private simplifyActivity(activity: Activity): Record<string, any> {
    const base = { type: activity.type, originator: activity.originator };

    // 1. Code Changes
    const changeSet = activity.artifacts?.find(a => a.type === 'changeSet');
    if (changeSet && changeSet.gitPatch) {
      return {
        ...base,
        context: this.buildSmartContext(changeSet.gitPatch.unidiffPatch),
        commitMessage: changeSet.gitPatch.suggestedCommitMessage
      };
    }

    // 2. Planning - EXTRACT ACTUAL TEXT
    if (activity.type === 'planGenerated') {
      // Deep extraction to find meaningful text
      const plan = (activity as any).planGenerated?.plan || (activity as any).plan;
      const firstStep = plan?.steps?.[0]?.title;
      const activityTitle = (activity as any).title;

      // Priority: Activity Title -> First Step Title -> Generic fallback
      const description = activityTitle || firstStep || 'Plan generated with no details.';

      return { ...base, description };
    }

    if (activity.type === 'planApproved') {
      return { ...base, description: 'User approved the plan.' };
    }

    // 3. Messages
    if (activity.type === 'agentMessaged' || activity.type === 'userMessaged') {
      return { ...base, message: (activity as any).message };
    }

    // 4. Progress
    if (activity.type === 'progressUpdated') {
      return { ...base, description: (activity as any).title };
    }

    return base;
  }

  private buildSmartContext(rawDiff: string) {
    const files = parseDiff(rawDiff);
    let currentTokenCount = 0;
    return files.map(file => {
      const filePath = file.to || file.from || 'unknown';
      if (micromatch.isMatch(filePath, IGNORE_PATTERNS)) {
        return { file: filePath, status: 'ignored_artifact', changes: `+${file.additions}/-${file.deletions}` };
      }
      const fileDiffString = file.chunks.map(c => c.content).join('\n');
      const fileTokens = encode(fileDiffString).length;

      if (currentTokenCount + fileTokens > MAX_TOTAL_TOKENS) {
        return { file: filePath, status: 'truncated_budget_exceeded', summary: `Modified ${file.additions} lines`, affectedMethods: this.extractHunkHeaders(file.chunks) };
      }
      if (fileTokens > TOKEN_LIMIT_PER_FILE) {
        return { file: filePath, status: 'truncated_large_file', summary: `Large refactor (+${file.additions}/-${file.deletions})`, affectedScopes: this.extractHunkHeaders(file.chunks) };
      }
      currentTokenCount += fileTokens;
      return { file: filePath, status: 'included', diff: fileDiffString };
    });
  }

  private extractHunkHeaders(chunks: any[]): string[] {
    return chunks.map(chunk => {
      const headerMatch = chunk.content.match(/@@.*?@@\s*(.*)/);
      return headerMatch ? headerMatch[1].trim() : null;
    }).filter(Boolean).slice(0, 5);
  }
}
