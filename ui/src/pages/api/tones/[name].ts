import type { APIRoute } from 'astro';
import { deleteTone } from 'jules-ink';

export const DELETE: APIRoute = async ({ params }) => {
  const { name } = params;
  if (!name) {
    return new Response(JSON.stringify({ error: 'Missing name' }), { status: 400 });
  }

  try {
    const tones = await deleteTone(name);
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
