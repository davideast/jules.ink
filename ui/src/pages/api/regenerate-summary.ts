import type { APIRoute } from 'astro';
import { SessionSummarizer } from 'jules-ink';
import { readEnv } from '../../lib/api-keys';

/** Regenerate a single activity summary with a new tone/model. */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json() as {
    summary: string;
    activityType: string;
    tone: string;
    model?: string;
  };

  if (!body.summary || !body.tone) {
    return new Response(JSON.stringify({ error: 'summary and tone are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = await readEnv();
  const apiKey = process.env.GEMINI_API_KEY || env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const summarizer = new SessionSummarizer({
      backend: 'cloud',
      apiKey,
      cloudModelName: body.model || 'gemini-2.5-flash-lite',
      tone: body.tone,
    });

    const newSummary = await summarizer.styleTransfer(body.summary, body.activityType);
    return new Response(JSON.stringify({ summary: newSummary }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Regeneration failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
