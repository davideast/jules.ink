export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export function extractFileDiff(unidiffPatch: string, filePath: string): DiffLine[] {
  const sections = unidiffPatch.split(/^diff --git /m);
  const matchingSection = sections.find(s => s.includes(filePath));
  if (!matchingSection) return [];

  const lines = matchingSection.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Hunk header: @@ -old,count +new,count @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1]);
      newLine = parseInt(hunkMatch[2]);
      result.push({ type: 'header', content: line });
      continue;
    }

    // Skip diff metadata lines (---, +++, index, etc.)
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file') || line.startsWith('similarity') || line.startsWith('rename') || line.startsWith('a/') || line.startsWith('b/')) {
      continue;
    }

    if (line.startsWith('+')) {
      result.push({ type: 'add', content: line.slice(1), newLineNumber: newLine });
      newLine++;
    } else if (line.startsWith('-')) {
      result.push({ type: 'remove', content: line.slice(1), oldLineNumber: oldLine });
      oldLine++;
    } else if (line.startsWith(' ')) {
      result.push({ type: 'context', content: line.slice(1), oldLineNumber: oldLine, newLineNumber: newLine });
      oldLine++;
      newLine++;
    }
    // Skip empty lines and other metadata
  }

  return result;
}

/**
 * Extracts diff lines within a specific line range from a unidiff patch.
 * Falls back to the first 12 lines of the full file diff if the range is empty (hallucinated lines).
 */
export function extractLineRange(
  unidiffPatch: string,
  filePath: string,
  startLine: number,
  endLine: number,
  contextLines = 1,
): DiffLine[] {
  const allLines = extractFileDiff(unidiffPatch, filePath);
  const filtered = allLines.filter(line => {
    const lineNum = line.newLineNumber ?? line.oldLineNumber;
    if (!lineNum) return line.type === 'header';
    return lineNum >= startLine - contextLines && lineNum <= endLine + contextLines;
  });

  // Fallback: if range returned nothing useful (hallucinated lines), show first 12 lines
  const hasContent = filtered.some(l => l.type !== 'header');
  if (!hasContent && allLines.length > 0) {
    return allLines.slice(0, 12);
  }

  return filtered;
}
