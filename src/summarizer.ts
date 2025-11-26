import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ollama } from 'ollama';
import { type Activity } from 'modjules';
import parseDiff from 'parse-diff';
import micromatch from 'micromatch';
import { encode } from 'gpt-tokenizer';
import Bottleneck from 'bottleneck';

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

export interface SummarizerConfig {
  backend?: 'cloud' | 'local';
  apiKey?: string;
  localModelName?: string;
  tier?: 'free' | 'tier1';
}

export class SessionSummarizer {
  private backend: 'cloud' | 'local';
  private localModelName: string;
  private genAI: GoogleGenerativeAI | null = null;
  private genModel: any | null = null;
  private ollama: Ollama | null = null;
  private limiter: Bottleneck;

  constructor(config: SummarizerConfig = {}) {
    this.backend = config.backend || 'local';
    this.localModelName = config.localModelName || LOCAL_MODEL_DEFAULT;

    if (this.backend === 'cloud') {
      const key = config.apiKey || process.env.GEMINI_API_KEY;
      if (!key) throw new Error('Missing GEMINI_API_KEY for cloud backend');
      this.genAI = new GoogleGenerativeAI(key);
      this.genModel = this.genAI.getGenerativeModel({ model: CLOUD_MODEL_NAME });
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

  async generateRollingSummary(
    previousState: string,
    currentActivity: Activity
  ): Promise<string> {
    const activityContext = this.simplifyActivity(currentActivity);

    // DECISION LOGIC: Coding (Diffs) vs. Non-Coding (Plans/Messages)
    const isCodeTask = !!activityContext.context;

    if (isCodeTask) {
      return this.executeRequest(this.getCodePrompt(activityContext));
    } else {
      return this.executeRequest(this.getPlanningPrompt(activityContext));
    }
  }

  // --- PROMPT 1: THE ACTIVE CODER (For Diffs) ---
  private getCodePrompt(context: any): string {
    return `
      ROLE: You are the AI Developer.
      TASK: Report the technical action taken.

      INPUT DATA GUIDANCE:
      - 'status': 'truncated_large_file' -> Infer changes from 'affectedScopes'.
      - 'status': 'included' -> Read 'diff' for logic details.
      
      NEW ACTIVITY:
      ${JSON.stringify(context)}

      INSTRUCTIONS:
      1. STYLE: Direct Technical Statement. Start with the Verb.
         - YES: "Refactoring SessionClient to support new handshake."
         - NO: "I am updating..." or "Updating..." (Passive)
      2. FORMATTING: Wrap ALL filenames/classes in backticks (\`).
      3. LENGTH: 110-150 chars.

      OUTPUT:
    `;
  }

  // --- PROMPT 2: THE OBJECTIVE REPORTER (For Plans/Messages) ---
  private getPlanningPrompt(context: any): string {
    return `
      ROLE: You are a Project Logger.
      TASK: Summarize the event based on the JSON below.

      NEW ACTIVITY:
      ${JSON.stringify(context)}

      INSTRUCTIONS:
      1. STYLE: Objective & Natural. 
         - BAD: "Hey, I made a plan..." (Too chatty)
         - BAD: "Strategizing the execution..." (Too corporate)
         - GOOD: "Generated a plan to update the SessionClient logic."
         - GOOD: "Plan approved. Starting implementation."
         - GOOD: "User requested a format check."

      2. BAN LIST: Do NOT start sentences with "Hey", "Okay", "So", "Alright", "Well".
      
      3. CONTENT: 
         - Use the 'title' or 'description' fields from the input.
         - Summarize the specific goal (e.g. "update SessionClient").

      4. LENGTH: 110-150 chars.

      OUTPUT:
    `;
  }

  // ... (getLabelData, executeRequest, etc. remain exactly the same) ...
  public getLabelData(activity: Activity) {
    const changeSetArtifact = activity.artifacts?.find(a => a.type === 'changeSet');
    if (!changeSetArtifact || !changeSetArtifact.changeSet.gitPatch) return [];
    const files = parseDiff(changeSetArtifact.changeSet.gitPatch.unidiffPatch);
    return files
      .filter(f => !micromatch.isMatch(f.to || f.from || '', IGNORE_PATTERNS))
      .map(file => ({
        path: file.to || file.from || 'unknown',
        additions: file.additions,
        deletions: file.deletions
      }));
  }

  private async executeRequest(prompt: string, attempt = 1): Promise<string> {
    return this.limiter.schedule(async () => {
      try {
        let text = '';
        if (this.backend === 'cloud' && this.genModel) {
          const result = await this.genModel.generateContent(prompt);
          const response = await result.response;
          text = response.text();
        } else if (this.backend === 'local' && this.ollama) {
          const response = await this.ollama.chat({
            model: this.localModelName,
            messages: [{ role: 'user', content: prompt }],
            options: { temperature: 0.2, num_ctx: 8192, num_predict: 128 }
          });
          text = response.message.content;
        }
        return text.replace(/```/g, '').replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
      } catch (error: any) {
        if (this.backend === 'cloud' && (error.status === 429 || error.message?.includes('429'))) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 60000);
          await new Promise(r => setTimeout(r, backoffMs));
          return this.executeRequest(prompt, attempt + 1);
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
    if (changeSet?.changeSet?.gitPatch) {
      return {
        ...base,
        context: this.buildSmartContext(changeSet.changeSet.gitPatch.unidiffPatch),
        commitMessage: changeSet.changeSet.gitPatch.suggestedCommitMessage
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
