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
