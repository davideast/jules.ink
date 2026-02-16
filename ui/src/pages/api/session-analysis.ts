import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { resolvePersonaByName, loadSkillRules } from 'jules-ink';
import { readEnv } from '../../lib/api-keys';
import { versionKey } from '../../lib/print-stack';
import type { PrintStack } from '../../lib/print-stack';
import type {
  SessionAnalysisRequest,
  SessionAnalysisResponse,
  StructuralAnalysis,
  InterpretiveAnalysis,
  PromptImprovements,
} from '../../lib/session-analysis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.JULES_INK_ROOT || path.resolve(__dirname, '../../../../');
const STACKS_DIR = path.join(ROOT_DIR, '.jules', 'stacks');
const SKILLS_DIR = path.join(ROOT_DIR, '.agents', 'skills');

const PHASE1_MODEL = 'gemini-2.5-flash';
const DEFAULT_PHASE2_MODEL = 'gemini-2.5-flash-lite';

function buildPhase1Prompt(stack: PrintStack, sessionPrompt?: string): string {
  const activityCount = stack.activities.length;

  // Duration
  let duration = 'Unknown';
  if (activityCount >= 2) {
    const first = stack.activities[0].createTime;
    const last = stack.activities[activityCount - 1].createTime;
    if (first && last) {
      const diffMs = new Date(last).getTime() - new Date(first).getTime();
      const diffMin = Math.round(diffMs / 60000);
      duration = diffMin > 0 ? `~${diffMin} min` : '<1 min';
    }
  }

  // Rank files by churn for selective diff inclusion
  const fileChurn = new Map<string, number>();
  for (const a of stack.activities) {
    for (const f of a.files) {
      fileChurn.set(f.path, (fileChurn.get(f.path) || 0) + f.additions + f.deletions);
    }
  }
  const topFiles = new Set(
    Array.from(fileChurn.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([p]) => p),
  );

  let activityTimeline = '';
  for (let i = 0; i < activityCount; i++) {
    const a = stack.activities[i];
    const fileList = a.files
      .map(f => `  ${f.path} (+${f.additions}/-${f.deletions})`)
      .join('\n');
    let section = `---\n[Activity ${i}] ${a.activityType} at ${a.createTime || 'N/A'}\n`;
    section += `Commit: ${a.commitMessage || 'N/A'}\n`;
    section += `Files:\n${fileList}\n`;
    section += `Summary: ${a.summary}\n`;
    if (a.codeReview) {
      section += `Code Review: ${a.codeReview}\n`;
    }
    // Include diff for top files, truncated
    if (a.unidiffPatch) {
      const hasTopFile = a.files.some(f => topFiles.has(f.path));
      if (hasTopFile) {
        const truncated = a.unidiffPatch.slice(0, 2000);
        section += `Diff (truncated):\n${truncated}\n`;
      }
    }
    section += '---\n';
    activityTimeline += section;
  }

  return `You are a Senior Technical Analyst performing structural analysis of a coding session where an AI agent (Jules) worked on a codebase.

SESSION CONTEXT:
- Repository: ${stack.repo}
- Original Request: ${sessionPrompt || 'Not provided'}
- Activities: ${activityCount}
- Duration: ${duration}

ACTIVITY TIMELINE:
${activityTimeline}

Analyze this session and return structured JSON:

{
  "intents": [
    {
      "title": "Short intent title (what the agent was trying to accomplish)",
      "activityIndices": [0, 1, 3],
      "files": ["src/auth.ts"],
      "whatChanged": "Concrete description of changes",
      "whyItChanged": "Purpose inferred from context"
    }
  ],
  "agentTrace": {
    "taskUnderstanding": "How well the agent understood the ask",
    "planQuality": "Assessment of plan completeness/appropriateness",
    "executionFidelity": "How closely execution matched plan",
    "decisionPoints": ["Key decisions or pivot points"],
    "corrections": ["Backtracking or corrections, if any"],
    "pacing": "Work pacing and sequencing assessment"
  },
  "factualFindings": {
    "architecturalImpact": ["Factual architectural change statements"],
    "riskFactors": ["Factual risk observations"],
    "patterns": ["**Pattern Name**: 1-sentence explanation. e.g. '**Rate Limiting**: Used \`p-limit\` to cap concurrent fetch requests'"],
    "gaps": ["Missing tests, docs, error handling, etc."]
  }
}

RULES:
1. Group activities by distinct INTENT — what the agent was trying to accomplish. Not by file or chronology.
2. Every activity index must appear in exactly one intent.
3. Reference actual file paths and function names.
4. Keep strings concise (1-3 sentences).
5. Limit to 2-7 intents. Merge trivially related activities.
6. decisionPoints and corrections may be empty if none observed.`;
}

