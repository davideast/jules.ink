import { describe, it, expect } from 'vitest';
import { streamSession } from '../src/session-stream.js';
import { generateLabel, type LabelData } from '../src/label/renderer.js';
import fs from 'fs';
import path from 'path';

const TEST_SESSION_ID = process.env.JULES_SESSION_ID;
// Only run if credentials exist
const runE2E = (process.env.GEMINI_API_KEY && process.env.JULES_API_KEY && TEST_SESSION_ID) ? describe : describe.skip;

runE2E('E2E Pipeline', () => {

  it('runs the full loop and generates labeled images', async () => {
    if (!TEST_SESSION_ID) throw new Error("TEST_SESSION_ID is undefined");

    const outDir = path.resolve('output', TEST_SESSION_ID);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    let repo = 'unknown/repo';
    let count = 0;

    // Iterate over the stream
    for await (const event of streamSession(TEST_SESSION_ID)) {
      if (event.type === 'session:info') {
        repo = event.repo;
      } else if (event.type === 'activity:processed') {
        // Generate Label Image
        const labelData: LabelData = {
          repo,
          sessionId: TEST_SESSION_ID,
          summary: event.summary,
          files: event.files
        };

        const buffer = await generateLabel(labelData);

        // Save to Disk
        const filename = `${count.toString().padStart(3, '0')}_${event.activityType}.png`;
        const filePath = path.join(outDir, filename);
        fs.writeFileSync(filePath, buffer);

        count++;
      } else if (event.type === 'session:error') {
         console.error(`Session Error: ${event.error}`);
         throw new Error(event.error);
      }
    }

    // 2. Verify Output
    const files = fs.readdirSync(outDir);

    // We expect some images to be generated
    expect(files.length).toBeGreaterThan(0);
    expect(files.some(f => f.endsWith('.png'))).toBe(true);

    console.log(`Generated ${files.length} labels in ${outDir}`);
  }, 60000); // Higher timeout for AI calls
});
