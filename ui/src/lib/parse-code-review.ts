/**
 * Parses structured sections from a code review markdown string.
 * Extracts Patterns, Trade-offs, Risks, and Highlights bullets.
 */
export interface ParsedReview {
  patterns: string[];
  tradeoffs: string[];
  risks: string[];
  highlights: string[];
}

export interface AggregatedAnalysis {
  patterns: string[];
  highlights: string[];
  risks: string[];
  nextSteps: string[];
}

function extractBullets(text: string, header: string): string[] {
  const regex = new RegExp(
    `\\*\\*${header}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\*\\*[A-Z]|$)`,
    'i',
  );
  const match = text.match(regex);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-*•]/.test(l))
    .map(l => l.replace(/^[-*•]\s*/, ''));
}

export function parseCodeReview(text: string): ParsedReview {
  return {
    patterns: extractBullets(text, 'Patterns'),
    tradeoffs: extractBullets(text, 'Trade-offs'),
    risks: extractBullets(text, 'Risks'),
    highlights: extractBullets(text, 'Highlights'),
  };
}

/**
 * Aggregates parsed reviews from multiple activities into
 * session-level analysis sections.
 */
export function aggregateReviews(reviews: ParsedReview[]): AggregatedAnalysis {
  const allPatterns: string[] = [];
  const allHighlights: string[] = [];
  const allRisks: string[] = [];
  const allTradeoffs: string[] = [];

  for (const r of reviews) {
    allPatterns.push(...r.patterns);
    allHighlights.push(...r.highlights);
    allRisks.push(...r.risks);
    allTradeoffs.push(...r.tradeoffs);
  }

  // Deduplicate patterns — extract short keyword phrases, then fuzzy-dedup
  const rawKeywords = allPatterns
    .map(p => {
      const match = p.match(/^(?:Introduces?|Implements?|Uses?|Applies?|Switched?|Added?|Introduced?)?\s*(.+?)(?:\s+(?:in|for|within|to|using|across|before|and)\s)/i);
      return match ? match[1].trim() : p.split(/[.,;]/)[0].trim();
    })
    .filter(p => p.length > 0 && p.length < 50);
  // Fuzzy dedup: skip patterns whose lowercase form is a substring of one already kept
  const patternKeywords: string[] = [];
  const seenPatternLower: string[] = [];
  for (const kw of rawKeywords) {
    const lower = kw.toLowerCase().replace(/`/g, '');
    if (seenPatternLower.some(s => s.includes(lower) || lower.includes(s))) continue;
    seenPatternLower.push(lower);
    patternKeywords.push(kw);
    if (patternKeywords.length >= 6) break;
  }

  // Top highlights (limit to 4, deduplicated)
  const seenHighlights = new Set<string>();
  const highlights = allHighlights.filter(h => {
    const key = h.slice(0, 50).toLowerCase();
    if (seenHighlights.has(key)) return false;
    seenHighlights.add(key);
    return true;
  }).slice(0, 4);

  // Risks — fuzzy dedup by significant words, limit to 4
  const seenRiskKeys = new Set<string>();
  const risks = allRisks.filter(r => {
    // Extract key words (3+ chars, no stop words) for dedup
    const words = r.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const key = words.slice(0, 5).sort().join(' ');
    if (seenRiskKeys.has(key)) return false;
    seenRiskKeys.add(key);
    return true;
  }).slice(0, 4);

  // Next steps: reframe trade-offs as action items
  const nextSteps = allTradeoffs
    .slice(0, 4)
    .map(t => {
      // If it already starts with an action verb, keep it
      if (/^(Consider|Add|Refactor|Replace|Move|Extract|Update)/i.test(t)) return t;
      // Otherwise prefix with "Consider:"
      return `Consider: ${t}`;
    });

  return { patterns: patternKeywords, highlights, risks, nextSteps };
}