async function buildPhase2Prompt(
  structural: StructuralAnalysis,
  tone: string,
  sessionPrompt?: string,
): Promise<string> {
  const persona = resolvePersonaByName(tone);

  let roleBlock = '';
  let skillContext = '';

  if (persona) {
    roleBlock = persona.role;
    if (persona.personality) {
      roleBlock += '\n' + persona.personality;
    }
    if (persona.skillRef) {
      try {
        const rules = await loadSkillRules(persona.skillRef, {
          tags: persona.focusTags,
          maxRules: persona.maxRules,
          skillsDir: SKILLS_DIR,
        });
        if (rules.length > 0) {
          skillContext = rules
            .map(r => `- [${r.impact}] ${r.title}: ${r.explanation}`)
            .join('\n');
        }
      } catch {
        // Skills not available — proceed without
      }
    }
  } else {
    roleBlock = `You are an expert code reviewer writing in a "${tone}" style.`;
  }

  return `${roleBlock}

${skillContext ? `Your expertise (use ONLY to inform analysis of what the code actually does, NOT to recommend changes):\n${skillContext}\n` : ''}
Interpret the following structural analysis. Write in your voice. Your analysis MUST be grounded in the actual code changes — describe what IS there, not what SHOULD be there.

Session Goal: ${sessionPrompt || 'Not provided'}

Structural Analysis:
${JSON.stringify(structural, null, 2)}

Return JSON:
{
  "narrative": "First sentence is the lead — punchy, specific, 1 sentence only.\\n\\nSecond paragraph elaborates (2-3 sentences).\\n\\nOptional third paragraph. MUST use literal \\n\\n between paragraphs.",
  "intentDescriptions": [
    { "intentIndex": 0, "title": "Concise 3-6 word title", "description": "1 sentence, reference key files in backticks" }
  ],
  "riskAssessments": ["**Concurrency Threshold**: The \`p-limit\` cap is hardcoded to 5 — misconfiguring it could shift the bottleneck rather than eliminate it."],
  "keyInsights": ["**Bounded Parallelism**: The code replaces \`Promise.all\` with \`p-limit\` to cap concurrent fetch requests, preventing I/O saturation under load."],
  "verdict": "One-sentence overall assessment",
  "nextSteps": ["**Load Test Limits**: Benchmark \`ServeView.tsx\` with varying concurrency caps to find the optimal threshold."]
}

RULES:
1. Write in your persona voice throughout.
2. Wrap ALL file paths, function names, and code references in backticks.
3. Every intentDescription must reference a valid intentIndex from the structural analysis.
4. keyInsights and riskAssessments MUST describe what the code ACTUALLY DOES or what IS observable in the changes. Do NOT invent patterns, techniques, or features that are not present in the code. If the code uses static imports, do not claim it uses dynamic imports. If there is no error handling, do not claim there is. Recommendations for improvements belong ONLY in nextSteps.
5. MANDATORY FORMAT for EVERY item in riskAssessments, keyInsights, and nextSteps: Start with "**2-4 Word Label**: " (bold markdown, then colon+space) followed by the explanation. Items missing the **bold label** prefix are INVALID. See the examples above.
6. Keep intentDescription titles concise and scannable (3-6 words).
7. The narrative field MUST contain literal \\n\\n (two newlines) to separate paragraphs. Do NOT return a single unbroken block.
8. nextSteps is the ONLY field where you may recommend changes not yet in the code. All other fields must be strictly observational.`;
}

