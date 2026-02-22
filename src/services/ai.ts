import { GoogleGenAI } from "@google/genai";

const model = "imagen-4.0-generate-001";

export async function generateImage(prompt: string, apiKey: string): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey });
  console.log(`🎨 dreaming: "${prompt}"`);

  const res = await ai.models.generateImages({
    model,
    prompt: `A black and white kids coloring page. <image-description>${prompt}</image-description> ${prompt}`,
    config: { numberOfImages: 1, aspectRatio: "9:16" },
  });

  const bytes = res.generatedImages?.[0]?.image?.imageBytes;
  if (!bytes) throw new Error('no bytes');
  return Buffer.from(bytes, "base64");
}
