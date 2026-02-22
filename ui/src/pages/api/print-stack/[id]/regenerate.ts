import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SessionSummarizer } from 'jules-ink/summarizer';
import { readEnv } from '../../../../lib/api-keys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.JULES_INK_ROOT || path.resolve(__dirname, '../../../../../../');
const STACKS_DIR = path.join(ROOT_DIR, '.jules', 'stacks');

export const GET: APIRoute = async ({ params, request }) => {
  const sourceId = params.id!;
  const url = new URL(request.url);
  const tone = url.searchParams.get('tone') || 'noir';
  const model = url.searchParams.get('model') || 'gemini-2.5-flash-lite';

  // Load source stack
  const filepath = path.join(STACKS_DIR, `${sourceId}.json`);
  let sourceStack: any;
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    sourceStack = JSON.parse(content);
  } catch {
    return new Response(JSON.stringify({ error: 'Source stack not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify source has activities to regenerate
  if (!sourceStack.activities?.length) {
    return new Response(JSON.stringify({ error: 'Source stack has no activities' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Read API key
  const env = await readEnv();
  const apiKey = process.env.GEMINI_API_KEY || env.get('GEMINI_API_KEY');

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const summarizer = new SessionSummarizer({
    backend: 'cloud',
    apiKey,
    cloudModelName: model,
    tone,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const activities = sourceStack.activities || [];
        for (const activity of activities) {
          const newSummary = await summarizer.styleTransfer(
            activity.summary,
            activity.activityType,
          );
          send('activity:regenerated', {
            index: activity.index,
            activityId: activity.activityId,
            summary: newSummary,
          });
        }
        send('regeneration:complete', { totalActivities: activities.length });
      } catch (err: any) {
        send('regeneration:error', { error: err.message || 'Regeneration failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