function buildPhase3Prompt(sessionPrompt: string, structural: StructuralAnalysis): string {
  const { agentTrace, factualFindings, intents } = structural;

  return `You are a Prompt Quality Analyst. Evaluate how well the original user prompt guided an AI coding agent's session, using the session's actual outcomes as evidence.

ORIGINAL PROMPT:
"${sessionPrompt}"

SESSION EVIDENCE:

Decision Points (each = ambiguity the prompt could have resolved):
${agentTrace.decisionPoints.length > 0 ? agentTrace.decisionPoints.map((d, i) => `${i + 1}. ${d}`).join('\n') : 'None observed'}

Corrections (backtracking = misunderstanding traceable to prompt):
${agentTrace.corrections.length > 0 ? agentTrace.corrections.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'None observed'}

Gaps (missing tests/docs/error handling = unspecified requirements):
${factualFindings.gaps.length > 0 ? factualFindings.gaps.map((g, i) => `${i + 1}. ${g}`).join('\n') : 'None observed'}

Risk Factors (risks = constraints the prompt didn't mention):
${factualFindings.riskFactors.length > 0 ? factualFindings.riskFactors.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'None observed'}

Task Understanding: ${agentTrace.taskUnderstanding}

Intents Derived (${intents.length} intents from the prompt):
${intents.map((intent, i) => `${i + 1}. ${intent.title}: ${intent.whatChanged}`).join('\n')}

Return JSON:
{
  "originalPrompt": "The exact original prompt",
  "strengths": [
    { "label": "Short label (2-5 words)", "evidence": "Specific session data proving this strength" }
  ],
  "weaknesses": [
    { "label": "Short label (2-5 words)", "evidence": "Specific session data proving this weakness", "severity": "minor|moderate|major" }
  ],
  "improvedPrompt": "A rewritten 2-5 sentence prompt that addresses the weaknesses while preserving the strengths",
  "summary": "One sentence, max 15 words — the core quality judgment",
  "detail": "2-3 sentences elaborating on the summary with specific references to session data"
}

RULES:
1. Every strength MUST cite specific positive outcomes from the session (e.g. "Agent understood X correctly as shown by taskUnderstanding" or "No corrections needed for Y").
2. Every weakness MUST cite a specific decisionPoint, correction, gap, or riskFactor as evidence. Generic advice like "be more specific" without evidence is FORBIDDEN.
3. Severity mapping: major = caused corrections/backtracking; moderate = caused decision points or missed requirements; minor = caused gaps in non-critical areas.
4. Limit: 2-4 strengths, 2-5 weaknesses.
5. The improved prompt must be concrete and copy-pasteable — not a template with placeholders.
6. If the session had zero corrections and zero decision points, acknowledge the prompt was well-crafted but still suggest refinements based on gaps.
7. "summary" must be a single sentence of at most 15 words capturing the core quality judgment. "detail" must be 2-3 sentences that elaborate with specific session evidence.`;
}

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as SessionAnalysisRequest;

  if (!body.sessionId || !body.stackId || !body.tone) {
    return new Response(
      JSON.stringify({ error: 'sessionId, stackId, and tone are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const env = await readEnv();
  const apiKey = process.env.GEMINI_API_KEY || env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Load stack from disk
  let stack: PrintStack;
  try {
    const content = await fs.readFile(
      path.join(STACKS_DIR, `${body.stackId}.json`),
      'utf-8',
    );
    stack = JSON.parse(content);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Stack not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Resolve session prompt — client may not have it (jules.select cache doesn't include prompt)
  let sessionPrompt = body.sessionPrompt || '';
  if (!sessionPrompt && body.sessionId) {
    try {
      // Ensure Jules SDK can authenticate (env was read above for GEMINI_API_KEY)
      if (!process.env.JULES_API_KEY) {
        const julesKey = env.get('JULES_API_KEY');
        if (julesKey) process.env.JULES_API_KEY = julesKey;
      }
      const { connect } = await import('@google/jules-sdk');
      const jules = connect();
      const session = jules.session(body.sessionId);
      const info = await session.info();
      sessionPrompt = info.prompt || '';
    } catch (err) {
      console.error('[session-analysis] Failed to fetch session prompt:', err);
    }
  }

  const phase2Model = body.model || DEFAULT_PHASE2_MODEL;
  const vKey = versionKey(body.tone, phase2Model);
  const genAI = new GoogleGenAI({ apiKey });

  // Check cache
  const cachedStructural = stack.analysis?.structural || body.structuralAnalysis || undefined;
  const cachedInterpretive = stack.analysis?.interpretive?.[vKey] ?? undefined;
  const cachedPromptImprovements = stack.analysis?.promptImprovements?.[phase2Model];

  if (cachedStructural && cachedInterpretive) {
    // If sessionPrompt provided but Phase 3 hasn't run yet, generate it now
    let promptImprovements: PromptImprovements | undefined = cachedPromptImprovements;
    if (sessionPrompt && !cachedPromptImprovements) {
      try {
        const prompt = buildPhase3Prompt(sessionPrompt, cachedStructural);
        const result = await genAI.models.generateContent({
          model: phase2Model,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        const pi = JSON.parse(result.text || '{}') as PromptImprovements;
        pi.model = phase2Model;
        pi.generatedAt = new Date().toISOString();
        promptImprovements = pi;

        // Persist to cache
        if (!stack.analysis) stack.analysis = {};
        if (!stack.analysis.promptImprovements) stack.analysis.promptImprovements = {};
        stack.analysis.promptImprovements[phase2Model] = pi;
        try {
          await fs.writeFile(
            path.join(STACKS_DIR, `${body.stackId}.json`),
            JSON.stringify(stack, null, 2),
          );
        } catch (err) {
          console.error('Failed to persist prompt improvements cache:', err);
        }
      } catch (err) {
        // Phase 3 failure is non-fatal — return cached analysis without it
        console.error('Phase 3 (prompt improvements) failed:', err);
      }
    }

    const response: SessionAnalysisResponse = {
      structural: cachedStructural,
      interpretive: cachedInterpretive,
      ...(promptImprovements ? { promptImprovements } : {}),
    };
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Phase 1: Structural extraction
  let structural: StructuralAnalysis;
  if (cachedStructural) {
    structural = cachedStructural;
  } else {
    try {
      const prompt = buildPhase1Prompt(stack, sessionPrompt);
      const result = await genAI.models.generateContent({
        model: PHASE1_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      structural = JSON.parse(result.text || '{}') as StructuralAnalysis;
      structural.generatedAt = new Date().toISOString();
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: `Phase 1 failed: ${err.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // Phase 2 + Phase 3 in parallel
  const runPhase2 = async (): Promise<InterpretiveAnalysis> => {
    const prompt = await buildPhase2Prompt(structural, body.tone, sessionPrompt);
    const result = await genAI.models.generateContent({
      model: phase2Model,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const interpretive = JSON.parse(result.text || '{}') as InterpretiveAnalysis;
    interpretive.tone = body.tone;
    interpretive.model = phase2Model;
    interpretive.generatedAt = new Date().toISOString();
    return interpretive;
  };

  const runPhase3 = async (): Promise<PromptImprovements | null> => {
    // Skip if no prompt or already cached for this model
    if (!sessionPrompt) return null;
    if (cachedPromptImprovements) return cachedPromptImprovements;
    const prompt = buildPhase3Prompt(sessionPrompt, structural);
    const result = await genAI.models.generateContent({
      model: phase2Model,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const pi = JSON.parse(result.text || '{}') as PromptImprovements;
    pi.model = phase2Model;
    pi.generatedAt = new Date().toISOString();
    return pi;
  };

  let interpretive: InterpretiveAnalysis;
  let promptImprovements: PromptImprovements | null = null;
  try {
    [interpretive, promptImprovements] = await Promise.all([runPhase2(), runPhase3()]);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Analysis failed: ${err.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Persist analysis cache on stack
  if (!stack.analysis) stack.analysis = {};
  stack.analysis.structural = structural;
  if (!stack.analysis.interpretive) stack.analysis.interpretive = {};
  stack.analysis.interpretive[vKey] = interpretive;
  if (promptImprovements) {
    if (!stack.analysis.promptImprovements) stack.analysis.promptImprovements = {};
    stack.analysis.promptImprovements[phase2Model] = promptImprovements;
  }

  try {
    await fs.writeFile(
      path.join(STACKS_DIR, `${body.stackId}.json`),
      JSON.stringify(stack, null, 2),
    );
  } catch (err) {
    console.error('Failed to persist analysis cache:', err);
  }

  const response: SessionAnalysisResponse = {
    structural,
    interpretive,
    ...(promptImprovements ? { promptImprovements } : {}),
  };
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
};
