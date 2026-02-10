import { useState } from 'react';
import { extractFileDiff } from '../lib/diff-utils';
import { tokenizeLine } from '../lib/syntax-highlight';
import type { DiffLine } from '../lib/diff-utils';

interface DiffViewProps {
  filePath: string;
  unidiffPatch: string;
  onBack: () => void;
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

export function DiffView({ filePath, unidiffPatch, onBack }: DiffViewProps) {
  const [diffHighlight, setDiffHighlight] = useState(true);
  const lines = extractFileDiff(unidiffPatch, filePath);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#16161a] border-b border-[#2a2a35] shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[#72728a] hover:text-[#fbfbfe] transition-colors text-[13px]"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back
        </button>
        <span className="text-[12px] font-mono text-[#a0a0b0] truncate">{filePath}</span>
        <button
          className={`ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${
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

      {/* Code content */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-[#16161a]">
        {lines.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#72728a] text-sm">
            No diff available for this file
          </div>
        ) : (
          <div className="font-mono text-[13px] leading-[20px] min-w-fit">
            {lines.map((line, i) => (
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
    </div>
  );
}
