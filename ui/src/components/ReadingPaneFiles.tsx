import { useState } from 'react';
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

interface ReadingPaneFilesProps {
  files: FileStatRowProps[];
  unidiffPatch?: string;
  onFileClick?: (filePath: string) => void;
}

export function ReadingPaneFiles({ files, unidiffPatch, onFileClick }: ReadingPaneFilesProps) {
  const [showDiff, setShowDiff] = useState(false);

  if (files.length === 0) return null;

  return (
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
            onClick={() => setShowDiff((d) => !d)}
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
                          <span className="whitespace-pre">
                            {` ${line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} `}
                            {line.content}
                          </span>
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
  );
}
