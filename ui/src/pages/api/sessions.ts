import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
  const pageToken = url.searchParams.get('pageToken') || undefined;

  let jules: typeof import('@google/jules-sdk')['jules'];
  try {
    const mod = await import('@google/jules-sdk');
    jules = mod.jules;
  } catch (err) {
    console.error('[API] Failed to load jules-sdk:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to load jules-sdk' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const page = await jules.sessions({ pageSize, pageToken });

    const sessions = page.sessions.map((s) => {
      // Map SDK session state to our UI status
      const rawState = String(s.state || '').toLowerCase();
      let status: 'completed' | 'in_progress' | 'failed' = 'in_progress';
      if (rawState === 'completed') status = 'completed';
      else if (rawState === 'failed') status = 'failed';

      // Extract repo from sourceContext
      const repo = s.sourceContext?.source?.replace('sources/github/', '') || '';

      return {
        id: s.id,
        title: s.title || s.prompt?.slice(0, 60) || `Session ${s.id.slice(0, 8)}`,
        repo,
        status,
        createTime: s.createTime,
        updateTime: s.updateTime,
      };
    });

    return new Response(
      JSON.stringify({
        sessions,
        nextPageToken: page.nextPageToken || null,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[API] sessions list error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to list sessions' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
