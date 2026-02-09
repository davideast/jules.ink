import fs from 'fs/promises';
import path from 'path';

export interface Tone {
  name: string;
  instructions: string;
}

const JULES_DIR = path.join(process.cwd(), '.jules');
const TONES_FILE = path.join(JULES_DIR, 'tones.json');

async function ensureJulesDir() {
  try {
    await fs.mkdir(JULES_DIR, { recursive: true });
  } catch (err) {
    if ((err as any).code !== 'EEXIST') {
      throw err;
    }
  }
}

export async function loadTones(): Promise<Tone[]> {
  try {
    const data = await fs.readFile(TONES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if ((err as any).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

export async function saveTone(tone: Tone): Promise<Tone[]> {
  await ensureJulesDir();
  const tones = await loadTones();

  const existingIndex = tones.findIndex(t => t.name === tone.name);
  if (existingIndex >= 0) {
    tones[existingIndex] = tone;
  } else {
    tones.push(tone);
  }

  await fs.writeFile(TONES_FILE, JSON.stringify(tones, null, 2));
  return tones;
}

export async function deleteTone(name: string): Promise<Tone[]> {
  await ensureJulesDir();
  const tones = await loadTones();
  const newTones = tones.filter(t => t.name !== name);

  await fs.writeFile(TONES_FILE, JSON.stringify(newTones, null, 2));
  return newTones;
}
