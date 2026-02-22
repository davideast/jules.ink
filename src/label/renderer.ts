import { createCanvas, CanvasRenderingContext2D } from '@napi-rs/canvas';
import { CONFIG } from './layout.js';
import { getTemplate } from './assets.js';
import { calculateWrappedSegments, parseMarkdownSegments, truncateMiddle, TextSegment } from './text.js';

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

  const template = await getTemplate();
  if (template) {
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

function drawHeader(ctx: CanvasRenderingContext2D, repo: string, sessionId: string) {
  const { width, padding } = CONFIG;
  ctx.font = CONFIG.fonts.header;
  ctx.textAlign = 'right';
  ctx.fillText(sessionId, width - padding, CONFIG.layout.headerY);

  const sessionWidth = ctx.measureText(sessionId).width;
  const maxRepoWidth = width - (padding * 2) - sessionWidth - 40;

  let fontSize = 36;
  ctx.font = `${fontSize}px "LabelMono", monospace`;

  while (ctx.measureText(repo).width > maxRepoWidth && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `${fontSize}px "LabelMono", monospace`;
  }

  ctx.textAlign = 'left';
  ctx.fillText(repo, padding, CONFIG.layout.headerY);
}

function drawBodyAnchored(ctx: CanvasRenderingContext2D, text: string, fixedY: number, maxHeight: number) {
  const maxWidth = CONFIG.width - (CONFIG.padding * 2);

  // 1. Parse raw text into typed segments
  const allSegments = parseMarkdownSegments(text);

  // Constraints
  let fontSize = 80;
  const minFontSize = 38;
  const lineHeightMultiplier = 1.4;

  let wrappedLines: TextSegment[][] = [];
  let lineHeight = 0;
  let totalTextHeight = 0;
  let normalFontStr = '';
  let codeFontStr = '';

  // 2. Shrink Loop (Now uses segment wrapper)
  do {
    normalFontStr = `${fontSize}px "LabelSans"`;
    // Use slightly smaller font for mono so it doesn't overpower the text
    codeFontStr = `${fontSize - 4}px "LabelMono", monospace`;

    // Use new wrapper that understands mixed fonts
    wrappedLines = calculateWrappedSegments(ctx, allSegments, maxWidth, normalFontStr, codeFontStr);

    lineHeight = Math.floor(fontSize * lineHeightMultiplier);
    totalTextHeight = wrappedLines.length * lineHeight;

    if (totalTextHeight > maxHeight) {
      fontSize -= 4;
    } else {
      break;
    }
  } while (fontSize >= minFontSize);

  // (Truncation logic omitted for brevity, but would need updating for segments)

  // 3. Drawing Phase
  ctx.textAlign = 'left';
  ctx.fillStyle = 'black';

  let currentY = fixedY;

  // Iterate over each line
  for (const lineSegments of wrappedLines) {
    let currentX = CONFIG.padding;

    // Iterate over segments within the line
    for (const segment of lineSegments) {
      if (segment.isCode) {
        // --- DRAW CODE SPAN ---
        ctx.font = codeFontStr;
        // Recalculate width just to be safe for drawing
        const metric = ctx.measureText(segment.text);
        const textWidth = metric.width;
        const boxWidth = textWidth + 12; // 6px padding each side
        // Calculate box height relative to font size
        const boxHeight = fontSize * 1.1;
        // Offset y up slightly to center text vertically in box
        const boxYOffset = fontSize * 0.9;

        // Draw Background Box
        ctx.fillStyle = '#e0e0e0'; // Light gray
        // Note: roundRect requires recent canvas version or polyfill
        if (ctx.roundRect) {
          ctx.beginPath();
          // Adjust X and Y to frame the text
          ctx.roundRect(currentX - 2, currentY + fontSize - boxYOffset, boxWidth, boxHeight, 8);
          ctx.fill();
        } else {
          // Fallback for older environments
          ctx.fillRect(currentX - 2, currentY + fontSize - boxYOffset, boxWidth, boxHeight);
        }

        // Draw Text on top
        ctx.fillStyle = '#000000';
        // Draw text with padding offset
        ctx.fillText(segment.text, currentX + 4, currentY + fontSize);
        // Advance X cursor including padding
        currentX += boxWidth - 4;

      } else {
        // --- DRAW NORMAL TEXT ---
        ctx.font = normalFontStr;
        ctx.fillStyle = 'black';
        ctx.fillText(segment.text, currentX, currentY + fontSize);
        // Advance X cursor based on pre-calculated width from wrapper
        currentX += segment.width || ctx.measureText(segment.text).width;
      }
    }
    // Move to next line
    currentY += lineHeight;
  }
}

function drawStatsFixed(ctx: CanvasRenderingContext2D, files: FileStat[], fixedY: number) {
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
    ctx.font = `italic 32px "LabelSans", sans-serif`;
    ctx.fillText(`+ ${hiddenCount} more files...`, CONFIG.width / 2, currentY + 20);
  }
}
