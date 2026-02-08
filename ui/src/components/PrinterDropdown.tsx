export interface PrinterOption {
  name: string;
  online: boolean;
}

export interface PrinterDropdownProps {
  printers: PrinterOption[];
  selectedPrinter: string | null;
  onSelectPrinter?: (name: string | null) => void;
  onScan?: () => void;
}

export function PrinterDropdown({
  printers,
  selectedPrinter,
  onSelectPrinter,
  onScan,
}: PrinterDropdownProps) {
  return (
    <div className="w-[260px] bg-[#1e1e24] border border-[#2a2a32] shadow-2xl rounded-lg overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-[#2a2a32]">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#72728a]">Printer</h3>
      </div>
      <div className="flex flex-col py-1">
        {printers.map((printer) => (
          <label
            key={printer.name}
            className="flex items-center px-3 py-2 hover:bg-[#2a2a32] cursor-pointer group gap-3"
          >
            <input
              checked={selectedPrinter === printer.name}
              className="hidden peer"
              name="printer"
              type="radio"
              onChange={() => onSelectPrinter?.(printer.name)}
            />
            <div className="w-4 h-4 rounded-full border border-[#72728a] flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-soft-white">{printer.name}</span>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    printer.online ? 'bg-primary' : 'bg-[#72728a]'
                  }`}
                />
                <span className="text-[10px] text-[#72728a]">
                  {printer.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </label>
        ))}
        <label className="flex items-center px-3 py-2 hover:bg-[#2a2a32] cursor-pointer group gap-3">
          <input
            checked={selectedPrinter === null}
            className="hidden peer"
            name="printer"
            type="radio"
            onChange={() => onSelectPrinter?.(null)}
          />
          <div className="w-4 h-4 rounded-full border border-[#72728a] flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
          <span className="text-[13px] italic text-[#72728a]">No printer — save to disk</span>
        </label>
      </div>
      <div className="border-t border-[#2a2a32] p-1">
        <button
          className="w-full flex items-center justify-center gap-2 py-2 text-[11px] text-[#72728a] hover:text-soft-white hover:bg-[#2a2a32] rounded transition-colors"
          onClick={onScan}
        >
          <span className="material-symbols-outlined text-[14px]">refresh</span>
          Scan for printers
        </button>
      </div>
    </div>
  );
}
