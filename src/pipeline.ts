import { jules } from 'modjules';
import { SessionSummarizer } from './summarizer.js';
import { analyzeChangeSet } from './analyzer.js';
import { generateLabel, LabelData } from './label-generator.js';
import fs from 'fs';
import path from 'path';

export async function* processSessionAndPrint(sessionId: string) {
  // Initialize the Smart Summarizer we built previously
  const summarizer = new SessionSummarizer({
    backend: 'cloud',
    apiKey: process.env.GEMINI_API_KEY
  });
  let rollingSummary = "";

  const session = jules.session(sessionId);

  const outDir = path.resolve('output', sessionId);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let count = 0;

  for await (const activity of session.stream()) {
    console.log(`Processing Activity ${count + 1}: ${activity.type}`);

    // 1. Generate Rolling Summary
    // This uses the "Senior Engineer" prompt logic with context truncation
    rollingSummary = await summarizer.generateRollingSummary(rollingSummary, activity);
    console.log(`> Summary: ${rollingSummary}`);

    // 2. Extract Stats for the Label
    let filesForLabel: any[] = [];

    const changeSet = activity.artifacts?.find(a => a.type === 'changeSet');

    if (changeSet?.changeSet?.gitPatch?.unidiffPatch) {
      // This now uses the filtered logic (no lockfiles)
      const stats = analyzeChangeSet(changeSet.changeSet.gitPatch.unidiffPatch);
      filesForLabel = stats.files;
    }

    // 3. Generate Label
    // We map the filtered files to the LabelData interface
    const labelData: LabelData = {
      repo: 'davideast/modjules', // Ideally get this from session.sourceContext
      sessionId: sessionId,
      summary: rollingSummary,
      files: filesForLabel // Now contains { path, additions, deletions }
    };

    const buffer = await generateLabel(labelData);

    // 4. Save Artifact
    const filename = `${count.toString().padStart(3, '0')}_${activity.type}.png`;
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, buffer);

    count++;

    // Yield for any downstream UI or processing
    yield {
      activity,
      summary: rollingSummary,
      labelPath: filePath
    };
  }
}
