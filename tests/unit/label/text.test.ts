import { describe, it, expect, vi } from 'vitest';
import { parseMarkdownSegments, calculateWrappedLines, truncateMiddle } from '../../../src/label/text.js';

describe('truncateMiddle', () => {
  it('should return original text if shorter than maxLength', () => {
    expect(truncateMiddle('hello', 10)).toBe('hello');
  });

  it('should return original text if equal to maxLength', () => {
    expect(truncateMiddle('hello', 5)).toBe('hello');
  });

  it('should truncate text and insert ellipsis for even charsToShow', () => {
    // length = 10, maxLength = 7
    // ellipsis = '...', charsToShow = 4
    // frontChars = 2, backChars = 2
    expect(truncateMiddle('abcdefghij', 7)).toBe('ab...ij');
  });

  it('should truncate text and insert ellipsis for odd charsToShow', () => {
    // length = 10, maxLength = 8
    // ellipsis = '...', charsToShow = 5
    // frontChars = 3, backChars = 2
    expect(truncateMiddle('abcdefghij', 8)).toBe('abc...ij');
  });

  it('should handle empty string correctly', () => {
    expect(truncateMiddle('', 5)).toBe('');
  });

  it('should handle maxLength less than ellipsis length', () => {
    // current implementation: charsToShow = -1 (for maxLength = 2)
    // frontChars = 0, backChars = -1
    // text.substring(0, 0) + '...' + text.substring(text.length + 1)
    // evaluates to '' + '...' + '' = '...'
    expect(truncateMiddle('hello', 2)).toBe('...');
    expect(truncateMiddle('hello', 0)).toBe('...');
  });

  it('should handle exactly one character removal (maxLength = text.length - 1)', () => {
    // length = 6, maxLength = 5
    // ellipsis = '...', charsToShow = 2
    // frontChars = 1, backChars = 1
    // 'a...f' (length 5)
    expect(truncateMiddle('abcdef', 5)).toBe('a...f');
  });
});

describe('parseMarkdownSegments', () => {
  it('should handle plain text without backticks', () => {
    const text = 'Hello world';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([
      { text: 'Hello world', isCode: false }
    ]);
  });

  it('should handle text with a single backtick pair', () => {
    const text = 'Hello `world`';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([
      { text: 'Hello ', isCode: false },
      { text: 'world', isCode: true }
    ]);
  });

  it('should handle text starting with backticks', () => {
    const text = '`Hello` world';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([
      { text: 'Hello', isCode: true },
      { text: ' world', isCode: false }
    ]);
  });

  it('should handle text ending with backticks', () => {
    const text = 'Hello `world`';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([
      { text: 'Hello ', isCode: false },
      { text: 'world', isCode: true }
    ]);
  });

  it('should handle multiple backtick pairs', () => {
    const text = '`a` b `c`';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([
      { text: 'a', isCode: true },
      { text: ' b ', isCode: false },
      { text: 'c', isCode: true }
    ]);
  });

  it('should handle unclosed backticks', () => {
    const text = 'Hello `world';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([
      { text: 'Hello ', isCode: false },
      { text: 'world', isCode: true }
    ]);
  });

  it('should handle empty strings', () => {
    const text = '';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([]);
  });

  it('should handle consecutive backticks (empty segments)', () => {
    // `` -> ["", "", ""] -> skips empty -> []
    expect(parseMarkdownSegments('``')).toEqual([]);

    // ``foo`` -> ["", "", "foo", "", ""] -> skips empty -> [{text: "foo", isCode: false}]
    expect(parseMarkdownSegments('``foo``')).toEqual([
      { text: 'foo', isCode: false }
    ]);
  });

  it('should handle only backticks and spaces', () => {
    const text = '` `';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([
      { text: ' ', isCode: true }
    ]);
  });

  it('should handle mixed content', () => {
    const text = 'This `is` a `test` with `multiple` segments';
    const result = parseMarkdownSegments(text);
    expect(result).toEqual([
      { text: 'This ', isCode: false },
      { text: 'is', isCode: true },
      { text: ' a ', isCode: false },
      { text: 'test', isCode: true },
      { text: ' with ', isCode: false },
      { text: 'multiple', isCode: true },
      { text: ' segments', isCode: false }
    ]);
  });
});

describe('calculateWrappedLines', () => {
  const mockCtx = {
    measureText: vi.fn()
  } as any;

  it('should return a single line if it fits', () => {
    mockCtx.measureText.mockImplementation((text: string) => ({ width: text.length * 10 }));
    const result = calculateWrappedLines(mockCtx, 'hello world', 200);
    expect(result).toEqual(['hello world']);
  });

  it('should wrap text that exceeds maxWidth', () => {
    mockCtx.measureText.mockImplementation((text: string) => ({ width: text.length * 10 }));
    // "hello world" is 110px. 110 < 60 is false.
    const result = calculateWrappedLines(mockCtx, 'hello world', 60);
    expect(result).toEqual(['hello', 'world']);
  });

  it('should not wrap if it fits perfectly', () => {
    mockCtx.measureText.mockImplementation((text: string) => ({ width: text.length * 10 }));
    // "a b" is 30px. maxWidth 30px.
    // 30 <= 30 is true. It should not wrap.
    const result = calculateWrappedLines(mockCtx, 'a b', 30);
    expect(result).toEqual(['a b']);
  });

  it('should handle empty string', () => {
    const result = calculateWrappedLines(mockCtx, '', 100);
    expect(result).toEqual(['']);
  });

  it('should handle single word', () => {
    mockCtx.measureText.mockImplementation((text: string) => ({ width: text.length * 10 }));
    const result = calculateWrappedLines(mockCtx, 'hello', 10);
    expect(result).toEqual(['hello']);
  });

  it('should handle long words exceeding maxWidth', () => {
    mockCtx.measureText.mockImplementation((text: string) => ({ width: text.length * 10 }));
    const result = calculateWrappedLines(mockCtx, 'superlongword', 50);
    expect(result).toEqual(['superlongword']);
  });

  it('should wrap multiple lines', () => {
    mockCtx.measureText.mockImplementation((text: string) => ({ width: text.length * 10 }));
    const result = calculateWrappedLines(mockCtx, 'one two three', 40);
    expect(result).toEqual(['one', 'two', 'three']);
  });
});
