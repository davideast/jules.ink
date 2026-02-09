import { describe, it, expect, afterAll } from 'vitest';
import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

const API_PORT = 13000;
const UI_PORT = 14321;

describe('jules-ink ui', () => {
  const CLI = path.resolve('./src/cli.ts');
  const TSX = path.resolve('./node_modules/.bin/tsx');
  let proc: ChildProcess;

  afterAll(async () => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
      await sleep(2000);
      if (!proc.killed) proc.kill('SIGKILL');
    }
  });

  it('starts the API and Astro dev servers', async () => {
    proc = spawn(TSX, [CLI, 'ui', '--api-port', String(API_PORT), '--ui-port', String(UI_PORT)], {
      stdio: 'pipe',
    });

    let output = '';
    proc.stdout?.on('data', (d) => { output += d.toString(); });
    proc.stderr?.on('data', (d) => { output += d.toString(); });
    proc.on('exit', (code) => { output += `\n[process exited with code ${code}]`; });

    const [apiReady, uiReady] = await Promise.all([
      poll(`http://localhost:${API_PORT}`),
      poll(`http://localhost:${UI_PORT}`),
    ]);
    if (!apiReady || !uiReady) console.log('Process output:\n', output);
    expect(apiReady, 'API server did not start').toBe(true);
    expect(uiReady, 'Astro dev server did not start').toBe(true);

    // API server handles requests
    const api = await fetch(`http://localhost:${API_PORT}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test' }),
    });
    expect(api.status).toBeDefined();

    // Astro dev server serves the app
    const ui = await fetch(`http://localhost:${UI_PORT}/`);
    expect(ui.ok).toBe(true);
    expect(await ui.text()).toContain('<html');
  }, 60_000);
});

async function poll(url: string, timeout = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { await fetch(url); return true; } catch { /* not ready */ }
    await sleep(500);
  }
  return false;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
