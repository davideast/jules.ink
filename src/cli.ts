#!/usr/bin/env node
import { Command } from 'commander';
import { generateLabel } from './label/renderer.js';
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

    const { streamSession } = await import('./session-stream.js');

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
          await fs.promises.writeFile(filePath, buffer);

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
  .description('Start the UI and API server')
  .option('--api-port <port>', 'API server port', '3000')
  .option('--ui-port <port>', 'UI server port', '4321')
  .action(async (options) => {
    const apiPort = parseInt(options.apiPort);
    const uiPort = parseInt(options.uiPort);
    const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const uiSrcDir = path.join(pkgRoot, 'ui', 'src');
    const uiDistDir = path.join(pkgRoot, 'ui', 'dist');
    const devMode = fs.existsSync(uiSrcDir);

    if (!devMode && !fs.existsSync(uiDistDir)) {
      console.error('Neither ui/src/ nor ui/dist/ found. Is the package installed correctly?');
      process.exit(1);
    }

    // Set JULES_INK_ROOT so Astro API routes can find .env and .jules/
    const rootDir = devMode ? pkgRoot : process.cwd();
    process.env.JULES_INK_ROOT = rootDir;

    // Load .env from the root directory
    const { config } = await import('dotenv');
    config({ path: path.join(rootDir, '.env') });

    // Start API server
    const { serve } = await import('@hono/node-server');
    const { default: app } = await import('./server.js');

    const server = serve({ fetch: app.fetch, port: apiPort }, (info) => {
      console.log(`API server running at http://localhost:${info.port}`);
    });

    if (devMode) {
      // Dev mode: Astro dev server with HMR
      const { dev } = await import('astro');
      const devServer = await dev({ root: path.join(pkgRoot, 'ui'), server: { port: uiPort } });

      const cleanup = async () => {
        await devServer.stop();
        server.close();
        process.exit();
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } else {
      // Production mode: serve pre-built Astro output
      // Prevent @astrojs/node from auto-starting its own listener
      process.env.ASTRO_NODE_AUTOSTART = 'disabled';
      const entryPath = path.join(uiDistDir, 'server', 'entry.mjs');
      const { handler } = await import(entryPath);
      const http = await import('node:http');
      const uiServer = http.createServer(handler);
      uiServer.listen(uiPort, () => {
        console.log(`UI server running at http://localhost:${uiPort}`);
      });

      const cleanup = () => {
        uiServer.close();
        server.close();
        process.exit();
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    }
  });

// Only parse when run directly as the CLI entry point
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1]?.endsWith('/jules-ink')) {
  program.parse();
}
