import { FileStatRow } from './FileStatRow';
import type { FileStatRowProps } from './FileStatRow';

export interface ReadingPaneProps {
  toneName: string;
  summary: string;
  files?: FileStatRowProps[];
  onShare?: () => void;
}

export function ReadingPane({ toneName, summary, files = [], onShare }: ReadingPaneProps) {
  return (
    <div className="flex-1 p-[40px] overflow-y-auto custom-scrollbar">
      <div className="flex flex-col h-full">
        <div className="flex mb-[28px]">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[#16161a] text-[10px] font-bold tracking-widest bg-[#fbfbfe] uppercase">
            {toneName}
          </span>
        </div>
        <div className="mb-[28px]">
          <p className="text-[22px] leading-[1.6] text-[#fbfbfe] font-light">{summary}</p>
        </div>
        {files.length > 0 ? (
          <>
            <div className="h-px bg-[#2a2a32] w-full mb-[28px]" />
            <div className="flex flex-col gap-3 mb-8">
              {files.map((file) => (
                <FileStatRow key={file.path} {...file} />
              ))}
            </div>
          </>
        ) : null}
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
