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
  CodeRefMap,
} from '../../lib/session-analysis';

/** Returns true only when codeRefs has at least one entry with a valid startLine. */
function hasValidCodeRefs(codeRefs?: CodeRefMap): boolean {
  if (!codeRefs) return false;
  return Object.values(codeRefs).some(
    refs => refs?.some(r => typeof r.startLine === 'number'),
  );
}

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
  },
  "codeRefs": {
    "patterns:0": [{ "file": "src/api.ts", "startLine": 42, "endLine": 45 }],
    "riskFactors:0": [{ "file": "src/queue.ts", "startLine": 15, "endLine": 22 }]
  }
}

RULES:
1. Group activities by distinct INTENT — what the agent was trying to accomplish. Not by file or chronology.
2. Every activity index must appear in exactly one intent.
3. Reference actual file paths and function names.
4. Keep strings concise (1-3 sentences).
5. Limit to 2-7 intents. Merge trivially related activities.
6. decisionPoints and corrections may be empty if none observed.

CODE REFERENCES (REQUIRED):
The "codeRefs" object is MANDATORY. For EVERY item in patterns, riskFactors, architecturalImpact, and gaps, you MUST add an entry to "codeRefs". Extract the file path and line numbers from the \`@@\` hunk headers in the Diff sections above. For example, if you see \`@@ -10,5 +10,8 @@\` and the relevant added lines start at line 12 and end at line 15, use startLine: 12, endLine: 15. The key format is "sectionName:index" — e.g. "patterns:0" for the first pattern, "riskFactors:1" for the second risk factor. If a finding references multiple files, include multiple objects in the array. If no diff was provided for a finding's file, omit that entry only. Do NOT return an empty codeRefs object.`;
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

${skillContext ? `Your expertise:\n${skillContext}\n` : ''}
Interpret the following structural analysis through your expert lens. Write in your voice, apply your expertise.

Session Goal: ${sessionPrompt || 'Not provided'}

Structural Analysis:
${JSON.stringify(structural, null, 2)}

Return JSON:
{
  "narrative": "First sentence is the lead — punchy, specific, 1 sentence only.\\n\\nSecond paragraph elaborates (2-3 sentences).\\n\\nOptional third paragraph. MUST use literal \\n\\n between paragraphs.",
  "intentDescriptions": [
    { "intentIndex": 0, "title": "Concise 3-6 word title", "description": "1 sentence, reference key files in backticks" }
  ],
  "riskAssessments": ["**Concurrency Threshold**: Misconfiguring the \`p-limit\` cap could shift the bottleneck rather than eliminate it."],
  "keyInsights": ["**Bounded Parallelism**: The shift from \`Promise.all\` to \`p-limit\` prevents I/O saturation under load."],
  "verdict": "One-sentence overall assessment",
  "nextSteps": ["**Load Test Limits**: Benchmark \`ServeView.tsx\` with varying concurrency caps to find the optimal threshold."],
  "codeRefs": {
    "riskAssessments:0": [{ "file": "src/api.ts", "startLine": 42, "endLine": 45 }],
    "keyInsights:0": [{ "file": "src/queue.ts", "startLine": 15, "endLine": 22 }]
  }
}

RULES:
1. Write in your persona voice throughout.
2. Wrap ALL file paths, function names, and code references in backticks.
3. Every intentDescription must reference a valid intentIndex from the structural analysis.
4. keyInsights should reflect your UNIQUE expertise, not generic observations.
5. MANDATORY FORMAT for EVERY item in riskAssessments, keyInsights, and nextSteps: Start with "**2-4 Word Label**: " (bold markdown, then colon+space) followed by the explanation. Items missing the **bold label** prefix are INVALID. See the examples above.
6. Keep intentDescription titles concise and scannable (3-6 words).
7. The narrative field MUST contain literal \\n\\n (two newlines) to separate paragraphs. Do NOT return a single unbroken block.

CODE REFERENCES (REQUIRED):
The "codeRefs" object is MANDATORY. For EVERY item in riskAssessments, keyInsights, and nextSteps that relates to specific code, include a codeRefs entry. Use the file paths and line numbers from the structural analysis (look at the "codeRefs" and "intents.files" fields). Key format: "sectionName:index" — e.g. "riskAssessments:0", "keyInsights:1", "nextSteps:0". If the structural analysis includes codeRefs, propagate the relevant ones to your interpretive findings. Do NOT return an empty codeRefs object.`;
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

  const phase2Model = body.model || DEFAULT_PHASE2_MODEL;
  const vKey = versionKey(body.tone, phase2Model);

  // Check cache — only reuse if codeRefs are valid (non-empty, with startLine)
  const rawStructural = stack.analysis?.structural || body.structuralAnalysis;
  const cachedStructural = hasValidCodeRefs(rawStructural?.codeRefs) ? rawStructural : undefined;
  const rawInterpretive = stack.analysis?.interpretive?.[vKey];
  const cachedInterpretive = hasValidCodeRefs(rawInterpretive?.codeRefs) ? rawInterpretive : undefined;

  if (cachedStructural && cachedInterpretive) {
    return new Response(
      JSON.stringify({ structural: cachedStructural, interpretive: cachedInterpretive }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const genAI = new GoogleGenAI({ apiKey });

  // Phase 1: Structural extraction
  let structural: StructuralAnalysis;
  if (cachedStructural) {
    structural = cachedStructural;
  } else {
    try {
      const prompt = buildPhase1Prompt(stack, body.sessionPrompt);
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

  // Phase 2: Interpretive analysis
  let interpretive: InterpretiveAnalysis;
  try {
    const prompt = await buildPhase2Prompt(structural, body.tone, body.sessionPrompt);
    const result = await genAI.models.generateContent({
      model: phase2Model,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    interpretive = JSON.parse(result.text || '{}') as InterpretiveAnalysis;
    interpretive.tone = body.tone;
    interpretive.model = phase2Model;
    interpretive.generatedAt = new Date().toISOString();
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Phase 2 failed: ${err.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Persist analysis cache on stack
  if (!stack.analysis) stack.analysis = {};
  stack.analysis.structural = structural;
  if (!stack.analysis.interpretive) stack.analysis.interpretive = {};
  stack.analysis.interpretive[vKey] = interpretive;

  try {
    await fs.writeFile(
      path.join(STACKS_DIR, `${body.stackId}.json`),
      JSON.stringify(stack, null, 2),
    );
  } catch (err) {
    console.error('Failed to persist analysis cache:', err);
  }

  const response: SessionAnalysisResponse = { structural, interpretive };
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  });
};
