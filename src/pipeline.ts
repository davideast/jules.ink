import { jules } from 'modjules';
import { SessionSummarizer } from './summarizer.js';
import { analyzeChangeSet } from './analyzer.js'; // From previous plan
import { generateLabel } from './label-generator.js'; // From previous plan
import fs from 'fs';
import path from 'path';

export async function* processSessionAndPrint(sessionId: string) {
  const summarizer = new SessionSummarizer();
  let rollingSummary = "";

  const session = jules.session(sessionId);

  // Output directory for E2E artifacts
  const outDir = path.resolve('output', sessionId);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let count = 0;

  for await (const activity of session.stream()) {
    console.log(`Processing Activity ${count + 1}: ${activity.type}`);

    // 1. Generate Rolling Summary
    rollingSummary = await summarizer.generateRollingSummary(rollingSummary, activity);
    console.log(`> Summary: ${rollingSummary}`);

    // 2. Extract Stats (if applicable)
    // We pass the diff if it exists, otherwise empty stats
    let stats: any = { files: [] };
    const changeSet = activity.artifacts?.find(a => a.type === 'changeSet');

    if (changeSet?.changeSet?.gitPatch?.unidiffPatch) {
      stats = analyzeChangeSet(changeSet.changeSet.gitPatch.unidiffPatch);
    }

    // 3. Generate Label
    const labelData = {
      repo: 'davideast/modjules', // In real app, extract from Source Context
      sessionId: sessionId,
      summary: rollingSummary,
      files: stats.files
    };

    const buffer = await generateLabel(labelData);

    // 4. Save Artifact (In production, this sends to printer)
    const filename = `${count.toString().padStart(3, '0')}_${activity.type}.png`;
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, buffer);

    count++;

    yield { activity, summary: rollingSummary, stats, label: buffer, filePath };
  }
}
