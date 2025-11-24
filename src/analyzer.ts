import parseDiff from 'parse-diff';
import { ChangeSetSummary, FileImpact } from './types.js';

export const BLOCK_FULL = '█';
export const BLOCK_LIGHT = '░';

interface AnalyzerOptions {
  maxGraphWidth?: number;
}

/**
 * Transforms a raw Unidiff string into a structured ChangeSetSummary.
 */
export function analyzeChangeSet(unidiffPatch: string, options: AnalyzerOptions = {}): ChangeSetSummary {
  const { maxGraphWidth = 10 } = options;

  // parse-diff handles the heavy lifting of parsing the git format
  const parsedFiles = parseDiff(unidiffPatch);

  const files: FileImpact[] = [];
  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const file of parsedFiles) {
    // Handle binary files or renames where stats might be ambiguous
    const additions = file.additions || 0;
    const deletions = file.deletions || 0;
    const totalChanges = additions + deletions;

    // Prioritize 'to' path (new file), fallback to 'from' (deleted file)
    const path = file.to || file.from || 'unknown';

    totalInsertions += additions;
    totalDeletions += deletions;

    // Calculate Visual Graph
    let graph = '';
    if (totalChanges > 0) {
      // If total changes are less than width, show exact representation
      // Otherwise, normalize to max width
      const graphLen = Math.min(totalChanges, maxGraphWidth);

      const addRatio = additions / totalChanges;
      const addChars = Math.round(graphLen * addRatio);
      const delChars = graphLen - addChars;

      graph = BLOCK_FULL.repeat(addChars) + BLOCK_LIGHT.repeat(delChars);
    }

    files.push({
      path,
      additions,
      deletions,
      totalChanges,
      graph
    });
  }

  return {
    files,
    totalFiles: files.length,
    totalInsertions,
    totalDeletions,
    summaryString: `${files.length} files changed, ${totalInsertions} insertions(+), ${totalDeletions} deletions(-)`
  };
}
