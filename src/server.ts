import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { GoogleGenAI } from "@google/genai";
import thermal from './print.js';

const app = new Hono();
const port = 3000;
const hw = thermal();

app.use('/*', cors());

const controller = new AbortController();
hw.watch(controller.signal);

process.on('SIGINT', () => {
  controller.abort();
  process.exit();
});

const apiKey = process.env["GEMINI_API_KEY"];
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}
const ai = new GoogleGenAI({ apiKey });

const model = "imagen-4.0-generate-001";

app.post('/api/generate', async (c) => {
  const { prompt } = await c.req.json();
  if (!prompt) return c.json({ error: 'prompt required' }, 400);

  try {
    console.log(`🎨 dreaming: "${prompt}"`);

    const res = await ai.models.generateImages({
      model,
      prompt: `A black and white kids coloring page. <image-description>${prompt}</image-description> ${prompt}`,
      config: { numberOfImages: 1, aspectRatio: "9:16" },
    });

    const bytes = res.generatedImages?.[0]?.image?.imageBytes;
    if (!bytes) throw new Error('no bytes');
    const buffer = Buffer.from(bytes, "base64");

    const target = await hw.find();

    if (target) {
      console.log(`🖨️  routing: ${target.name}`);
      hw.print(target.name, buffer, { fit: true })
        .catch(err => console.warn('print error:', err));
    } else {
      console.warn('⚠️  no usb found');
    }

    return new Response(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'image/png' },
    });

  } catch (err) {
    console.error('error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 server at http://localhost:${info.port}`);
});
