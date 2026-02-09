import { describe, it, expect } from 'vitest';
import { parseMarkdownSegments } from '../../src/utils.js';

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
