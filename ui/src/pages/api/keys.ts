import type { APIRoute } from 'astro';
import { readEnv, writeEnv, checkKeysConfigured } from '../../lib/api-keys';

/** GET — return key status and current values */
export const GET: APIRoute = async () => {
  const env = await readEnv();
  const geminiKey = env.get('GEMINI_API_KEY')?.trim() || '';
  const julesKey = env.get('JULES_API_KEY')?.trim() || '';
  const configured = Boolean(geminiKey) && Boolean(julesKey);

  return new Response(
    JSON.stringify({ configured, geminiKey, julesKey }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

/** POST — save keys to .env and update process.env */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { geminiKey, julesKey } = body as {
      geminiKey?: string;
      julesKey?: string;
    };

    if (!geminiKey?.trim() || !julesKey?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Both geminiKey and julesKey are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const env = await readEnv();
    env.set('GEMINI_API_KEY', geminiKey.trim());
    env.set('JULES_API_KEY', julesKey.trim());
    await writeEnv(env);

    // Update process.env so the running server picks up the new keys
    process.env.GEMINI_API_KEY = geminiKey.trim();
    process.env.JULES_API_KEY = julesKey.trim();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('save keys error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to save keys' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
