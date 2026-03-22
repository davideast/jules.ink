import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSkillRules } from '../../src/skill-loader.js';
import fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => {
  return {
    default: {
      readdir: vi.fn(),
      readFile: vi.fn(),
    },
  };
});

describe('loadSkillRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an empty array if fs.readdir throws an error', async () => {
    // Simulate fs.readdir failing (e.g. directory doesn't exist)
    vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

    const result = await loadSkillRules('non-existent-skill');

    expect(result).toEqual([]);
    expect(fs.readdir).toHaveBeenCalledTimes(1);
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('should skip unreadable markdown files but process the rest', async () => {
    // Simulate fs.readdir returning two markdown files
    // The code expects strings, not objects (like dirents)
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      'good.md',
      'bad.md',
    ] as any);

    // First file succeeds, second file fails
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('---\ntitle: Good Rule\nimpact: HIGH\n---\nThis is a good rule.')
      .mockRejectedValueOnce(new Error('EACCES: permission denied'));

    const result = await loadSkillRules('mixed-skill');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Good Rule');

    expect(fs.readdir).toHaveBeenCalledTimes(1);
    expect(fs.readFile).toHaveBeenCalledTimes(2);
  });

  it('should correctly load, parse, and sort skill rules', async () => {
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      'rule1.md',
      'rule2.md',
      'rule3.md',
      'not-a-rule.txt',
    ] as any);

    // Mock file contents
    vi.mocked(fs.readFile).mockImplementation((filepath) => {
      const pathStr = filepath as string;
      if (pathStr.endsWith('rule1.md')) {
        return Promise.resolve(
          '---\ntitle: Low Impact Rule\nimpact: LOW\ntags: test, example\n---\n## Ignore this\nThis is a low impact rule explanation.'
        );
      }
      if (pathStr.endsWith('rule2.md')) {
        return Promise.resolve(
          '---\ntitle: Critical Impact Rule\nimpact: CRITICAL\n---\nFirst sentence of critical rule. Second sentence.'
        );
      }
      if (pathStr.endsWith('rule3.md')) {
        // Missing impact
        return Promise.resolve(
          '---\ntitle: Invalid Rule\n---\nThis rule has no impact.'
        );
      }
      return Promise.reject(new Error('File not found'));
    });

    const result = await loadSkillRules('valid-skill');

    // Should only have 2 rules, sorted by impact (CRITICAL first, then LOW)
    expect(result).toHaveLength(2);

    expect(result[0].title).toBe('Critical Impact Rule');
    expect(result[0].impact).toBe('CRITICAL');
    expect(result[0].explanation).toBe('First sentence of critical rule.');

    expect(result[1].title).toBe('Low Impact Rule');
    expect(result[1].impact).toBe('LOW');
    expect(result[1].tags).toEqual(['test', 'example']);
    expect(result[1].explanation).toBe('This is a low impact rule explanation.');
  });
});
