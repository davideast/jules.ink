import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileAnalysisHeader } from './FileAnalysisHeader';
import type { FileAnalysisTab } from './FileAnalysisHeader';
import { PatternBadge } from './PatternBadge';
import { TradeoffGrid } from './TradeoffGrid';
import { RelatedFileLink } from './RelatedFileLink';
import { extractFileDiff } from '../lib/diff-utils';
import { tokenizeLine } from '../lib/syntax-highlight';
import type { DiffLine } from '../lib/diff-utils';

/**
 * Post-processes LLM markdown to ensure proper list formatting.
 * Converts inline `* ` bullets to `\n- ` and ensures bold section
 * headers get blank lines before them.
 */
function fixMarkdownLists(text: string): string {
  let result = text;
  const codePlaceholders: string[] = [];
  result = result.replace(/`[^`]+`/g, (match) => {
    codePlaceholders.push(match);
    return `\x01C${codePlaceholders.length - 1}\x01`;
  });
  const boldPlaceholders: string[] = [];
  result = result.replace(/\*\*[^*]+\*\*/g, (match) => {
    boldPlaceholders.push(match);
    return `\x01B${boldPlaceholders.length - 1}\x01`;
  });
  result = result.replace(/\s*\*\s+/g, '\n- ');
  result = result.replace(/\x01B(\d+)\x01/g, (_, idx) => boldPlaceholders[parseInt(idx)]);
  result = result.replace(/([^\n])\n(\*\*[A-Za-z])/g, '$1\n\n$2');
  result = result.replace(/(\*\*[^*]+\*\*)\n{3,}/g, '$1\n');
  result = result.replace(/\x01C(\d+)\x01/g, (_, idx) => codePlaceholders[parseInt(idx)]);
  return result.trim();
}

export interface FileAnalysisData {
  filePath: string;
  additions: number;
  deletions: number;
  commitSummary: string;
  explanation: string;
  patterns: string[];
  tradeoffs: string[];
  relatedFiles: string[];
  unidiffPatch?: string;
}

interface FileAnalysisViewProps {
  data: FileAnalysisData;
  onBack: () => void;
  onFileClick: (filePath: string) => void;
}

const DIFF_LINE_BG: Record<DiffLine['type'], string> = {
  add: 'bg-green-500/10',
  remove: 'bg-red-500/10',
  context: '',
  header: 'bg-[#1e1e24]',
};

const DIFF_LINE_TEXT: Record<DiffLine['type'], string> = {
  add: 'text-green-400',
  remove: 'text-red-400',
  context: 'text-[#a0a0b0]',
  header: 'text-[#72728a]',
};

function SyntaxLine({ content }: { content: string }) {
  const tokens = tokenizeLine(content);
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} style={t.color ? { color: t.color } : undefined} className={t.italic ? 'italic' : undefined}>
          {t.text}
        </span>
      ))}
    </>
  );
}

export function FileAnalysisView({ data, onBack, onFileClick }: FileAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<FileAnalysisTab>('analysis');
  const [diffHighlight, setDiffHighlight] = useState(true);

  const diffLines = data.unidiffPatch
    ? extractFileDiff(data.unidiffPatch, data.filePath)
    : [];

  return (
    <div className="flex flex-col h-full">
      <FileAnalysisHeader
        filePath={data.filePath}
        additions={data.additions}
        deletions={data.deletions}
        commitMessage={data.commitSummary}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={onBack}
      />

      {activeTab === 'analysis' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 pb-12">
          {/* Explanation */}
          <div className="mb-8">
            <h2 className="text-[18px] font-semibold text-soft-white mb-4">
              {data.patterns[0] ?? 'Code Analysis'}
            </h2>
            <ReactMarkdown
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
              {fixMarkdownLists(data.explanation)}
            </ReactMarkdown>
          </div>

          {/* Patterns */}
          {data.patterns.length > 0 ? (
            <div className="mb-8">
              <h3 className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-3">
                Patterns Identified
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.patterns.map((p) => (
                  <PatternBadge key={p} label={p} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Trade-offs */}
          {data.tradeoffs.length > 0 ? (
            <div className="mb-8">
              <h3 className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-3">
                Trade-offs
              </h3>
              <TradeoffGrid
                benefits={data.tradeoffs.filter((_, i) => i % 2 === 0)}
                costs={data.tradeoffs.filter((_, i) => i % 2 === 1)}
              />
            </div>
          ) : null}

          {/* Related Files */}
          {data.relatedFiles.length > 0 ? (
            <div>
              <h3 className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-3">
                Related Files
              </h3>
              <div className="flex flex-col gap-1">
                {data.relatedFiles.map((f) => (
                  <RelatedFileLink key={f} filePath={f} onClick={() => onFileClick(f)} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : activeTab === 'diff' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {data.unidiffPatch ? (
            <>
              <div className="flex items-center justify-end px-4 py-2 border-b border-[#2a2a35] shrink-0">
                <button
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${
                    diffHighlight
                      ? 'bg-[#fbfbfe] text-[#16161a]'
                      : 'border border-[#2a2a35] text-[#72728a] hover:border-[#fbfbfe]/30 hover:text-[#a0a0b0]'
                  }`}
                  onClick={() => setDiffHighlight(d => !d)}
                >
                  <span className="material-symbols-outlined text-[12px]">difference</span>
                  Diff
                </button>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar bg-[#16161a]">
                {diffLines.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-[#72728a] text-sm">
                    No diff available for this file
                  </div>
                ) : (
                  <div className="font-mono text-[13px] leading-[20px] min-w-fit">
                    {diffLines.map((line, i) => (
                      <div
                        key={i}
                        className={`flex pl-2 pr-3 ${
                          diffHighlight ? `${DIFF_LINE_BG[line.type]} ${DIFF_LINE_TEXT[line.type]}` : ''
                        } ${line.type === 'header' ? 'bg-[#1e1e24] text-[#72728a]' : ''}`}
                      >
                        {line.type === 'header' ? (
                          <span className="py-px">{line.content}</span>
                        ) : (
                          <>
                            <span className="w-[3ch] shrink-0 text-right text-[#72728a]/50 select-none">
                              {line.newLineNumber ?? line.oldLineNumber ?? ''}
                            </span>
                            {diffHighlight ? (
                              <span className="whitespace-pre">
                                {` ${line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} `}{line.content}
                              </span>
                            ) : (
                              <span className="whitespace-pre">
                                {'  '}<SyntaxLine content={line.content} />
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#72728a] text-sm">
              No diff data available
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#72728a] text-sm">
          History coming soon
        </div>
      )}
    </div>
  );
}
