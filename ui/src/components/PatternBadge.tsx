interface PatternBadgeProps {
  label: string;
}

export function PatternBadge({ label }: PatternBadgeProps) {
  return (
    <span className="px-2.5 py-1 rounded bg-[#2a2a35] text-[#fbfbfe] text-[10px] font-bold uppercase tracking-wide border border-[#3f3f4e]">
      {label}
    </span>
  );
}
