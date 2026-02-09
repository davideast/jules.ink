import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTones, saveTone, deleteTone } from '../../src/tones';
import fs from 'fs/promises';
import path from 'path';

const JULES_DIR = path.join(process.cwd(), '.jules');
const TONES_FILE = path.join(JULES_DIR, 'tones.json');

describe('tones', () => {
  beforeEach(async () => {
    // Clean up before each test
    try {
      await fs.rm(TONES_FILE);
    } catch {}
    try {
        await fs.rmdir(JULES_DIR);
    } catch {}
  });

  afterEach(async () => {
    // Clean up after each test
    try {
        await fs.rm(TONES_FILE);
    } catch {}
    try {
        await fs.rmdir(JULES_DIR);
    } catch {}
  });

  it('should load empty tones initially', async () => {
    const tones = await loadTones();
    expect(tones).toEqual([]);
  });

  it('should save and load a tone', async () => {
    const tone = { name: 'Test Tone', instructions: 'Test instructions' };
    await saveTone(tone);
    const tones = await loadTones();
    expect(tones).toHaveLength(1);
    expect(tones[0]).toEqual(tone);
  });

  it('should update an existing tone', async () => {
    const tone1 = { name: 'Test Tone', instructions: 'Original instructions' };
    await saveTone(tone1);

    const tone2 = { name: 'Test Tone', instructions: 'Updated instructions' };
    await saveTone(tone2);

    const tones = await loadTones();
    expect(tones).toHaveLength(1);
    expect(tones[0]).toEqual(tone2);
  });

  it('should delete a tone', async () => {
    const tone1 = { name: 'Tone 1', instructions: 'Instructions 1' };
    const tone2 = { name: 'Tone 2', instructions: 'Instructions 2' };
    await saveTone(tone1);
    await saveTone(tone2);

    await deleteTone('Tone 1');
    const tones = await loadTones();
    expect(tones).toHaveLength(1);
    expect(tones[0]).toEqual(tone2);
  });
});
