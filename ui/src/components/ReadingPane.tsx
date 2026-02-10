import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileStatRow } from './FileStatRow';
import type { FileStatRowProps } from './FileStatRow';
import { extractFileDiff } from '../lib/diff-utils';
import type { DiffLine } from '../lib/diff-utils';

const DIFF_LINE_STYLES: Record<DiffLine['type'], string> = {
  add: 'bg-green-500/10 text-green-400',
  remove: 'bg-red-500/10 text-red-400',
  context: 'text-[#a0a0b0]',
  header: 'bg-[#1e1e24] text-[#72728a]',
};

export interface ReadingPaneProps {
  toneName: string;
  modelName?: string;
  summary: string;
  files?: FileStatRowProps[];
  onShare?: () => void;
  status?: string;
  codeReview?: string;
  onFileClick?: (filePath: string) => void;
  onRegenerate?: () => void;
  regenerateLabel?: string;
  versionCount?: number;
  unidiffPatch?: string;
}

/**
 * Splits text into paragraph-sized chunks (~2 sentences each) for
 * ReactMarkdown paragraph rendering. Shields backtick content so
 * periods inside filenames don't break sentence detection.
 */
function addParagraphBreaks(text: string): string {
  const placeholders: string[] = [];
  const shielded = text.replace(/`[^`]+`/g, (match) => {
    placeholders.push(match);
    return `\x00${placeholders.length - 1}\x00`;
  });

  const sentences = shielded.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!sentences) return text;

  const cleaned = sentences.map(s => s.trim()).filter(Boolean);
  const groups: string[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    groups.push(cleaned.slice(i, i + 2).join(' '));
  }

  const restored = groups.map(g =>
    g.replace(/\x00(\d+)\x00/g, (_, idx) => placeholders[parseInt(idx)])
  );

  return restored.join('\n\n');
}

/**
 * Post-processes code review LLM output to ensure proper markdown list formatting.
 * - Converts inline `* ` bullets to `\n- `
 * - Ensures `**Bold:**` section headers have blank line before them
 * - Idempotent — properly formatted markdown passes through unchanged
 */
function fixMarkdownLists(text: string): string {
  let result = text;

  // 1. Shield backtick code spans → placeholders
  const codePlaceholders: string[] = [];
  result = result.replace(/`[^`]+`/g, (match) => {
    codePlaceholders.push(match);
    return `\x01C${codePlaceholders.length - 1}\x01`;
  });

  // 2. Shield bold markers (**...**) → placeholders
  const boldPlaceholders: string[] = [];
  result = result.replace(/\*\*[^*]+\*\*/g, (match) => {
    boldPlaceholders.push(match);
    return `\x01B${boldPlaceholders.length - 1}\x01`;
  });

  // 3. Every remaining `* ` is a bullet → convert to `\n- `
  result = result.replace(/\s*\*\s+/g, '\n- ');

  // 4. Restore bold placeholders
  result = result.replace(/\x01B(\d+)\x01/g, (_, idx) => boldPlaceholders[parseInt(idx)]);

  // 5. Ensure bold section headers get blank line before them (except at start)
  result = result.replace(/([^\n])\n(\*\*[A-Za-z])/g, '$1\n\n$2');
  // Ensure bullets after headers have no extra blank lines
  result = result.replace(/(\*\*[^*]+\*\*)\n{3,}/g, '$1\n');

  // 6. Restore code placeholders
  result = result.replace(/\x01C(\d+)\x01/g, (_, idx) => codePlaceholders[parseInt(idx)]);

  return result.trim();
}

