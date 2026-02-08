export interface ToneChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export function ToneChip({ label, selected = false, onClick }: ToneChipProps) {
  return (
    <button
      className={
        selected
          ? 'px-4 py-1.5 rounded-full text-sm font-medium bg-[#fbfbfe] text-[#16161a] shadow-sm transition-colors whitespace-nowrap'
          : 'px-4 py-1.5 rounded-full text-sm font-medium bg-transparent border border-[#2a2a32] text-slate-gray hover:text-soft-white hover:border-slate-gray transition-colors whitespace-nowrap'
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}
