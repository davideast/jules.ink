import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import { calculateWrappedLines, truncateMiddle } from './utils.js';

// --- Font Registration ---
const FONT_DIR = path.resolve('./assets/fonts');

function registerLocalFont(filename: string, family: string, weight?: string) {
  const filePath = path.join(FONT_DIR, filename);
  if (fs.existsSync(filePath)) {
    // @napi-rs/canvas GlobalFonts.registerFromPath(path, alias)
    // It does not accept weight directly in the same way node-canvas might.
    // However, if the font file has the weight, it should be fine.
    // We pass the family name as the alias.
    GlobalFonts.registerFromPath(filePath, family);
  }
}

// Register Google Fonts (Required for the look)
registerLocalFont('GoogleSans-Bold.ttf', 'Google Sans');
// Note: If different weights share the same family name, @napi-rs/canvas might handle them if the metadata is correct,
// or we might need unique aliases if they don't work.
// But standard usage is usually to register them.
registerLocalFont('GoogleSans-Regular.ttf', 'Google Sans');
registerLocalFont('GoogleSansMono-Regular.ttf', 'Google Sans Mono');

// --- 300 DPI Configuration ---
const CONFIG = {
  width: 1200,
  height: 1800,
  padding: 64, // Margins

  fonts: {
    header: '36px "Google Sans Mono", monospace',
    body: 'bold 90px "Google Sans", sans-serif',
    stats: '42px "Google Sans Mono", monospace',
  },

  layout: {
    // Top text (Repo/Session) placement
    headerY: 120,

    // Body text placement (Starts BELOW the Octopus icon)
    // Based on your image, the icon ends roughly at 25-30% height.
    bodyY: 620,
    bodyLineHeight: 110,

    // Footer stats placement
    footerY: 1350,
    footerLineHeight: 65
  }
};

export interface FileStat {
  path: string;
  graph: string; // "████░"
}

export interface LabelData {
  repo: string;
  sessionId: string;
  summary: string;
  files: FileStat[];
}

export async function generateLabel(data: LabelData): Promise<Buffer> {
  const canvas = createCanvas(CONFIG.width, CONFIG.height);
  const ctx = canvas.getContext('2d');

  // 1. Load the Provided Asset
  // This assumes the file exists at assets/template.png
  const templatePath = path.resolve('./assets/template.png');

  if (fs.existsSync(templatePath)) {
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, CONFIG.width, CONFIG.height);
  } else {
    throw new Error(`Missing template asset! Please save the background image to ${templatePath}`);
  }

  // 2. Set Ink Color (Thermal Black)
  ctx.fillStyle = 'black';

  // 3. Typeset the content
  drawHeader(ctx, data.repo, data.sessionId);
  drawBody(ctx, data.summary);
  drawStats(ctx, data.files);

  return canvas.toBuffer('image/png');
}

// --- Sub-Routines ---

function drawHeader(ctx: any, repo: string, sessionId: string) {
  const { width, padding } = CONFIG;

  // A. Session ID (Top Right)
  ctx.font = CONFIG.fonts.header;
  ctx.textAlign = 'right';
  ctx.fillText(sessionId, width - padding, CONFIG.layout.headerY);

  // B. Repo Name (Top Left - Dynamic Scaling)
  const sessionWidth = ctx.measureText(sessionId).width;
  const maxRepoWidth = width - (padding * 2) - sessionWidth - 40; // 40px gap

  let fontSize = 36;
  ctx.font = `${fontSize}px "Google Sans Mono", monospace`;

  // Shrink if repo name is huge
  while (ctx.measureText(repo).width > maxRepoWidth && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `${fontSize}px "Google Sans Mono", monospace`;
  }

  ctx.textAlign = 'left';
  ctx.fillText(repo, padding, CONFIG.layout.headerY);
}

function drawBody(ctx: any, text: string) {
  ctx.font = CONFIG.fonts.body;
  ctx.textAlign = 'left';

  const maxWidth = CONFIG.width - (CONFIG.padding * 2);
  const lines = calculateWrappedLines(ctx, text, maxWidth);

  let y = CONFIG.layout.bodyY;
  for (const line of lines) {
    // Stop if we encroach on the footer area
    if (y > CONFIG.layout.footerY - 40) break;

    ctx.fillText(line, CONFIG.padding, y);
    y += CONFIG.layout.bodyLineHeight;
  }
}

function drawStats(ctx: any, files: FileStat[]) {
  ctx.font = CONFIG.fonts.stats;
  let y = CONFIG.layout.footerY;

  const visibleFiles = files.slice(0, 5);
  const hiddenCount = files.length - visibleFiles.length;

  for (const file of visibleFiles) {
    // Filename (Truncated)
    ctx.textAlign = 'left';
    ctx.fillText(truncateMiddle(file.path, 28), CONFIG.padding, y);

    // Graph
    ctx.textAlign = 'right';
    ctx.fillText(file.graph, CONFIG.width - CONFIG.padding, y);

    y += CONFIG.layout.footerLineHeight;
  }

  if (hiddenCount > 0) {
    ctx.textAlign = 'center';
    ctx.font = `italic 32px "Google Sans", sans-serif`;
    ctx.fillText(`+ ${hiddenCount} more files...`, CONFIG.width / 2, y + 20);
  }
}
