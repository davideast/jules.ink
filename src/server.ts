import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { fileURLToPath } from 'url';
import { generateImage } from './services/ai.js';
import { printImage, watchPrinter } from './services/printer.js';
import { GenerateRequest } from './api-types.js';

const app = new Hono();
const port = 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:4321', 'http://localhost:3000'];

app.use('/*', cors({
  origin: allowedOrigins,
}));

app.post('/api/generate', async (c) => {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return c.json({ error: "GEMINI_API_KEY environment variable is required" }, 500);
  }

  const { prompt } = await c.req.json<GenerateRequest>();
  if (!prompt) return c.json({ error: 'prompt required' }, 400);

  try {
    const buffer = await generateImage(prompt, apiKey);

    await printImage(buffer);

    return new Response(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'image/png' },
    });

  } catch (err) {
    console.error('error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});

export default app;

const isMain = process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1]?.endsWith('server.ts');

if (isMain) {
  if (!process.env["GEMINI_API_KEY"]) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const controller = new AbortController();
  watchPrinter(controller.signal);

  process.on('SIGINT', () => {
    controller.abort();
    process.exit();
  });

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`🚀 server at http://localhost:${info.port}`);
  });
}
