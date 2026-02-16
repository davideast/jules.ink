import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { readEnv } from '../../lib/api-keys';
import type { PrintStack } from '../../lib/print-stack';
import type { CodeRef } from '../../lib/session-analysis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.JULES_INK_ROOT || path.resolve(__dirname, '../../../../');
const STACKS_DIR = path.join(ROOT_DIR, '.jules', 'stacks');

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

/** Extracts the raw diff text for a single file from a multi-file unidiff patch. */
function extractRawFileDiff(unidiffPatch: string, filePath: string): string {
  const sections = unidiffPatch.split(/^(?=diff --git )/m);
  const match = sections.find(s => s.includes(filePath));
  return match?.trim() || '';
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { stackId, filePath, findingText, sectionKey, index, model } = body as {
    stackId: string;
    filePath: string;
    findingText: string;
    sectionKey: string;
    index: number;
    model?: string;
  };

  if (!stackId || !filePath || !findingText || !sectionKey || index === undefined) {
    return new Response(
      JSON.stringify({ error: 'stackId, filePath, findingText, sectionKey, and index are required' }),
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
  const stackPath = path.join(STACKS_DIR, `${stackId}.json`);
  try {
    const content = await fs.readFile(stackPath, 'utf-8');
    stack = JSON.parse(content);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Stack not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Find the first activity that has this file and a unidiffPatch
  const activity = stack.activities.find(a =>
    a.unidiffPatch && (
      a.files.some(f => f.path === filePath) ||
      a.unidiffPatch.includes(filePath)
    ),
  );

  if (!activity?.unidiffPatch) {
    return new Response(
      JSON.stringify({ startLine: 0, endLine: 0, patch: '' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Extract file-specific diff — used for both cache hits and LLM calls
  const fileSpecificDiff = extractRawFileDiff(activity.unidiffPatch, filePath);
  if (!fileSpecificDiff) {
    return new Response(
      JSON.stringify({ startLine: 0, endLine: 0, patch: '' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Check resolved cache — return with patch so client can render immediately
  const cacheKey = `${sectionKey}:${index}:${filePath}`;
  const cached = stack.analysis?.resolvedCodeRefs?.[cacheKey];
  if (cached) {
    return new Response(
      JSON.stringify({ startLine: cached.startLine, endLine: cached.endLine, patch: activity.unidiffPatch }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const resolveModel = model || DEFAULT_MODEL;
  const genAI = new GoogleGenAI({ apiKey });

  const prompt = `You are a code reference resolver. Given a finding about code changes and a unified diff for a specific file, identify the exact NEW-file line range the finding describes.

FINDING:
"${findingText}"

FILE: ${filePath}
DIFF:
${fileSpecificDiff}

Return JSON: { "startLine": <number>, "endLine": <number> }

RULES:
1. Line numbers refer to the NEW version of the file (+ lines and context lines).
2. Pick the tightest range that captures what the finding describes.
3. If the finding doesn't clearly map to code in this diff, return { "startLine": 0, "endLine": 0 }.`;

  let startLine = 0;
  let endLine = 0;
  try {
    const result = await genAI.models.generateContent({
      model: resolveModel,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const parsed = JSON.parse(result.text || '{}');
    startLine = typeof parsed.startLine === 'number' ? parsed.startLine : 0;
    endLine = typeof parsed.endLine === 'number' ? parsed.endLine : 0;
  } catch (err) {
    console.error('[resolve-code-ref] LLM call failed:', err);
    return new Response(
      JSON.stringify({ startLine: 0, endLine: 0, patch: '' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Cache the result on the stack
  const ref: CodeRef = { file: filePath, startLine, endLine };
  if (!stack.analysis) stack.analysis = {};
  if (!stack.analysis.resolvedCodeRefs) stack.analysis.resolvedCodeRefs = {};
  stack.analysis.resolvedCodeRefs[cacheKey] = ref;

  try {
    await fs.writeFile(stackPath, JSON.stringify(stack, null, 2));
  } catch (err) {
    console.error('[resolve-code-ref] Failed to persist cache:', err);
  }

  return new Response(
    JSON.stringify({ startLine, endLine, patch: activity.unidiffPatch }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
