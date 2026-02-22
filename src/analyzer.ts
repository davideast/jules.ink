import parseDiff from 'parse-diff';
import micromatch from 'micromatch';
import { encode } from 'gpt-tokenizer';
import { ChangeSetSummary, FileImpact } from './types.js';

// 1. Define the same Ignore Patterns used in your Summarizer
const IGNORE_PATTERNS = [
  '**/package-lock.json',
  '**/yarn.lock',
  '**/*.map',
  '**/dist/**',
  '**/*.min.js',
  '**/.DS_Store',
  '**/*.d.ts'
];

const TOKEN_LIMIT_PER_FILE = 2000;
const MAX_TOTAL_TOKENS = 6000;

// Pre-compile the matcher to avoid redundant work in the loop
const isIgnored = (path: string) => micromatch.isMatch(path, IGNORE_PATTERNS);

/**
 * Transforms a raw Unidiff string into structured stats,
 * filtering out noise to match the Summarizer's logic.
 */
export function analyzeChangeSet(unidiffPatch: string): ChangeSetSummary {

  // parse-diff handles the heavy lifting
  const parsedFiles = parseDiff(unidiffPatch);

  const files: FileImpact[] = [];
  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const file of parsedFiles) {
    // Prioritize 'to' path (new file), fallback to 'from' (deleted file)
    const path = file.to || file.from || 'unknown';

    // 2. APPLY FILTER LOGIC (Match simplifyActivity)
    // If it's a lockfile or noise, skip it completely. 
    // We don't want these taking up space on the physical label.
    if (isIgnored(path)) {
      continue;
    }

    // Handle binary files or renames where stats might be ambiguous
    const additions = file.additions || 0;
    const deletions = file.deletions || 0;

    totalInsertions += additions;
    totalDeletions += deletions;

    // 3. REMOVED GRAPH LOGIC
    // We no longer calculate block chars. We just pass the raw stats.
    files.push({
      path,
      additions,
      deletions,
      totalChanges: additions + deletions
    });
  }

  // Sort files by "impact" (most changes first) so the label shows the important stuff
  files.sort((a, b) => b.totalChanges - a.totalChanges);

  return {
    files,
    totalFiles: files.length,
    totalInsertions,
    totalDeletions,
    // Updated summary string to match the new numeric style
    summaryString: `${files.length} files | +${totalInsertions} / -${totalDeletions}`
  };
}

export interface ContextAnalysisFile {
  file: string;
  status: 'included' | 'truncated_budget_exceeded' | 'truncated_large_file' | 'ignored_artifact';
  changes?: string;
  diff?: string;
  summary?: string;
  affectedMethods?: string[];
  affectedScopes?: string[];
}

export function analyzeContextForPrompt(rawDiff: string): ContextAnalysisFile[] {
  const files = parseDiff(rawDiff);
  let currentTokenCount = 0;
  return files.map(file => {
    const filePath = file.to || file.from || 'unknown';
    if (isIgnored(filePath)) {
      return { file: filePath, status: 'ignored_artifact', changes: `+${file.additions}/-${file.deletions}` };
    }
    const fileDiffString = file.chunks.map(c =>
      [c.content, ...c.changes.map(change => change.content)].join('\n')
    ).join('\n');
    const fileTokens = encode(fileDiffString).length;

    if (currentTokenCount + fileTokens > MAX_TOTAL_TOKENS) {
      return { file: filePath, status: 'truncated_budget_exceeded', summary: `Modified ${file.additions} lines`, affectedMethods: extractHunkHeaders(file.chunks) };
    }
    if (fileTokens > TOKEN_LIMIT_PER_FILE) {
      return { file: filePath, status: 'truncated_large_file', summary: `Large refactor (+${file.additions}/-${file.deletions})`, affectedScopes: extractHunkHeaders(file.chunks) };
    }
    currentTokenCount += fileTokens;
    return { file: filePath, status: 'included', diff: fileDiffString };
  });
}

export function extractHunkHeaders(chunks: any[]): string[] {
  return chunks.map(chunk => {
    const headerMatch = chunk.content.match(/@@.*?@@\s*(.*)/);
    return headerMatch ? headerMatch[1].trim() : null;
  }).filter(Boolean).slice(0, 5);
}
