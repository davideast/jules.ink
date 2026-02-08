import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  console.log('[API] Label image request');

  const labelData = await request.json();

  if (!labelData?.summary) {
    return new Response(JSON.stringify({ error: 'Missing label data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let generateLabel: typeof import('jules-ink')['generateLabel'];
  try {
    const mod = await import('jules-ink');
    generateLabel = mod.generateLabel;
  } catch (err) {
    console.error('[API] Failed to load jules-ink:', err);
    return new Response(JSON.stringify({ error: 'Failed to load jules-ink module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const buffer = await generateLabel(labelData);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('[API] Label generation error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
