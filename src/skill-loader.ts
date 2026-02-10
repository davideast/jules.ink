import fs from 'fs/promises';
import path from 'path';

export interface SkillRule {
  title: string;
  impact: string;
  impactDescription: string;
  tags: string[];
  explanation: string;
}

const IMPACT_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/** Parse YAML frontmatter from a markdown file's raw text. */
function parseFrontmatter(raw: string): Record<string, string> | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    result[key] = value;
  }
  return result;
}

/** Extract the first sentence after the frontmatter heading. */
function extractFirstSentence(raw: string): string {
  // Skip frontmatter
  const afterFrontmatter = raw.replace(/^---[\s\S]*?---\s*/, '');
  // Skip the markdown heading (## Title)
  const afterHeading = afterFrontmatter.replace(/^##[^\n]*\n\s*/, '');
  // Grab the first sentence (up to period, or first 200 chars)
  const match = afterHeading.match(/^(.+?\.)\s/);
  if (match) return match[1].trim();
  // Fallback: first line
  const firstLine = afterHeading.split('\n')[0]?.trim() || '';
  return firstLine.slice(0, 200);
}

export interface LoadSkillRulesOptions {
  tags?: string[];
  maxRules?: number;
  skillsDir?: string;
}

export async function loadSkillRules(
  skillRef: string,
  opts: LoadSkillRulesOptions = {},
): Promise<SkillRule[]> {
  const skillsDir = opts.skillsDir || path.join(process.cwd(), '.agents', 'skills');
  const rulesDir = path.join(skillsDir, skillRef, 'rules');

  let entries: string[];
  try {
    entries = await fs.readdir(rulesDir);
  } catch {
    return [];
  }

  const mdFiles = entries.filter(f => f.endsWith('.md'));
  const rules: SkillRule[] = [];

  for (const file of mdFiles) {
    try {
      const raw = await fs.readFile(path.join(rulesDir, file), 'utf-8');
      const fm = parseFrontmatter(raw);
      if (!fm?.title || !fm?.impact) continue;

      const tags = (fm.tags || '')
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      // Filter by tags if specified
      if (opts.tags && opts.tags.length > 0) {
        const hasMatch = opts.tags.some(t => tags.includes(t.toLowerCase()));
        if (!hasMatch) continue;
      }

      rules.push({
        title: fm.title,
        impact: fm.impact,
        impactDescription: fm.impactDescription || '',
        tags,
        explanation: extractFirstSentence(raw),
      });
    } catch {
      // Skip unreadable files
    }
  }

  // Sort by impact priority
  rules.sort((a, b) => {
    const aOrder = IMPACT_ORDER[a.impact] ?? 99;
    const bOrder = IMPACT_ORDER[b.impact] ?? 99;
    return aOrder - bOrder;
  });

  // Cap results
  const max = opts.maxRules ?? 8;
  return rules.slice(0, max);
}
