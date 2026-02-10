import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.JULES_INK_ROOT || path.resolve(__dirname, '../../../../../');
const STACKS_DIR = path.join(ROOT_DIR, '.jules', 'stacks');

export const GET: APIRoute = async ({ url }) => {
  try {
    await fs.mkdir(STACKS_DIR, { recursive: true });
    const files = await fs.readdir(STACKS_DIR);
    const stacks = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(STACKS_DIR, file), 'utf-8');
          stacks.push(JSON.parse(content));
        } catch (e) {
          console.warn(`skipping invalid stack file: ${file}`, e);
        }
      }
    }

    // Filter by sessionId
    const filterSessionId = url.searchParams.get('sessionId');
    let filtered = stacks;
    if (filterSessionId) {
      filtered = filtered.filter((s: any) => s.sessionId === filterSessionId);
    }

    // Filter by status (stackStatus field, defaulting to 'complete' for backward compat)
    const filterStatus = url.searchParams.get('status');
    if (filterStatus) {
      filtered = filtered.filter((s: any) => (s.stackStatus ?? 'complete') === filterStatus);
    }

    // Sort by startedAt desc
    filtered.sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return new Response(JSON.stringify(filtered), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('list stacks error:', err);
    return new Response(JSON.stringify({ error: 'failed to list stacks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    await fs.mkdir(STACKS_DIR, { recursive: true });
    const stack = await request.json();
    if (!stack || !stack.id) {
      return new Response(JSON.stringify({ error: 'invalid stack' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const filepath = path.join(STACKS_DIR, `${stack.id}.json`);

    // Immutability guard: don't overwrite a completed stack
    try {
      const existing = await fs.readFile(filepath, 'utf-8');
      const parsed = JSON.parse(existing);
      if ((parsed.stackStatus ?? 'complete') === 'complete') {
        return new Response(JSON.stringify({ error: 'Cannot overwrite a completed stack' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {
      // File doesn't exist — proceed with write
    }

    await fs.writeFile(filepath, JSON.stringify(stack, null, 2));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('save stack error:', err);
    return new Response(JSON.stringify({ error: 'failed to save stack' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
