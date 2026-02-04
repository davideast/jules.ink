#!/usr/bin/env node
import { Command } from 'commander';
import { processSessionAndPrint } from './pipeline.js';

const program = new Command();

program
  .name('jules-ink')
  .description('Label Pipeline CLI for processing Jules sessions')
  .version('0.0.0');

program
  .command('process')
  .description('Process a Jules session and generate labels')
  .requiredOption('-s, --session <id>', 'The Session ID to process')
  .option('-m, --model <name>', 'Gemini model to use for summarization', 'gemini-2.5-flash-lite')
  .option('-t, --tone <preset>', 'Tone preset for summaries (professional, pirate, shakespearean, excited, haiku, noir)', 'professional')
  .action(async (options) => {
    const sessionId = options.session;
    const model = options.model;
    const tone = options.tone;

    console.log(`\n🚀 Starting Label Pipeline for Session: ${sessionId}`);
    console.log(`📦 Using model: ${model}`);
    console.log(`🎭 Tone: ${tone}`);
    console.log(`===================================================\n`);

    try {
      const generator = processSessionAndPrint(sessionId, { model, tone });

      for await (const result of generator) {
        console.log(`✓ [${result.activity.type}] Processed`);
        console.log(`  └─ Summary: "${result.summary.substring(0, 60)}..."`);
        console.log(`  └─ Label:   ${result.labelPath}\n`);
      }

      console.log(`✅ Session ${sessionId} processing complete.`);
    } catch (error) {
      console.error('\n❌ Fatal Error processing session:', error);
      process.exit(1);
    }
  });

program.parse();