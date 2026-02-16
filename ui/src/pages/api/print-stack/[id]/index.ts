import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidStackId } from '../../../../lib/validation';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = process.env.JULES_INK_ROOT || path.resolve(__dirname, '../../../../../');
const STACKS_DIR = path.join(ROOT_DIR, '.jules', 'stacks');

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isValidStackId(id)) {
    return new Response(JSON.stringify({ error: 'invalid id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const filepath = path.join(STACKS_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return new Response(content, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'stack not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
