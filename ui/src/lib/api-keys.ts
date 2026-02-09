import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.JULES_INK_ROOT || path.resolve(__dirname, '../../../');
const ENV_PATH = path.join(ROOT_DIR, '.env');

export async function readEnv(): Promise<Map<string, string>> {
  const entries = new Map<string, string>();
  try {
    const content = await fs.readFile(ENV_PATH, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      entries.set(trimmed.slice(0, eqIdx), trimmed.slice(eqIdx + 1));
    }
  } catch {
    // .env doesn't exist yet
  }
  return entries;
}

export async function writeEnv(entries: Map<string, string>): Promise<void> {
  const lines = Array.from(entries.entries()).map(([k, v]) => `${k}=${v}`);
  await fs.writeFile(ENV_PATH, lines.join('\n') + '\n');
}

export async function checkKeysConfigured(): Promise<boolean> {
  const env = await readEnv();
  return (
    Boolean(env.get('GEMINI_API_KEY')?.trim()) &&
    Boolean(env.get('JULES_API_KEY')?.trim())
  );
}
