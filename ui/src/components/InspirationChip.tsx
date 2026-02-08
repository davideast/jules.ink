export interface InspirationChipProps {
  label: string;
  onClick?: () => void;
}

export function InspirationChip({ label, onClick }: InspirationChipProps) {
  return (
    <button
      className="px-3 py-1.5 rounded-full border border-dashed border-[#2a2a32] text-[#72728a] text-xs hover:text-soft-white hover:border-slate-gray transition-colors"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
