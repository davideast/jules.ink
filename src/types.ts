/**
 * Represents the statistical impact of changes on a specific file.
 */
export interface FileImpact {
  path: string;
  additions: number;
  deletions: number;
  totalChanges: number;
}

/**
 * A comprehensive report of a Git Patch / ChangeSet.
 */
export interface ChangeSetSummary {
  files: FileImpact[];
  totalFiles: number;
  totalInsertions: number;
  totalDeletions: number;
  /**
   * Formatted string suitable for footer display.
   * e.g., "3 files changed, 48 insertions(+), 14 deletions(-)"
   */
  summaryString: string;
}
