import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  console.log('[API] Print request');

  const body = await request.json() as { printerName: string; labelData: any };
  const { printerName, labelData } = body;

  if (!printerName || !labelData) {
    return new Response(JSON.stringify({ error: 'Missing printerName or labelData' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let thermal: typeof import('jules-ink')['thermal'];
  let generateLabel: typeof import('jules-ink')['generateLabel'];
  try {
    const mod = await import('jules-ink');
    thermal = mod.thermal;
    generateLabel = mod.generateLabel;
  } catch (err) {
    console.error('[API] Failed to load jules-ink:', err);
    return new Response(JSON.stringify({ error: 'Failed to load jules-ink module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const hw = thermal();

  try {
    const buffer = await generateLabel(labelData);
    await hw.fix(printerName);
    const jobId = await hw.print(printerName, buffer, {
      fit: true,
      media: 'w288h432',
    });

    console.log(`[API] Print job ${jobId} sent to ${printerName}`);
    return new Response(JSON.stringify({ jobId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[API] Print error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
