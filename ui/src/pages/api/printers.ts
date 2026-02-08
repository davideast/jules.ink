import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  console.log('[API] Printers scan request');

  let thermal: typeof import('jules-ink')['thermal'];
  try {
    const mod = await import('jules-ink');
    thermal = mod.thermal;
  } catch (err) {
    console.error('[API] Failed to load jules-ink:', err);
    return new Response(JSON.stringify({ error: 'Failed to load jules-ink module', printers: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const hw = thermal();
    const devices = await hw.scan();

    const printers = devices.map(d => ({
      name: d.name,
      online: !['disabled', 'paused'].some(s => d.stat.toLowerCase().includes(s)),
      isUsb: d.usb,
    }));

    console.log(`[API] Found ${printers.length} printers`);
    return new Response(JSON.stringify({ printers }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[API] Printer scan error:', err);
    return new Response(JSON.stringify({ error: err.message, printers: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
