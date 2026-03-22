import { describe, it, expect } from 'vitest';
import { resolvePersona, resolvePersonaByName, formatRulesForPrompt, EXPERT_PERSONAS } from '../../src/expert-personas';
import type { SkillRule } from '../../src/skill-loader';

describe('expert-personas', () => {
  describe('resolvePersona', () => {
    it('should resolve an existing persona by id', () => {
      const persona = resolvePersona('react-perf');
      expect(persona).toBeDefined();
      expect(persona?.id).toBe('react-perf');
      expect(persona?.name).toBe('React Perf Expert');
    });

    it('should return undefined for a non-existent id', () => {
      const persona = resolvePersona('non-existent-id');
      expect(persona).toBeUndefined();
    });

    it('should be case-sensitive for id', () => {
      const persona = resolvePersona('React-Perf');
      expect(persona).toBeUndefined();
    });
  });

  describe('resolvePersonaByName', () => {
    it('should resolve an existing persona by exact name', () => {
      const persona = resolvePersonaByName('React Perf Expert');
      expect(persona).toBeDefined();
      expect(persona?.id).toBe('react-perf');
    });

    it('should resolve an existing persona by name case-insensitively', () => {
      const persona = resolvePersonaByName('rEaCt pErF eXpErT');
      expect(persona).toBeDefined();
      expect(persona?.id).toBe('react-perf');
    });

    it('should return undefined for a non-existent name', () => {
      const persona = resolvePersonaByName('Unknown Expert');
      expect(persona).toBeUndefined();
    });
  });

  describe('formatRulesForPrompt', () => {
    it('should format a list of rules correctly', () => {
      const rules: SkillRule[] = [
        {
          title: 'Rule 1',
          impact: 'high',
          explanation: 'Explanation for rule 1',
          description: 'Desc 1',
          tags: [],
        },
        {
          title: 'Rule 2',
          impact: 'medium',
          explanation: 'Explanation for rule 2',
          description: 'Desc 2',
          tags: [],
        },
      ];

      const formatted = formatRulesForPrompt(rules);
      expect(formatted).toBe('- Rule 1 [high]: Explanation for rule 1\n- Rule 2 [medium]: Explanation for rule 2');
    });

    it('should return an empty string when given an empty array', () => {
      const formatted = formatRulesForPrompt([]);
      expect(formatted).toBe('');
    });
  });
});
