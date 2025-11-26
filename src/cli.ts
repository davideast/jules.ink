#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { processSessionAndPrint } from './pipeline.js';

async function main() {
  // 1. Parse Command Line Arguments
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      session: {
        type: 'string',
        short: 's',
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
  });

  // 2. Show Help / Validation
  if (values.help || !values.session) {
    console.log(`
  Usage: node dist/cli.js --session <ID>

  Options:
    -s, --session <ID>   The Session ID to process (Required)
    -h, --help           Show help
    `);
    process.exit(0);
  }

  const sessionId = values.session;

  console.log(`\n🚀 Starting Label Pipeline for Session: ${sessionId}`);
  console.log(`===================================================\n`);

  try {
    // 3. Execute Pipeline
    const generator = processSessionAndPrint(sessionId);

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
}

main();