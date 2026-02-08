import { generateLabel } from '../src/label-generator.js';
import { performance } from 'perf_hooks';

async function runBenchmark() {
  const data = {
    repo: 'davideast/modjules',
    sessionId: 'sess_999888777',
    summary: 'Proposed a plan to update API, Client, and Session files to handle handshake intents.',
    files: [
      { path: 'src/api/handlers.ts', additions: 10, deletions: 5 },
      { path: 'src/client/session.ts', additions: 3, deletions: 0 },
      { path: 'package.json', additions: 1, deletions: 1 }
    ]
  };

  const iterations = 50;
  console.log(`Running benchmark with ${iterations} iterations...`);

  // Warm up
  await generateLabel(data);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await generateLabel(data);
  }
  const end = performance.now();

  const totalTime = end - start;
  const averageTime = totalTime / iterations;

  console.log(`Total time for ${iterations} iterations: ${totalTime.toFixed(2)}ms`);
  console.log(`Average time per iteration: ${averageTime.toFixed(2)}ms`);
}

runBenchmark().catch(console.error);
