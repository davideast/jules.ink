/**
 * Page Load Benchmark
 *
 * Measures TTFB, FCP, LCP, DOM Content Loaded, and full load time
 * for the session page. Runs N iterations and reports stats.
 *
 * Usage:
 *   npx tsx benchmarks/page-load.ts                         # defaults
 *   npx tsx benchmarks/page-load.ts --session <id>          # specific session
 *   npx tsx benchmarks/page-load.ts --runs 10               # more iterations
 *   npx tsx benchmarks/page-load.ts --base-url http://...   # custom server
 *   npx tsx benchmarks/page-load.ts --json                  # machine-readable output
 *   npx tsx benchmarks/page-load.ts --save                  # append to benchmarks/results.jsonl
 */

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// --- CLI args ---
const args = process.argv.slice(2);
function flag(name: string): boolean {
  return args.includes(`--${name}`);
}
function opt(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const SESSION_ID = opt('session', '');
const RUNS = parseInt(opt('runs', '5'), 10);
const BASE_URL = opt('base-url', 'http://localhost:4321');
const JSON_OUTPUT = flag('json');
const SAVE = flag('save');

interface RunMetrics {
  run: number;
  ttfb: number;
  fcp: number;
  lcp: number;
  domContentLoaded: number;
  loaded: number;
  domInteractive: number;
}

interface Summary {
  url: string;
  runs: number;
  timestamp: string;
  gitBranch: string;
  gitSha: string;
  metrics: {
    ttfb: Stats;
    fcp: Stats;
    lcp: Stats;
    domContentLoaded: Stats;
    loaded: Stats;
    domInteractive: Stats;
  };
  raw: RunMetrics[];
}

interface Stats {
  min: number;
  max: number;
  median: number;
  p95: number;
  mean: number;
}

function computeStats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    min: sorted[0],
    max: sorted[n - 1],
    median: sorted[Math.floor(n / 2)],
    p95: sorted[Math.floor(n * 0.95)],
    mean: Math.round(sorted.reduce((s, v) => s + v, 0) / n),
  };
}

async function resolveSessionId(): Promise<string> {
  if (SESSION_ID) return SESSION_ID;

  // Auto-detect from local stacks
  const stacksDir = path.join(process.cwd(), '.jules', 'stacks');
  try {
    const files = fs.readdirSync(stacksDir).filter(f => f.endsWith('.json'));
    let best: { id: string; count: number } = { id: '', count: 0 };
    for (const f of files) {
      const stack = JSON.parse(fs.readFileSync(path.join(stacksDir, f), 'utf-8'));
      const count = stack.activities?.length ?? 0;
      if (count > best.count) {
        best = { id: stack.sessionId, count };
      }
    }
    if (best.id) return best.id;
  } catch {}

  console.error('No session ID provided and none found in .jules/stacks/');
  console.error('Usage: npx tsx benchmarks/page-load.ts --session <id>');
  process.exit(1);
}

function getGitInfo(): { branch: string; sha: string } {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    return { branch, sha };
  } catch {
    return { branch: 'unknown', sha: 'unknown' };
  }
}

async function measureRun(url: string, run: number): Promise<RunMetrics> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect LCP via PerformanceObserver
  await page.addInitScript(() => {
    (window as any).__lcp = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        (window as any).__lcp = entries[entries.length - 1].startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // Extract Navigation Timing
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');

    return {
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      fcp: Math.round(fcpEntry?.startTime ?? 0),
      lcp: Math.round((window as any).__lcp ?? 0),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loaded: Math.round(nav.loadEventEnd - nav.startTime),
      domInteractive: Math.round(nav.domInteractive - nav.startTime),
    };
  });

  await browser.close();

  return { run, ...timing };
}

async function main() {
  const sessionId = await resolveSessionId();
  const url = `${BASE_URL}/session?id=${sessionId}`;
  const git = getGitInfo();

  if (!JSON_OUTPUT) {
    console.log(`\nBenchmark: ${url}`);
    console.log(`Branch: ${git.branch} (${git.sha})`);
    console.log(`Runs: ${RUNS}\n`);
  }

  const results: RunMetrics[] = [];

  for (let i = 0; i < RUNS; i++) {
    if (!JSON_OUTPUT) {
      process.stdout.write(`  Run ${i + 1}/${RUNS}...`);
    }
    const metrics = await measureRun(url, i + 1);
    results.push(metrics);
    if (!JSON_OUTPUT) {
      console.log(` TTFB=${metrics.ttfb}ms  FCP=${metrics.fcp}ms  LCP=${metrics.lcp}ms  Load=${metrics.loaded}ms`);
    }
  }

  const summary: Summary = {
    url,
    runs: RUNS,
    timestamp: new Date().toISOString(),
    gitBranch: git.branch,
    gitSha: git.sha,
    metrics: {
      ttfb: computeStats(results.map(r => r.ttfb)),
      fcp: computeStats(results.map(r => r.fcp)),
      lcp: computeStats(results.map(r => r.lcp)),
      domContentLoaded: computeStats(results.map(r => r.domContentLoaded)),
      loaded: computeStats(results.map(r => r.loaded)),
      domInteractive: computeStats(results.map(r => r.domInteractive)),
    },
    raw: results,
  };

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log('\n--- Results ---\n');
    console.log(formatTable(summary.metrics));

    if (SAVE) {
      const outPath = path.join(process.cwd(), 'benchmarks', 'results.jsonl');
      fs.appendFileSync(outPath, JSON.stringify(summary) + '\n');
      console.log(`\nSaved to ${outPath}`);
    }
  }

  if (SAVE && JSON_OUTPUT) {
    const outPath = path.join(process.cwd(), 'benchmarks', 'results.jsonl');
    fs.appendFileSync(outPath, JSON.stringify(summary) + '\n');
  }
}

function formatTable(metrics: Summary['metrics']): string {
  const keys = Object.keys(metrics) as (keyof typeof metrics)[];
  const header = padRight('Metric', 20) + padRight('Min', 10) + padRight('Median', 10) + padRight('Mean', 10) + padRight('P95', 10) + padRight('Max', 10);
  const divider = '-'.repeat(header.length);

  const rows = keys.map(key => {
    const s = metrics[key];
    return (
      padRight(key, 20) +
      padRight(`${s.min}ms`, 10) +
      padRight(`${s.median}ms`, 10) +
      padRight(`${s.mean}ms`, 10) +
      padRight(`${s.p95}ms`, 10) +
      padRight(`${s.max}ms`, 10)
    );
  });

  return [header, divider, ...rows].join('\n');
}

function padRight(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
