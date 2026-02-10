import { KeyFileCard } from './KeyFileCard';
import { FileTree } from './FileTree';
import type { FileTreeNode } from './FileTree';

export interface KeyFile {
  path: string;
  additions: number;
  deletions: number;
  description: string;
}

export interface Risk {
  label: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AnalysisPaneProps {
  summary?: string;
  totalFiles?: number;
  totalAdditions?: number;
  totalDeletions?: number;
  patterns?: string[];
  keyFiles?: KeyFile[];
  risks?: Risk[];
  fileTree?: FileTreeNode[];
  onFileClick?: (path: string) => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export function AnalysisPane({
  summary,
  totalFiles = 0,
  totalAdditions = 0,
  totalDeletions = 0,
  patterns = [],
  keyFiles = [],
  risks = [],
  fileTree = [],
  onFileClick,
}: AnalysisPaneProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="p-8 flex flex-col gap-8 max-w-[640px]">
        {/* Summary */}
        {summary ? (
          <p className="text-[15px] leading-relaxed text-[#a0a0b0]">
            {summary}
          </p>
        ) : (
          <p className="text-[15px] leading-relaxed text-[#72728a] italic">
            Analysis will appear once the session completes.
          </p>
        )}

        {/* Stats row */}
        {totalFiles > 0 ? (
          <div className="flex items-center gap-6 text-[12px] font-mono">
            <span className="text-[#72728a]">
              {totalFiles} file{totalFiles !== 1 ? 's' : ''}
            </span>
            <span className="text-primary">+{totalAdditions}</span>
            <span className="text-red-400">-{totalDeletions}</span>
          </div>
        ) : null}

        {/* Patterns */}
        {patterns.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {patterns.map(p => (
              <span
                key={p}
                className="px-2 py-0.5 rounded-full bg-[#16161a] border border-[#2a2a35] text-[10px] text-[#72728a]"
              >
                {p}
              </span>
            ))}
          </div>
        ) : null}

        {/* Key Files */}
        {keyFiles.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase">
              Key Files
            </span>
            <div className="grid grid-cols-1 gap-2">
              {keyFiles.map(f => (
                <KeyFileCard
                  key={f.path}
                  path={f.path}
                  additions={f.additions}
                  deletions={f.deletions}
                  description={f.description}
                  onClick={() => onFileClick?.(f.path)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* All Files */}
        {fileTree.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase">
              All Files
            </span>
            <FileTree nodes={fileTree} onFileClick={onFileClick} />
          </div>
        ) : null}

        {/* Key Risks */}
        {risks.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase">
              Key Risks
            </span>
            <div className="flex flex-col gap-2">
              {risks.map(r => (
                <div
                  key={r.label}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-[12px] ${SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.low}`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {r.severity === 'high' ? 'error' : r.severity === 'medium' ? 'warning' : 'info'}
                  </span>
                  {r.label}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
