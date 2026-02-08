import type { APIRoute } from 'astro';
import { getSession } from '../../../../lib/session-state';

export const POST: APIRoute = async ({ params }) => {
  const sessionId = params.id!;
  const session = getSession(sessionId);

  if (!session) {
    return new Response(JSON.stringify({ error: 'No active session' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  session.controller.abort();

  return new Response(JSON.stringify({
    sessionId,
    processedCount: session.processedCount,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
