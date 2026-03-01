/**
 * Splits text into paragraph-sized chunks (~2 sentences each) for
 * ReactMarkdown paragraph rendering. Shields backtick content so
 * periods inside filenames don't break sentence detection.
 */
export function addParagraphBreaks(text: string): string {
  const placeholders: string[] = [];
  const shielded = text.replace(/`[^`]+`/g, (match) => {
    placeholders.push(match);
    return `\x00${placeholders.length - 1}\x00`;
  });

  const sentences = shielded.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!sentences) return text;

  const cleaned = sentences.map(s => s.trim()).filter(Boolean);
  const groups: string[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    groups.push(cleaned.slice(i, i + 2).join(' '));
  }

  const restored = groups.map(g =>
    g.replace(/\x00(\d+)\x00/g, (_, idx) => placeholders[parseInt(idx)])
  );

  return restored.join('\n\n');
}

/**
 * Post-processes code review LLM output to ensure proper markdown list formatting.
 * - Converts inline `* ` bullets to `\n- `
 * - Ensures `**Bold:**` section headers have blank line before them
 * - Idempotent — properly formatted markdown passes through unchanged
 */
export function fixMarkdownLists(text: string): string {
  let result = text;

  // 1. Shield backtick code spans → placeholders
  const codePlaceholders: string[] = [];
  result = result.replace(/`[^`]+`/g, (match) => {
    codePlaceholders.push(match);
    return `\x01C${codePlaceholders.length - 1}\x01`;
  });

  // 2. Shield bold markers (**...**) → placeholders
  const boldPlaceholders: string[] = [];
  result = result.replace(/\*\*[^*]+\*\*/g, (match) => {
    boldPlaceholders.push(match);
    return `\x01B${boldPlaceholders.length - 1}\x01`;
  });

  // 3. Every remaining `* ` is a bullet → convert to `\n- `
  result = result.replace(/\s*\*\s+/g, '\n- ');

  // 4. Restore bold placeholders
  result = result.replace(/\x01B(\d+)\x01/g, (_, idx) => boldPlaceholders[parseInt(idx)]);

  // 5. Ensure bold section headers get blank line before them (except at start)
  result = result.replace(/([^\n])\n(\*\*[A-Za-z])/g, '$1\n\n$2');
  // Ensure bullets after headers have no extra blank lines
  result = result.replace(/(\*\*[^*]+\*\*)\n{3,}/g, '$1\n');

  // 6. Restore code placeholders
  result = result.replace(/\x01C(\d+)\x01/g, (_, idx) => codePlaceholders[parseInt(idx)]);

  return result.trim();
}

import type { ReactNode } from 'react';

export function renderTextWithCode(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-[#2a2a35] px-1 py-0.5 rounded text-[12px] font-mono text-[#c0c0d0]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
