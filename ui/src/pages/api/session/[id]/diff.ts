import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  const sessionId = params.id!;
  const url = new URL(request.url);
  const activityId = url.searchParams.get('activityId');

  if (!activityId) {
    return new Response(JSON.stringify({ error: 'activityId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { connect } = await import('@google/jules-sdk');
    const { showDiff } = await import('@google/jules-mcp');
    const jules = connect();
    const diff = await showDiff(jules, sessionId, { activityId });

    return new Response(JSON.stringify({
      unidiffPatch: diff.unidiffPatch || '',
      files: diff.files || [],
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[diff] Error fetching diff:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch diff' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
