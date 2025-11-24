import 'dotenv/config';
import { streamChangeMetrics } from './processor.js';

async function main() {
  const sessionId = process.argv[2] || '7058525030495993685';
  console.log(`Analyzing Session: ${sessionId}`);
  console.log('Waiting for activities...');

  try {
    for await (const { summary, activityId } of streamChangeMetrics(sessionId)) {
      console.log(`\n--- [Activity: ${activityId}] ---`);
      console.log(summary.summaryString);

      console.table(summary.files.map(f => ({
        File: f.path,
        Changes: f.totalChanges,
        Visual: f.graph
      })));
    }
  } catch (err) {
    console.error("Stream error:", err);
  }
}

main();
