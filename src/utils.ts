import { CanvasRenderingContext2D } from '@napi-rs/canvas';

// Helper to wrap text
export function calculateWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Helper to truncate middle
export function truncateMiddle(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const ellipsis = '...';
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return text.substring(0, frontChars) + ellipsis + text.substring(text.length - backChars);
}

// utils.ts

export interface TextSegment {
  text: string;
  isCode: boolean;
  width?: number; // Calculated during wrapping
}


/**
 * Splits string by backticks into normal and code segments.
 * e.g., "foo `bar` baz" -> [{text:"foo ", isCode:false}, {text:"bar", isCode:true}, {text:" baz", isCode:false}]
 */
export function parseMarkdownSegments(text: string): TextSegment[] {
  // Split by backtick.
  // Even indices are normal text, Odd indices are code.
  const rawSegments = text.split('`');
  const segments: TextSegment[] = [];

  rawSegments.forEach((segmentText, index) => {
    if (segmentText.length === 0) return; // Skip empty splits

    segments.push({
      text: segmentText,
      isCode: index % 2 !== 0 // Odd index means it was inside backticks
    });
  });

  return segments;
}


/**
 * Advanced wrapper that handles mixed-style segments AND long-word breaking.
 */
export function calculateWrappedSegments(
  ctx: any,
  segments: TextSegment[],
  maxWidth: number,
  normalFont: string,
  codeFont: string
): TextSegment[][] {
  const lines: TextSegment[][] = [];
  let currentLine: TextSegment[] = [];
  let currentLineWidth = 0;

  for (const segment of segments) {
    // 1. Set font for measurement
    ctx.font = segment.isCode ? codeFont : normalFont;

    // 2. Measure the raw text
    const padding = segment.isCode ? 8 : 0; // 4px padding on each side for code
    const segmentWidth = ctx.measureText(segment.text).width + padding;

    // 3. Logic for Code Blocks vs Normal Text
    if (segment.isCode) {
      // CASE A: Code block fits on current line
      if (currentLineWidth + segmentWidth <= maxWidth) {
        currentLine.push({ ...segment, width: segmentWidth });
        currentLineWidth += segmentWidth;
      }
      // CASE B: Code block is huge (wider than maxWidth) -> Force Break
      else if (segmentWidth > maxWidth) {
        // 1. Flush current line if it has content
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
        }

        // 2. Break the long string into chunks
        const chars = segment.text.split('');
        let chunk = '';

        for (const char of chars) {
          const testChunk = chunk + char;
          const testWidth = ctx.measureText(testChunk).width + padding;

          if (testWidth > maxWidth) {
            // Flush chunk to line
            lines.push([{ text: chunk, isCode: true, width: ctx.measureText(chunk).width + padding }]);
            chunk = char; // Start new chunk
          } else {
            chunk = testChunk;
          }
        }
        // Add final chunk
        if (chunk.length > 0) {
          const width = ctx.measureText(chunk).width + padding;
          currentLine.push({ text: chunk, isCode: true, width });
          currentLineWidth += width;
        }
      }
      // CASE C: Code block fits on NEXT line
      else {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;

        currentLine.push({ ...segment, width: segmentWidth });
        currentLineWidth += segmentWidth;
      }
    } else {
      // Normal Text Logic (Word Wrapping)
      // This handles the "orphaned period" issue by keeping punctuation with the preceding word if possible
      // or wrapping correctly.

      const words = segment.text.split(/(\s+)/); // Split keeping delimiters to preserve spaces

      for (const word of words) {
        if (word.length === 0) continue;

        const wordWidth = ctx.measureText(word).width;

        if (currentLineWidth + wordWidth <= maxWidth) {
          currentLine.push({ text: word, isCode: false, width: wordWidth });
          currentLineWidth += wordWidth;
        } else {
          // Start new line
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;

          // If a single word is massive (unlikely in normal text, but possible), clip it
          // For now, assume normal words fit on a line.
          currentLine.push({ text: word, isCode: false, width: wordWidth });
          currentLineWidth += wordWidth;
        }
      }
    }
  }

  // Flush remaining
  if (currentLine.length > 0) lines.push(currentLine);

  return lines;
}
