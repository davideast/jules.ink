import { jules } from '@google/jules-sdk';
import { SessionSummarizer } from './summarizer.js';
import { generateLabel, LabelData } from './label-generator.js';
import fs from 'fs';
import path from 'path';
import thermal from './print.js';

const TARGET_PRINTER = 'PM-241-BT';

export async function* processSessionAndPrint(sessionId: string) {
  // 1. Initialize Printer Hardware
  const hw = thermal();

  // Optional: Check if printer exists on startup
  const printers = await hw.scan();
  const printerAvailable = printers.find(p => p.name === TARGET_PRINTER);

  if (!printerAvailable) {
    console.warn(`⚠️ WARNING: Printer "${TARGET_PRINTER}" not found. Labels will be saved to disk only.`);
  } else {
    console.log(`🖨️  Connected to ${TARGET_PRINTER} (${printerAvailable.stat})`);
    // Ensure queue is ready
    await hw.fix(TARGET_PRINTER);
  }

  const summarizer = new SessionSummarizer({
    backend: 'cloud',
    apiKey: process.env.GEMINI_API_KEY,
  });
  let rollingSummary = "";

  const session = jules.session(sessionId);

  const outDir = path.resolve('output', sessionId);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let count = 0;

  for await (const activity of session.stream()) {
    console.log(`Processing Activity ${count + 1}: ${activity.type}`);

    // 1. Generate Summary
    rollingSummary = await summarizer.generateRollingSummary(rollingSummary, activity);
    console.log(`> Summary: ${rollingSummary}`);

    // 2. Extract Stats
    const filesForLabel = summarizer.getLabelData(activity);

    // 3. Generate Label Image
    const labelData: LabelData = {
      repo: 'davideast/jules.ink',
      sessionId: sessionId,
      summary: rollingSummary,
      files: filesForLabel
    };

    const buffer = await generateLabel(labelData);

    // 4. Save to Disk (Backup)
    const filename = `${count.toString().padStart(3, '0')}_${activity.type}.png`;
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, buffer);

    // 5. PRINT TO PM-241-BT
    if (printerAvailable) {
      try {
        console.log(`🖨️  Sending to ${TARGET_PRINTER}...`);

        // Auto-heal the printer queue if it got paused
        await hw.fix(TARGET_PRINTER);

        const jobId = await hw.print(TARGET_PRINTER, buffer, {
          fit: true, // Ensures the 300DPI image fits the 4x6 label
          media: 'w288h432' // Standard 4x6 inch (usually) - Adjust if your cups setup uses a different media name
        });

        console.log(`✅ Job ID: ${jobId}`);
      } catch (err) {
        console.error(`❌ Print failed:`, err);
      }
    }

    count++;

    yield {
      activity,
      summary: rollingSummary,
      labelPath: filePath
    };
  }
}
