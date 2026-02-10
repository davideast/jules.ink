import { type SkillRule } from './skill-loader.js';

export interface ExpertPersona {
  /** Lowercase key used in versionKey() and API calls. */
  id: string;
  /** Display label for the UI pill. */
  name: string;
  /** Prompt ROLE line injected into summarizer prompts. */
  role: string;
  /** Optional personality overlay (for fun personas like Grumpy JS Cat). */
  personality?: string;
  /** Installed skill directory name under .agents/skills/. */
  skillRef?: string;
  /** Filter rules by these tags (rule included if ANY tag matches). */
  focusTags?: string[];
  /** Max rules to include in prompt context (default 8). */
  maxRules?: number;
}

export const EXPERT_PERSONAS: ExpertPersona[] = [
  {
    id: 'react-perf',
    name: 'React Perf Expert',
    role: 'You are a React Performance Expert from Vercel Engineering.',
    skillRef: 'vercel-react-best-practices',
    focusTags: ['rerender', 'rendering', 'bundle', 'async'],
    maxRules: 8,
  },
  {
    id: 'npm-packaging',
    name: 'npm Packaging Expert',
    role: 'You are an npm packaging and bundle optimization expert.',
    skillRef: 'vercel-react-best-practices',
    focusTags: ['bundle', 'imports'],
    maxRules: 6,
  },
  {
    id: 'typescript-enforcer',
    name: 'TypeScript Enforcer',
    role: 'You are a strict TypeScript enforcer who demands type safety, correct generics, and precise type narrowing.',
  },
  {
    id: 'gof-analyst',
    name: 'GoF Pattern Analyst',
    role: 'You are a Gang of Four design patterns analyst who evaluates code through the lens of classic OOP patterns — Factory, Observer, Strategy, Decorator, and others.',
  },
  {
    id: 'grumpy-js-cat',
    name: 'Grumpy JS Cat',
    role: 'You are a senior JavaScript code reviewer.',
    personality: 'Write as a grumpy, sarcastic cat who is annoyed by bad JavaScript but grudgingly acknowledges good patterns. Use cat metaphors sparingly. Be funny but still technically precise.',
    skillRef: 'vercel-react-best-practices',
    focusTags: ['js', 'performance'],
    maxRules: 5,
  },
];

/** Look up a persona by its ID. */
export function resolvePersona(id: string): ExpertPersona | undefined {
  return EXPERT_PERSONAS.find(p => p.id === id);
}

/** Look up a persona by its display name (case-insensitive). */
export function resolvePersonaByName(name: string): ExpertPersona | undefined {
  const lower = name.toLowerCase();
  return EXPERT_PERSONAS.find(p => p.name.toLowerCase() === lower);
}

/** Format loaded skill rules into a compact prompt block. */
export function formatRulesForPrompt(rules: SkillRule[]): string {
  if (rules.length === 0) return '';
  return rules
    .map(r => `- ${r.title} [${r.impact}]: ${r.explanation}`)
    .join('\n');
}
