import type { APIRoute } from 'astro';
import { loadTones, saveTone } from 'jules-ink/tones';

export const GET: APIRoute = async () => {
  try {
    const tones = await loadTones();
    return new Response(JSON.stringify(tones), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.name || !body.instructions) {
      return new Response(JSON.stringify({ error: 'Missing name or instructions' }), { status: 400 });
    }
    const tones = await saveTone(body);
    return new Response(JSON.stringify(tones), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
