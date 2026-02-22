interface ReadingPaneShareProps {
  onShare?: () => void;
}

export function ReadingPaneShare({ onShare }: ReadingPaneShareProps) {
  if (!onShare) return null;

  return (
    <div className="mt-8 flex justify-center w-full">
      <button
        className="flex items-center gap-2 px-8 py-2 rounded-full border border-[#fbfbfe]/20 bg-transparent text-[#fbfbfe] hover:bg-[#fbfbfe] hover:text-[#16161a] transition-all text-[14px] font-medium w-fit"
        onClick={onShare}
      >
        <span className="material-symbols-outlined text-[18px]">share</span>
        Share
      </button>
    </div>
  );
}
