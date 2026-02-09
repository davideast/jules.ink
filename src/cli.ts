#!/usr/bin/env node
import { Command } from 'commander';
import { streamSession } from './session-stream.js';
import { generateLabel } from './label-generator.js';
import thermal from './print.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const program = new Command();

program
  .name('jules-ink')
  .description('Label Pipeline CLI for processing Jules sessions')
  .version('0.0.0');

program
  .command('print')
  .description('Print labels for a Jules session')
  .requiredOption('-s, --session <id>', 'The Session ID to process')
  .option('-m, --model <name>', 'Gemini model to use for summarization', 'gemini-2.5-flash-lite')
  .option('-t, --tone <preset>', 'Tone preset for summaries (professional, pirate, shakespearean, excited, haiku, noir)', 'professional')
  .option('-p, --printer <name>', 'Printer name (auto-discovers if not set)')
  .option('-o, --output <path>', 'Output directory for labels')
  .action(async (options) => {
    const sessionId = options.session;
    const model = options.model;
    const tone = options.tone;
    const printerName = options.printer;
    const outputDir = options.output;

    console.log(`\n🚀 Starting Label Pipeline for Session: ${sessionId}`);
    console.log(`📦 Using model: ${model}`);
    console.log(`🎭 Tone: ${tone}`);
    console.log(`===================================================\n`);

    // --- CLI-only: Printer discovery ---
    const hw = thermal();
    let printer = null as Awaited<ReturnType<typeof hw.find>>;

    if (printerName) {
      const printers = await hw.scan();
      printer = printers.find(p => p.name === printerName) || null;
      if (!printer) {
        console.warn(`⚠️ Printer "${printerName}" not found. Labels will be saved to disk only.`);
      }
    } else {
      printer = await hw.find();
    }

    if (printer) {
      console.log(`🖨️ Found printer: ${printer.name} (${printer.stat})`);
      await hw.fix(printer.name);
    } else if (!printerName) {
      console.warn('⚠️ No printer found. Labels will be saved to disk only.');
    }

    // --- CLI-only: Output directory ---
    const baseDir = outputDir || process.env.JULES_INK_OUTPUT_DIR || 'output';
    const outDir = path.resolve(baseDir, sessionId);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let repo = 'unknown/repo';

    try {
      for await (const event of streamSession(sessionId, { model, tone })) {
        if (event.type === 'session:info') {
          repo = event.repo;
          console.log(`📦 Repository: ${repo}`);
          continue;
        }

        if (event.type === 'session:error') {
          console.error(`❌ Error: ${event.error}`);
          continue;
        }

        if (event.type === 'session:complete') {
          console.log(`\n✅ Session ${sessionId} processing complete. ${event.totalActivities} activities.`);
          continue;
        }

        if (event.type === 'activity:processed') {
          console.log(`Processing Activity ${event.index + 1}: ${event.activityType}`);
          console.log(`> Summary: ${event.summary}`);

          // Generate label image
          const labelData = {
            repo,
            sessionId,
            summary: event.summary,
            files: event.files,
          };
          const buffer = await generateLabel(labelData);

          // Save to disk
          const filename = `${event.index.toString().padStart(3, '0')}_${event.activityType}.png`;
          const filePath = path.join(outDir, filename);
          fs.writeFileSync(filePath, buffer);

          // Print if printer available
          if (printer) {
            try {
              console.log(`🖨️ Sending to ${printer.name}...`);
              await hw.fix(printer.name);
              const jobId = await hw.print(printer.name, buffer, {
                fit: true,
                media: 'w288h432',
              });
              console.log(`✅ Job ID: ${jobId}`);
            } catch (err) {
              console.error(`❌ Print failed:`, err);
            }
          }

          console.log(`✓ [${event.activityType}] Processed`);
          console.log(`  └─ Summary: "${event.summary.substring(0, 60)}..."`);
          console.log(`  └─ Label:   ${filePath}\n`);
        }
      }
    } catch (error) {
      console.error('\n❌ Fatal Error processing session:', error);
      process.exit(1);
    }
  });

program
  .command('ui')
  .description('Start the UI and API server for local development')
  .action(async () => {
    const { spawn } = await import('child_process');

    // Resolve ui/ directory relative to this file
    const uiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'ui');

    if (!fs.existsSync(uiDir)) {
      console.error('ui/ directory not found. Run this command from the jules-ink repo.');
      process.exit(1);
    }

    // Start API server
    const { serve } = await import('@hono/node-server');
    const { default: app } = await import('./server.js');

    const server = serve({ fetch: app.fetch, port: 3000 }, (info) => {
      console.log(`API server running at http://localhost:${info.port}`);
    });

    // Start Astro dev server
    const astro = spawn('npx', ['astro', 'dev'], {
      cwd: uiDir,
      stdio: 'inherit',
      shell: true,
    });

    astro.on('error', (err) => {
      console.error('Failed to start Astro dev server:', err.message);
      server.close();
      process.exit(1);
    });

    const cleanup = () => {
      astro.kill();
      server.close();
      process.exit();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });

// Only parse when run directly as the CLI entry point
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1]?.endsWith('/jules-ink')) {
  program.parse();
}
