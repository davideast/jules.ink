import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEnv } from '../../../../lib/api-keys';
import type { PrintStack, PrintStackActivity } from '../../../../lib/print-stack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.JULES_INK_ROOT || path.resolve(__dirname, '../../../../../../');
const STACKS_DIR = path.join(ROOT_DIR, '.jules', 'stacks');

/**
 * POST /api/session/{id}/snapshot
 *
 * Loads raw activities from Jules SDK and creates a PrintStack on disk
 * WITHOUT generating any labels/summaries. Returns the stack id.
 * Used by Generate Analysis to get session data without coupling to label generation.
 */
export const POST: APIRoute = async ({ params, request }) => {
  const sessionId = params.id!;
  const body = await request.json().catch(() => ({}));
  const tone = body.tone || 'default';

  // Ensure Jules SDK can authenticate
  const env = await readEnv();
  if (!process.env.JULES_API_KEY) {
    const julesKey = env.get('JULES_API_KEY');
    if (julesKey) process.env.JULES_API_KEY = julesKey;
  }

  let connect: typeof import('@google/jules-sdk')['connect'];
  try {
    const mod = await import('@google/jules-sdk');
    connect = mod.connect;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to load Jules SDK' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const jules = connect();
  const session = jules.session(sessionId);

  // Fetch session metadata
  let repo = 'unknown/repo';
  try {
    const info = await session.info();
    repo = info.sourceContext?.source?.replace('sources/github/', '') || repo;
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Failed to get session info: ${err.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Load all activities from history (no streaming, no label generation)
  const activities: PrintStackActivity[] = [];
  try {
    let index = 0;
    for await (const activity of session.history()) {
      const changeSet = activity.artifacts?.find((a: any) => a.type === 'changeSet');
      const commitMessage = changeSet?.gitPatch?.suggestedCommitMessage;
      const unidiffPatch = changeSet?.gitPatch?.unidiffPatch;

      // Extract file stats from the change set
      const files: { path: string; additions: number; deletions: number }[] = [];
      if (changeSet?.gitPatch?.changedFiles) {
        for (const f of changeSet.gitPatch.changedFiles) {
          files.push({
            path: f.path || f.newPath || 'unknown',
            additions: f.additions || 0,
            deletions: f.deletions || 0,
          });
        }
      }

      activities.push({
        index,
        activityId: activity.id,
        activityType: activity.type,
        summary: commitMessage || activity.type,
        files,
        commitMessage,
        createTime: (activity as any).createTime,
        unidiffPatch,
      });
      index++;
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Failed to load activities: ${err.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (activities.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No activities found for this session' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Create and save the stack
  const stackId = crypto.randomUUID();
  const stack: PrintStack = {
    id: stackId,
    sessionId,
    tone,
    repo,
    startedAt: activities[0]?.createTime || new Date().toISOString(),
    stackStatus: 'complete',
    stackType: 'snapshot',
    activities,
  };

  await fs.mkdir(STACKS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(STACKS_DIR, `${stackId}.json`),
    JSON.stringify(stack, null, 2),
  );

  return new Response(
    JSON.stringify({ stackId, activityCount: activities.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
