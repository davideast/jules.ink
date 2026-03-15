import { describe, it, expect } from 'vitest';
import {
  formatRulesForPrompt,
  resolvePersona,
  resolvePersonaByName,
  EXPERT_PERSONAS
} from '../../src/expert-personas';
import { type SkillRule } from '../../src/skill-loader';

describe('expert-personas', () => {
  describe('formatRulesForPrompt', () => {
    it('should return an empty string for an empty rules array', () => {
      expect(formatRulesForPrompt([])).toBe('');
    });

    it('should format a single rule correctly', () => {
      const rules: SkillRule[] = [
        {
          title: 'Test Rule',
          impact: 'HIGH',
          impactDescription: 'Description',
          tags: ['test'],
          explanation: 'This is a test rule.'
        }
      ];
      expect(formatRulesForPrompt(rules)).toBe('- Test Rule [HIGH]: This is a test rule.');
    });

    it('should format multiple rules correctly joined by newlines', () => {
      const rules: SkillRule[] = [
        {
          title: 'Rule 1',
          impact: 'CRITICAL',
          impactDescription: 'Desc 1',
          tags: ['tag1'],
          explanation: 'Expl 1'
        },
        {
          title: 'Rule 2',
          impact: 'LOW',
          impactDescription: 'Desc 2',
          tags: ['tag2'],
          explanation: 'Expl 2'
        }
      ];
      const expected = '- Rule 1 [CRITICAL]: Expl 1\n- Rule 2 [LOW]: Expl 2';
      expect(formatRulesForPrompt(rules)).toBe(expected);
    });
  });

  describe('resolvePersona', () => {
    it('should resolve a persona by ID', () => {
      const persona = resolvePersona('react-perf');
      expect(persona).toBeDefined();
      expect(persona?.id).toBe('react-perf');
      expect(persona?.name).toBe('React Perf Expert');
    });

    it('should return undefined for a non-existent ID', () => {
      const persona = resolvePersona('non-existent');
      expect(persona).toBeUndefined();
    });
  });

  describe('resolvePersonaByName', () => {
    it('should resolve a persona by name', () => {
      const persona = resolvePersonaByName('React Perf Expert');
      expect(persona).toBeDefined();
      expect(persona?.name).toBe('React Perf Expert');
    });

    it('should be case-insensitive when resolving by name', () => {
      const persona = resolvePersonaByName('react perf expert');
      expect(persona).toBeDefined();
      expect(persona?.name).toBe('React Perf Expert');
    });

    it('should return undefined for a non-existent name', () => {
      const persona = resolvePersonaByName('Non Existent Name');
      expect(persona).toBeUndefined();
    });
  });

  describe('EXPERT_PERSONAS', () => {
    it('should have at least one persona defined', () => {
      expect(EXPERT_PERSONAS.length).toBeGreaterThan(0);
    });

    it('should have required fields for each persona', () => {
      EXPERT_PERSONAS.forEach(p => {
        expect(p.id).toBeDefined();
        expect(p.name).toBeDefined();
        expect(p.role).toBeDefined();
      });
    });
  });
});
