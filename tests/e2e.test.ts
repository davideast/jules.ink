import { describe, it, expect } from 'vitest';
import { processSessionAndPrint } from '../src/pipeline.js';
import fs from 'fs';
import path from 'path';

const TEST_SESSION_ID = process.env.JULES_SESSION_ID;
const runE2E = (process.env.GEMINI_API_KEY && process.env.JULES_API_KEY && TEST_SESSION_ID) ? describe : describe.skip;

runE2E('E2E Pipeline', () => {

  it('runs the full loop and generates labeled images', async () => {
    // 1. Run the pipeline
    await processSessionAndPrint(TEST_SESSION_ID);

    // 2. Verify Output
    const outDir = path.resolve('output', TEST_SESSION_ID);
    const files = fs.readdirSync(outDir);

    // We expect some images to be generated
    expect(files.length).toBeGreaterThan(0);
    expect(files.some(f => f.endsWith('.png'))).toBe(true);

    console.log(`Generated ${files.length} labels in ${outDir}`);
  }, 30000); // Higher timeout for AI calls
});
