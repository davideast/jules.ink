import { describe, it, expect } from 'vitest';
import { generateLabel } from '../src/label-generator.js';
import fs from 'fs';
import path from 'path';

describe('Label Generator', () => {
  it('generates a label using the template.png asset', async () => {
    // Mock Data
    const data = {
      repo: 'davideast/modjules',
      sessionId: 'sess_999888777',
      summary: 'Proposed a plan to update API, Client, and Session files to handle handshake intents.',
      files: [
        { path: 'src/api/handlers.ts', graph: '██████░░░░' },
        { path: 'src/client/session.ts', graph: '███░░░░░░░' },
        { path: 'package.json', graph: '█░░░░░░░░░' }
      ]
    };

    // Ensure assets exist before running
    if (!fs.existsSync(path.resolve('./assets/template.png'))) {
      console.warn("⚠️ SKIPPING TEST: assets/template.png not found.");
      return;
    }

    try {
      const buffer = await generateLabel(data);
      expect(buffer).toBeDefined();

      // Save artifact
      const outPath = 'test-results/final_label.png';
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      console.log(`✅ Label saved to ${outPath}`);
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
});
