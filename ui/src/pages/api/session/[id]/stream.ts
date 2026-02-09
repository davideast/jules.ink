import type { APIRoute } from 'astro';
import { createSession, removeSession } from '../../../../lib/session-state';

export const GET: APIRoute = async ({ params, request }) => {
  const sessionId = params.id!;
  const url = new URL(request.url);
  const tone = url.searchParams.get('tone') || undefined;
  const model = url.searchParams.get('model') || undefined;
  const afterIndex = parseInt(url.searchParams.get('afterIndex') || '-1', 10);

  console.log(`[SSE] Stream request: session=${sessionId}, tone=${tone}, model=${model}, afterIndex=${afterIndex}`);

  // Dynamic import to avoid Vite statically resolving the workspace package
  let streamSession: typeof import('jules-ink')['streamSession'];
  try {
    const mod = await import('jules-ink');
    streamSession = mod.streamSession;
    console.log('[SSE] jules-ink loaded successfully');
  } catch (err) {
    console.error('[SSE] Failed to load jules-ink:', err);
    return new Response(JSON.stringify({ error: 'Failed to load jules-ink module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const activeSession = createSession(sessionId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: heartbeat\ndata: {}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      try {
        console.log(`[SSE] Starting streamSession for ${sessionId}...`);
        for await (const event of streamSession(sessionId, {
          tone,
          model,
          signal: activeSession.controller.signal,
          afterIndex,
        })) {
          if (activeSession.controller.signal.aborted) {
            console.log(`[SSE] Stream aborted for ${sessionId}`);
            break;
          }

          console.log(`[SSE] Event: ${event.type}`, event.type === 'activity:processed' ? `index=${event.index}` : '');
          send(event.type, event);

          if (event.type === 'activity:processed') {
            activeSession.processedCount = event.index + 1;
          }
        }
        console.log(`[SSE] Stream loop ended for ${sessionId}`);
      } catch (err: any) {
        console.error(`[SSE] Stream error for ${sessionId}:`, err);
        if (!activeSession.controller.signal.aborted) {
          send('session:error', { sessionId, error: err.message || String(err) });
        }
      } finally {
        clearInterval(heartbeat);
        removeSession(sessionId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
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
