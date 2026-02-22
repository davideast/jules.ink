// Library barrel export — the public API of jules-ink

export { streamSession } from './session-stream.js';
export type { SessionEvent, SessionStreamOptions } from './session-stream.js';

export { SessionSummarizer } from './summarizer.js';
export type { SummarizerConfig, TonePreset } from './summarizer.js';

export { analyzeChangeSet } from './analyzer.js';
export type { FileImpact, ChangeSetSummary } from './types.js';

export { generateLabel } from './label/renderer.js';
export type { LabelData, FileStat } from './label/renderer.js';

export { default as thermal } from './print.js';
export type { device, config } from './print.js';

export { TONE_PRESETS } from './tone-presets.js';
export { EXPERT_PERSONAS, resolvePersona, resolvePersonaByName } from './expert-personas.js';
export type { ExpertPersona } from './expert-personas.js';
export { loadSkillRules } from './skill-loader.js';
export type { SkillRule } from './skill-loader.js';
export { loadTones, saveTone, deleteTone } from './tones.js';
export type { Tone } from './tones.js';