export function ReadingPane({ toneName, modelName, summary, files = [], onShare, status, codeReview, onFileClick, onRegenerate, regenerateLabel, versionCount, unidiffPatch }: ReadingPaneProps) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div className="flex-1 p-[40px] overflow-y-auto custom-scrollbar">
      <div className="flex flex-col h-full max-w-[640px]">
        {/* Badges */}
        <div className="flex gap-2 mb-[32px] items-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[#16161a] text-[10px] font-bold tracking-widest bg-[#fbfbfe] uppercase">
            {toneName}
          </span>
          {modelName ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[#72728a] text-[10px] font-bold tracking-widest border border-[#2a2a35] uppercase">
              {modelName}
            </span>
          ) : null}
          {versionCount && versionCount > 1 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[#72728a] text-[10px] font-medium border border-[#2a2a35]">
              {versionCount} versions
            </span>
          ) : null}
          {onRegenerate ? (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#fbfbfe]/20 bg-transparent text-[#fbfbfe] hover:bg-[#fbfbfe] hover:text-[#16161a] transition-all text-[10px] font-bold tracking-widest uppercase ml-auto"
              onClick={onRegenerate}
            >
              <span className="material-symbols-outlined text-[14px]">{regenerateLabel === 'Switch' ? 'swap_horiz' : 'refresh'}</span>
              {regenerateLabel || 'Regenerate'}
            </button>
          ) : null}
        </div>

        {/* Summary */}
        <div className="mb-[32px]">
          <ReactMarkdown
            disallowedElements={['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'img', 'blockquote', 'pre']}
            unwrapDisallowed={true}
            components={{
              p: ({ node, ...props }) => (
                <p className="text-[22px] leading-[1.7] text-[#fbfbfe] font-light mb-4" {...props} />
              ),
              code: ({ node, ...props }) => (
                <code className="bg-[#2a2a35] px-1.5 py-0.5 rounded text-[18px] font-mono" {...props} />
              ),
            }}
          >
            {addParagraphBreaks(summary)}
          </ReactMarkdown>
        </div>

        {/* Divider */}
        {status ? <div className="h-px bg-[#2a2a35] w-full mb-[32px]" /> : null}

        {/* Current Status */}
        {status ? (
          <div className="mb-[32px]">
            <span className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-3 block">
              Current Status
            </span>
            <ReactMarkdown
              disallowedElements={['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'blockquote', 'pre']}
              unwrapDisallowed={true}
              components={{
                p: ({ node, ...props }) => (
                  <p className="text-[15px] leading-[1.7] text-[#a0a0b0] font-light mb-4" {...props} />
                ),
                code: ({ node, ...props }) => (
                  <code className="bg-[#2a2a35] px-1.5 py-0.5 rounded text-[13px] font-mono text-[#c0c0d0]" {...props} />
                ),
              }}
            >
              {addParagraphBreaks(status)}
            </ReactMarkdown>
          </div>
        ) : null}

        {/* Divider */}
        {codeReview ? <div className="h-px bg-[#2a2a35] w-full mb-[32px]" /> : null}

        {/* Code Review */}
        {codeReview ? (
          <div className="mb-[32px]">
            <span className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-3 block">
              Code Review
            </span>
            <ReactMarkdown
              disallowedElements={['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'blockquote', 'pre']}
              unwrapDisallowed={true}
              components={{
                p: ({ node, ...props }) => (
                  <p className="text-[14px] leading-[1.7] text-[#a0a0b0] font-light mb-3" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="text-[#d0d0e0] font-semibold" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="text-[14px] leading-[1.7] text-[#a0a0b0] font-light list-disc pl-5 space-y-1.5 mb-3" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="text-[14px] leading-[1.7] text-[#a0a0b0] font-light list-decimal pl-5 space-y-1.5 mb-3" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="text-[14px] leading-[1.7] text-[#a0a0b0] font-light" {...props} />
                ),
                code: ({ node, ...props }) => (
                  <code className="bg-[#2a2a35] px-1.5 py-0.5 rounded text-[12px] font-mono text-[#c0c0d0]" {...props} />
                ),
              }}
            >
              {fixMarkdownLists(codeReview)}
            </ReactMarkdown>
          </div>
        ) : null}

        {/* Divider + File stats / Diff toggle */}
        {files.length > 0 ? (
          <>
            <div className="h-px bg-[#2a2a35] w-full mb-[24px]" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase">
                Files
              </span>
              {unidiffPatch ? (
                <button
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${
                    showDiff
                      ? 'bg-[#fbfbfe] text-[#16161a]'
                      : 'border border-[#2a2a35] text-[#72728a] hover:border-[#fbfbfe]/30 hover:text-[#a0a0b0]'
                  }`}
                  onClick={() => setShowDiff(d => !d)}
                >
                  <span className="material-symbols-outlined text-[12px]">code</span>
                  Diff
                </button>
              ) : null}
            </div>
            {showDiff && unidiffPatch ? (
              <div className="mb-8 rounded-lg overflow-hidden border border-[#2a2a35]">
                <div className="font-mono text-[12px] leading-[18px] max-h-[400px] overflow-y-auto custom-scrollbar">
                  {files.map((file) => {
                    const lines = extractFileDiff(unidiffPatch, file.path);
                    if (lines.length === 0) return null;
                    return (
                      <div key={file.path}>
                        <div className="sticky top-0 bg-[#1e1e24] border-b border-[#2a2a35] px-3 py-1.5 text-[11px] text-[#a0a0b0] font-mono z-10">
                          {file.path}
                        </div>
                        {lines.map((line, i) => (
                          <div key={i} className={`flex ${DIFF_LINE_STYLES[line.type]} pl-2 pr-3`}>
                            {line.type === 'header' ? (
                              <span className="py-px text-[11px]">{line.content}</span>
                            ) : (
                              <>
                                <span className="w-[3ch] shrink-0 text-right text-[#72728a]/50 select-none">
                                  {line.newLineNumber ?? line.oldLineNumber ?? ''}
                                </span>
                                <span className="whitespace-pre">{` ${line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} `}{line.content}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-8">
                {files.map((file) => (
                  <FileStatRow key={file.path} {...file} onClick={() => onFileClick?.(file.path)} />
                ))}
              </div>
            )}
          </>
        ) : null}

        {/* Share button */}
        <div className="mt-8 flex justify-center w-full">
          <button
            className="flex items-center gap-2 px-8 py-2 rounded-full border border-[#fbfbfe]/20 bg-transparent text-[#fbfbfe] hover:bg-[#fbfbfe] hover:text-[#16161a] transition-all text-[14px] font-medium w-fit"
            onClick={onShare}
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
