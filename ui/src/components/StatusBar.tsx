export interface StatusBarProps {
  printerName: string | null;
  printerOnline?: boolean;
  labelCount?: number;
  printedCount?: number;
  onPrinterClick?: () => void;
}

export function StatusBar({
  printerName,
  printerOnline = false,
  labelCount = 0,
  printedCount = 0,
  onPrinterClick,
}: StatusBarProps) {
  return (
    <footer className="h-[32px] bg-[#1e1e24] border-t border-[#2a2a32] shrink-0 flex items-center justify-between px-3 z-50 relative">
      <button
        className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-[#2a2a32] transition-colors group"
        onClick={onPrinterClick}
      >
        <span className="text-[12px] font-medium text-soft-white">
          {printerName ?? 'No printer'}
        </span>
        <span className="text-[12px] text-[#72728a]">•</span>
        <div className="flex items-center gap-1.5">
          {printerName ? (
            <>
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  printerOnline
                    ? 'bg-primary shadow-[0_0_4px_rgba(25,204,97,0.5)]'
                    : 'bg-[#72728a]'
                }`}
              />
              <span className="text-[11px] text-[#72728a] group-hover:text-soft-white transition-colors">
                {printerOnline ? 'Online' : 'Offline'}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-[#72728a] group-hover:text-soft-white transition-colors">
              Save to disk
            </span>
          )}
        </div>
        <span className="material-symbols-outlined text-[14px] text-[#72728a]">expand_more</span>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-[#72728a]">
          {labelCount} labels · {printedCount} printed
        </span>
      </div>
    </footer>
  );
}
