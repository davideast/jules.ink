import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSkillRules } from '../../src/skill-loader';
import fs from 'fs/promises';
import path from 'path';

vi.mock('fs/promises', () => {
  const readdir = vi.fn();
  const readFile = vi.fn();
  return {
    default: { readdir, readFile },
    readdir,
    readFile,
  };
});

describe('skill-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadSkillRules', () => {
    it('returns an empty array if the skills directory does not exist or readdir throws', async () => {
      vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      const result = await loadSkillRules('my-skill');

      expect(result).toEqual([]);
      expect(fs.readdir).toHaveBeenCalledTimes(1);
    });

    it('returns an empty array if no markdown files are found', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['not-markdown.txt', 'image.png'] as any);

      const result = await loadSkillRules('my-skill');

      expect(result).toEqual([]);
      expect(fs.readdir).toHaveBeenCalledTimes(1);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('skips unreadable files without throwing', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['readable.md', 'unreadable.md'] as any);

      const validMd = `---
title: Valid Rule
impact: LOW
---
## Valid Rule
This is a valid rule explanation.`;

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        if (filePath.toString().includes('unreadable.md')) {
          throw new Error('EACCES: permission denied');
        }
        return validMd;
      });

      const result = await loadSkillRules('my-skill');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Valid Rule');
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it('skips markdown files missing required frontmatter (title or impact)', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['no-title.md', 'no-impact.md', 'no-frontmatter.md'] as any);

      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        const fileStr = filePath.toString();
        if (fileStr.includes('no-title.md')) {
          return `---\nimpact: HIGH\n---\n## Rule\nExplanation.`;
        }
        if (fileStr.includes('no-impact.md')) {
          return `---\ntitle: Some Rule\n---\n## Rule\nExplanation.`;
        }
        return `## Rule\nNo frontmatter here.`;
      });

      const result = await loadSkillRules('my-skill');

      expect(result).toEqual([]);
    });

    it('parses valid markdown and extracts properties correctly', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['rule1.md'] as any);

      const mdContent = `---
title: My Awesome Rule
impact: CRITICAL
impactDescription: This is very important
tags: react, TypeScript, PERFORMANCE
---
## My Awesome Rule
This is the first sentence. This is the second sentence.`;

      vi.mocked(fs.readFile).mockResolvedValueOnce(mdContent);

      const result = await loadSkillRules('my-skill');

      expect(result).toEqual([
        {
          title: 'My Awesome Rule',
          impact: 'CRITICAL',
          impactDescription: 'This is very important',
          tags: ['react', 'typescript', 'performance'],
          explanation: 'This is the first sentence.',
        }
      ]);
    });

    it('handles missing tags and impactDescription gracefully', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['rule1.md'] as any);

      const mdContent = `---
title: Minimal Rule
impact: LOW
---
## Minimal Rule
First sentence.`;

      vi.mocked(fs.readFile).mockResolvedValueOnce(mdContent);

      const result = await loadSkillRules('my-skill');

      expect(result).toEqual([
        {
          title: 'Minimal Rule',
          impact: 'LOW',
          impactDescription: '',
          tags: [],
          explanation: 'First sentence.',
        }
      ]);
    });

    it('sorts rules by impact priority (CRITICAL, HIGH, MEDIUM, LOW, unknown)', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['low.md', 'high.md', 'critical.md', 'medium.md', 'unknown.md'] as any);

      const files: Record<string, string> = {
        'low.md': `---\ntitle: Low\nimpact: LOW\n---\n## H\nS.`,
        'high.md': `---\ntitle: High\nimpact: HIGH\n---\n## H\nS.`,
        'critical.md': `---\ntitle: Critical\nimpact: CRITICAL\n---\n## H\nS.`,
        'medium.md': `---\ntitle: Medium\nimpact: MEDIUM\n---\n## H\nS.`,
        'unknown.md': `---\ntitle: Unknown\nimpact: UNKNOWN\n---\n## H\nS.`,
      };

      vi.mocked(fs.readFile).mockImplementation(async (fp) => {
        const name = path.basename(fp.toString());
        return files[name];
      });

      const result = await loadSkillRules('my-skill');

      expect(result.map(r => r.impact)).toEqual([
        'CRITICAL',
        'HIGH',
        'MEDIUM',
        'LOW',
        'UNKNOWN'
      ]);
    });

    it('caps results to maxRules option or default 8', async () => {
      const mockFiles = Array.from({ length: 10 }, (_, i) => `rule${i}.md`);
      vi.mocked(fs.readdir).mockResolvedValueOnce(mockFiles as any);

      vi.mocked(fs.readFile).mockImplementation(async () => {
        return `---\ntitle: A Rule\nimpact: LOW\n---\n## H\nS.`;
      });

      // Default max is 8
      const resultDefault = await loadSkillRules('my-skill');
      expect(resultDefault).toHaveLength(8);

      // Reset mocks to test custom max
      vi.mocked(fs.readdir).mockResolvedValueOnce(mockFiles as any);

      const resultCustom = await loadSkillRules('my-skill', { maxRules: 3 });
      expect(resultCustom).toHaveLength(3);
    });

    it('filters by tags case-insensitively', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce(['rule1.md', 'rule2.md', 'rule3.md'] as any);

      const files: Record<string, string> = {
        'rule1.md': `---\ntitle: Rule 1\nimpact: LOW\ntags: backend, security\n---\n## H\nS.`,
        'rule2.md': `---\ntitle: Rule 2\nimpact: LOW\ntags: FRONTEND, UI\n---\n## H\nS.`,
        'rule3.md': `---\ntitle: Rule 3\nimpact: LOW\ntags: ui, security\n---\n## H\nS.`,
      };

      vi.mocked(fs.readFile).mockImplementation(async (fp) => {
        const name = path.basename(fp.toString());
        return files[name];
      });

      // Should match rule2 and rule3
      const result = await loadSkillRules('my-skill', { tags: ['ui'] });
      expect(result.map(r => r.title)).toEqual(['Rule 2', 'Rule 3']);

      // Reset mocks
      vi.mocked(fs.readdir).mockResolvedValueOnce(['rule1.md', 'rule2.md', 'rule3.md'] as any);

      // Should match rule1 and rule3
      const result2 = await loadSkillRules('my-skill', { tags: ['Security'] });
      expect(result2.map(r => r.title)).toEqual(['Rule 1', 'Rule 3']);

      // Reset mocks
      vi.mocked(fs.readdir).mockResolvedValueOnce(['rule1.md', 'rule2.md', 'rule3.md'] as any);

      // Should match none
      const result3 = await loadSkillRules('my-skill', { tags: ['database'] });
      expect(result3).toEqual([]);
    });

    it('uses custom skillsDir if provided', async () => {
      vi.mocked(fs.readdir).mockResolvedValueOnce([]);

      await loadSkillRules('my-skill', { skillsDir: '/custom/skills/dir' });

      expect(fs.readdir).toHaveBeenCalledWith(path.join('/custom/skills/dir', 'my-skill', 'rules'));
    });
  });
});
