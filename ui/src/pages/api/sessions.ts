import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.JULES_INK_ROOT || path.resolve(__dirname, '../../../../');
const CACHE_DIR = path.join(ROOT_DIR, '.jules');
const SESSIONS_CACHE_FILE = path.join(CACHE_DIR, 'sessions-cache.json');

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '25', 10);
  const pageToken = url.searchParams.get('pageToken') || undefined;

  try {
    const { connect } = await import('@google/jules-sdk');
    const jules = connect();
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

    // Write-through to our own file cache so SSR can read it instantly
    if (!pageToken) {
      try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(
          SESSIONS_CACHE_FILE,
          JSON.stringify({ sessions, updatedAt: new Date().toISOString() }),
        );
      } catch {
        // Non-critical — SSR fallback will just use SDK cache
      }
    }

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
