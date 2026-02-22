import { loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Path Resolution ---
// Resolve assets from the project root. We try import.meta.url first (works
// when running directly from dist/), then fall back to process.cwd() which
// handles the Vite-bundled SSR case where import.meta.url points at the
// Astro output chunk instead of the original dist/ file.

export function resolveAssetsDir(): string {
  // Try 1: relative to this file (dist/label/assets.js → ../../assets)
  // Note: Since this file will be in dist/label/, we need to go up two levels to reach dist/ and then ../assets
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    // src/label/assets.ts -> dist/label/assets.js
    // We want to reach assets/ which is at root.
    // relative to dist/label/assets.js: ../../assets
    const candidate = path.join(dir, '..', '..', 'assets');
    if (fs.existsSync(path.join(candidate, 'fonts'))) return candidate;
  } catch { /* import.meta.url might not resolve usefully */ }

  // Try 2: relative to cwd (project root → assets)
  const cwdCandidate = path.join(process.cwd(), 'assets');
  if (fs.existsSync(path.join(cwdCandidate, 'fonts'))) return cwdCandidate;

  // Fallback: return the cwd candidate anyway; registerLocalFont will just skip missing files
  return cwdCandidate;
}

export const ASSETS_DIR = resolveAssetsDir();
export const FONT_DIR = path.join(ASSETS_DIR, 'fonts');

export function registerLocalFont(filename: string, family: string) {
  const filePath = path.join(FONT_DIR, filename);
  if (fs.existsSync(filePath)) GlobalFonts.registerFromPath(filePath, family);
}

// Use unique family names to avoid @napi-rs/canvas font-cache poisoning:
// once a name resolves to a fallback, it's permanently cached even after
// the real font is registered. Unique names guarantee first-resolution
// always finds the registered font.
registerLocalFont('Inter-Medium.ttf', 'LabelSans');
registerLocalFont('JetBrainsMono-Regular.ttf', 'LabelMono');

let templatePromise: Promise<Awaited<ReturnType<typeof loadImage>> | null> | null = null;

export async function getTemplate(): Promise<Awaited<ReturnType<typeof loadImage>> | null> {
  if (templatePromise) return templatePromise;

  templatePromise = (async () => {
    const templatePath = path.join(ASSETS_DIR, 'template.png');
    if (fs.existsSync(templatePath)) {
      try {
        return await loadImage(templatePath);
      } catch (error) {
        console.error('Failed to load template image:', error);
        return null;
      }
    }
    return null;
  })();

  return templatePromise;
}
