import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Define cache paths based on how modjules works
// Found via grep: Stores activities in a JSONL file located at `.jules/cache/<sessionId>/activities.jsonl`
const JULES_CACHE_DIR = path.join(process.cwd(), '.jules', 'cache');
const MOCK_SESSION_ID = 'integration-test-session';
const SESSION_DIR = path.join(JULES_CACHE_DIR, MOCK_SESSION_ID);
const MOCK_CACHE_FILE = path.join(SESSION_DIR, 'activities.jsonl');

// A mock JSONL content representing a history of activities
const MOCK_JSONL_CONTENT = `
{"id":"act_1","type":"planGenerated","artifacts":[]}
{"id":"act_2","type":"progressUpdated","artifacts":[{"type":"changeSet","changeSet":{"gitPatch":{"unidiffPatch":"diff --git a/test.ts b/test.ts\\nindex 1..2\\n--- a/test.ts\\n+++ b/test.ts\\n@@ -1 +1,2 @@\\n-old\\n+new\\n+feature"}}}]}
{"id":"act_3","type":"userMessaged","artifacts":[]}
`.trim();

describe('Processor Integration', () => {
  let streamChangeMetrics: any;

  // 1. Setup: Create the mock cache file
  beforeAll(async () => {
    // Set ENV before importing the module so modjules picks it up
    process.env.JULES_REST_API = 'https://mock.api';
    // JULES_API_KEY is expected to be set in the environment

    await fs.mkdir(SESSION_DIR, { recursive: true });
    await fs.writeFile(MOCK_CACHE_FILE, MOCK_JSONL_CONTENT, 'utf-8');

    // Dynamic import to respect env vars
    const module = await import('../../src/processor.js');
    streamChangeMetrics = module.streamChangeMetrics;
  });

  // 2. Teardown: Cleanup the file
  afterAll(async () => {
    // Clean up the specific session directory
    await fs.rm(SESSION_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('correctly streams and filters ChangeSet activities from local cache', async () => {
    const results = [];

    // Run the processor against the mock ID with live=false to avoid network calls
    for await (const metrics of streamChangeMetrics(MOCK_SESSION_ID, { live: false })) {
      results.push(metrics);
    }

    // Assertions
    expect(results.length).toBe(1); // Only 1 activity had a changeSet

    const metric = results[0];
    expect(metric.activityId).toBe('act_2');
    expect(metric.summary.totalFiles).toBe(1);
    expect(metric.summary.files[0].path).toBe('test.ts');

    // Verify math on the mock patch (-1, +2)
    expect(metric.summary.totalInsertions).toBe(2);
    expect(metric.summary.totalDeletions).toBe(1);
    expect(metric.summary.summaryString).toContain('2 insertions(+)');
  });
});
