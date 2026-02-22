import { describe, it, expect } from 'vitest';
import { addParagraphBreaks, fixMarkdownLists } from '../../ui/src/lib/markdown-utils';

describe('markdown-utils', () => {
  describe('addParagraphBreaks', () => {
    it('should split text into paragraphs every two sentences', () => {
      const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
      const result = addParagraphBreaks(text);
      expect(result).toBe('Sentence one. Sentence two.\n\nSentence three. Sentence four.');
    });

    it('should shield backticks', () => {
      const text = 'Check `file.ts`. It works. Next sentence.';
      const result = addParagraphBreaks(text);
      expect(result).toBe('Check `file.ts`. It works.\n\nNext sentence.');
    });
  });

  describe('fixMarkdownLists', () => {
    it('should convert * bullets to -', () => {
      const text = '* Item 1\n* Item 2';
      const result = fixMarkdownLists(text);
      expect(result).toBe('- Item 1\n- Item 2');
    });

    it('should add blank lines before bold headers', () => {
      const text = 'Intro\n**Header:**\nContent';
      const result = fixMarkdownLists(text);
      expect(result).toBe('Intro\n\n**Header:**\nContent');
    });
  });
});
