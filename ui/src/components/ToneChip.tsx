export interface ToneChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function ToneChip({ label, selected = false, disabled = false, onClick }: ToneChipProps) {
  let className = 'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ';

  if (disabled) {
    className += 'cursor-not-allowed opacity-50 ';
    if (selected) {
      className += 'bg-[#fbfbfe] text-[#16161a] shadow-sm';
    } else {
      className += 'bg-transparent border border-[#2a2a32] text-slate-gray';
    }
  } else {
    className += 'cursor-pointer ';
    if (selected) {
      className += 'bg-[#fbfbfe] text-[#16161a] shadow-sm';
    } else {
      className += 'bg-transparent border border-[#2a2a32] text-slate-gray hover:text-soft-white hover:border-slate-gray';
    }
  }

  return (
    <button
      disabled={disabled}
      className={className}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
