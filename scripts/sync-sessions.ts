import { jules } from '@google/jules-sdk';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const OUT_DIR = join(process.cwd(), '.jules', 'snapshots');

async function main() {
  console.log('Syncing sessions and activities from Jules API...\n');

  // Sync all sessions + activities to the local cache
  const stats = await jules.sync({
    depth: 'activities',
    incremental: true,
    onProgress(progress) {
      switch (progress.phase) {
        case 'fetching_list':
          process.stdout.write(`\r  Fetching session list... (${progress.current})`);
          break;
        case 'hydrating_activities':
          process.stdout.write(
            `\r  Hydrating activities... ${progress.current}/${progress.total ?? '?'}` +
            (progress.activityCount != null ? ` (${progress.activityCount} activities)` : '')
          );
          break;
        case 'checkpoint':
          process.stdout.write(`\r  Checkpoint saved.`);
          break;
      }
    },
    checkpoint: true,
  });

  console.log('\n');
  console.log(`Sync complete in ${(stats.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Sessions ingested: ${stats.sessionsIngested}`);
  console.log(`  Activities ingested: ${stats.activitiesIngested}`);
  console.log(`  Full sync: ${stats.isComplete}`);
  console.log();

  // Write snapshots to disk for each session
  await mkdir(OUT_DIR, { recursive: true });

  let written = 0;
  for await (const sessionResource of jules.sessions()) {
    const session = jules.session(sessionResource.id);
    const snapshot = await session.snapshot({ activities: true });
    const json = snapshot.toJSON();
    const filePath = join(OUT_DIR, `${sessionResource.id}.json`);
    await writeFile(filePath, JSON.stringify(json, null, 2));
    written++;
    console.log(`  Wrote ${filePath}`);
  }

  console.log(`\nDone. ${written} snapshots written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
