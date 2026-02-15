import type { ReactNode } from 'react';

function renderTextWithCode(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-[#2a2a35] px-1 py-0.5 rounded text-[10px] font-mono text-[#c0c0d0]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export interface IntentCardProps {
  title: string;
  fileCount: number;
  description: string;
  onClick?: () => void;
}

export function IntentCard({ title, fileCount, description, onClick }: IntentCardProps) {
  return (
    <div
      className="bg-[#16161a] border border-[#2a2a35] rounded p-3 hover:border-[#3f3f4e] transition-all cursor-pointer flex flex-col justify-center gap-1.5"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-soft-white font-medium truncate">{renderTextWithCode(title)}</span>
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2a2a35] text-[10px] text-[#a0a0b0] font-mono">
          <span className="material-symbols-outlined text-[12px]">description</span>
          {fileCount}
        </span>
      </div>
      <p className="text-[11px] text-[#72728a] leading-tight line-clamp-2">{renderTextWithCode(description)}</p>
    </div>
  );
}
