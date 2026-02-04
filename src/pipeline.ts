import { jules } from '@google/jules-sdk';
import { SessionSummarizer } from './summarizer.js';
import { generateLabel, LabelData } from './label-generator.js';
import fs from 'fs';
import path from 'path';
import thermal, { device } from './print.js';

export interface ProcessOptions {
  model?: string;
  tone?: string;
  printer?: string;
  outputDir?: string;
}

export async function* processSessionAndPrint(sessionId: string, options: ProcessOptions = {}) {
  // 1. Initialize Printer Hardware
  const hw = thermal();

  // Find printer: use specified name, or auto-discover
  let printer: device | null = null;
  if (options.printer) {
    const printers = await hw.scan();
    printer = printers.find(p => p.name === options.printer) || null;
    if (!printer) {
      console.warn(`⚠️ Printer "${options.printer}" not found. Labels will be saved to disk only.`);
    }
  } else {
    printer = await hw.find();
  }

  if (printer) {
    console.log(`🖨️ Found printer: ${printer.name} (${printer.stat})`);
    await hw.fix(printer.name);
  } else if (!options.printer) {
    console.warn('⚠️ No printer found. Labels will be saved to disk only.');
  }

  const summarizer = new SessionSummarizer({
    backend: 'cloud',
    apiKey: process.env.GEMINI_API_KEY,
    cloudModelName: options.model,
    tone: options.tone as any,
  });
  let rollingSummary = "";

  const session = jules.session(sessionId);

  // Fetch session info to get the actual repo
  const sessionInfo = await session.info();
  const repo = sessionInfo.sourceContext?.source?.replace('sources/github/', '') || 'unknown/repo';
  console.log(`📦 Repository: ${repo}`);

  // Base directory precedence:
  // 1. CLI Option
  // 2. Environment Variable
  // 3. Default 'output' (relative to CWD)
  const baseDir = options.outputDir
    || process.env.JULES_INK_OUTPUT_DIR
    || 'output';

  const outDir = path.resolve(baseDir, sessionId);
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
      repo,
      sessionId: sessionId,
      summary: rollingSummary,
      files: filesForLabel
    };

    const buffer = await generateLabel(labelData);

    // 4. Save to Disk (Backup)
    const filename = `${count.toString().padStart(3, '0')}_${activity.type}.png`;
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, buffer);

    // 5. Print if printer available
    if (printer) {
      try {
        console.log(`🖨️ Sending to ${printer.name}...`);

        // Auto-heal the printer queue if it got paused
        await hw.fix(printer.name);

        const jobId = await hw.print(printer.name, buffer, {
          fit: true,
          media: 'w288h432'
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
