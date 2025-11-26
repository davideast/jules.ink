import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import { calculateWrappedLines, truncateMiddle } from './utils.js';

// --- Font Registration ---
const FONT_DIR = path.resolve('./assets/fonts');
function registerLocalFont(filename: string, family: string) {
  const filePath = path.join(FONT_DIR, filename);
  if (fs.existsSync(filePath)) GlobalFonts.registerFromPath(filePath, family);
}
registerLocalFont('GoogleSans-Bold.ttf', 'Google Sans');
registerLocalFont('GoogleSans-Regular.ttf', 'Google Sans');
registerLocalFont('GoogleSansMono-Regular.ttf', 'Google Sans Mono');

// --- Configuration ---
const CONFIG = {
  width: 1200,
  height: 1800,
  padding: 64,

  fonts: {
    header: '36px "Google Sans Mono", monospace',
    stats: '42px "Google Sans Mono", monospace',
  },

  layout: {
    headerY: 120,

    // ANCHOR 1: Logo Bottom
    logoBottomY: 520,

    // ANCHOR 2: Body Start
    bodyGap: 24,

    // ANCHOR 3: Stats Start
    statsY: 1350,

    // NEW: The "DMZ"
    // The text body is forced to stop this many pixels BEFORE statsY.
    // Increased from implicit 40px to explicit 100px.
    minGapBetweenBodyAndStats: 100,

    footerLineHeight: 65
  }
};

export interface FileStat {
  path: string;
  additions: number;
  deletions: number;
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

  const templatePath = path.resolve('./assets/template.png');
  if (fs.existsSync(templatePath)) {
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, CONFIG.width, CONFIG.height);
  } else {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  ctx.fillStyle = 'black';

  drawHeader(ctx, data.repo, data.sessionId);

  // 1. Calculate Body Start
  const bodyStartY = CONFIG.layout.logoBottomY + CONFIG.layout.bodyGap;

  // 2. Calculate Max Height with DMZ
  // Logic: Stats Start - Start Y - The Mandatory Gap
  const maxBodyHeight = CONFIG.layout.statsY - bodyStartY - CONFIG.layout.minGapBetweenBodyAndStats;

  // 3. Draw Body
  // The text will shrink itself until it fits nicely inside this smaller box
  drawBodyAnchored(ctx, data.summary, bodyStartY, maxBodyHeight);

  // 4. Draw Stats
  if (data.files && data.files.length > 0) {
    drawStatsFixed(ctx, data.files, CONFIG.layout.statsY);
  }

  return canvas.toBuffer('image/png');
}

function drawHeader(ctx: any, repo: string, sessionId: string) {
  const { width, padding } = CONFIG;
  ctx.font = CONFIG.fonts.header;
  ctx.textAlign = 'right';
  ctx.fillText(sessionId, width - padding, CONFIG.layout.headerY);

  const sessionWidth = ctx.measureText(sessionId).width;
  const maxRepoWidth = width - (padding * 2) - sessionWidth - 40;

  let fontSize = 36;
  ctx.font = `${fontSize}px "Google Sans Mono", monospace`;

  while (ctx.measureText(repo).width > maxRepoWidth && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `${fontSize}px "Google Sans Mono", monospace`;
  }

  ctx.textAlign = 'left';
  ctx.fillText(repo, padding, CONFIG.layout.headerY);
}

function drawBodyAnchored(ctx: any, text: string, fixedY: number, maxHeight: number) {
  const maxWidth = CONFIG.width - (CONFIG.padding * 2);

  // Constraints
  let fontSize = 80;
  const minFontSize = 38;
  const lineHeightMultiplier = 1.4;

  let lines: string[] = [];
  let lineHeight = 0;
  let totalTextHeight = 0;
  let weight = 'bold';

  // Shrink Loop
  do {
    weight = fontSize > 60 ? 'bold' : 'normal';
    ctx.font = `${weight} ${fontSize}px "Google Sans"`;

    lines = calculateWrappedLines(ctx, text, maxWidth);

    lineHeight = Math.floor(fontSize * lineHeightMultiplier);
    totalTextHeight = lines.length * lineHeight;

    if (totalTextHeight > maxHeight) {
      fontSize -= 4;
    } else {
      break;
    }

  } while (fontSize >= minFontSize);

  if (totalTextHeight > maxHeight) {
    const maxLines = Math.floor(maxHeight / lineHeight);
    lines = lines.slice(0, maxLines);
    if (lines.length > 0) {
      const last = lines.length - 1;
      lines[last] = lines[last].slice(0, -3) + '...';
    }
  }

  // Draw
  ctx.textAlign = 'left';
  ctx.fillStyle = 'black';
  ctx.font = `${weight} ${fontSize}px "Google Sans"`;

  let currentY = fixedY;

  for (const line of lines) {
    ctx.fillText(line, CONFIG.padding, currentY + fontSize);
    currentY += lineHeight;
  }
}

function drawStatsFixed(ctx: any, files: FileStat[], fixedY: number) {
  ctx.font = CONFIG.fonts.stats;
  let currentY = fixedY;

  const visibleFiles = files.slice(0, 5);
  const hiddenCount = files.length - visibleFiles.length;

  for (const file of visibleFiles) {
    ctx.textAlign = 'left';
    ctx.fillText(truncateMiddle(file.path, 28), CONFIG.padding, currentY);

    const statsText = `+${file.additions} / -${file.deletions}`;
    ctx.textAlign = 'right';
    ctx.fillText(statsText, CONFIG.width - CONFIG.padding, currentY);

    currentY += CONFIG.layout.footerLineHeight;
  }

  if (hiddenCount > 0) {
    ctx.textAlign = 'center';
    ctx.font = `italic 32px "Google Sans", sans-serif`;
    ctx.fillText(`+ ${hiddenCount} more files...`, CONFIG.width / 2, currentY + 20);
  }
}
