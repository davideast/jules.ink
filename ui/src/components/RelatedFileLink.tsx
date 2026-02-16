interface RelatedFileLinkProps {
  filePath: string;
  onClick: () => void;
}

export function RelatedFileLink({ filePath, onClick }: RelatedFileLinkProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 group text-left w-full hover:bg-[#2a2a35]/50 -mx-2 px-2 py-1.5 rounded transition-colors"
    >
      <span className="material-symbols-outlined text-[14px] text-[#72728a] group-hover:text-soft-white">
        description
      </span>
      <span className="text-[12px] font-mono text-[#d0d0d5] group-hover:text-soft-white">
        {filePath}
      </span>
      <span className="material-symbols-outlined text-[12px] text-[#72728a] ml-auto opacity-0 group-hover:opacity-100">
        arrow_forward
      </span>
    </button>
  );
}
