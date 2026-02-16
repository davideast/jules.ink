import parseDiff from 'parse-diff';
import micromatch from 'micromatch';
import { ChangeSetSummary, FileImpact } from './types.js';

// 1. Define the same Ignore Patterns used in your Summarizer
const IGNORE_PATTERNS = [
  '**/package-lock.json',
  '**/yarn.lock',
  '**/*.map',
  '**/dist/**',
  '**/*.min.js',
  '**/.DS_Store'
];

// Pre-compile the matcher to avoid redundant work in the loop
const isIgnored = micromatch.matcher(IGNORE_PATTERNS);

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
