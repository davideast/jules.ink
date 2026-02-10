export interface ToneTriggerProps {
  label: string;
  icon?: string;
  onClick?: () => void;
}

export function ToneTrigger({ label, icon = 'tune', onClick }: ToneTriggerProps) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#2a2a35] text-soft-white/80 text-[12px] font-mono hover:text-white hover:border-[#3f3f4e] transition-colors cursor-pointer"
      onClick={onClick}
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
