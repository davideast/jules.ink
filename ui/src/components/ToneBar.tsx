import { ToneChip } from './ToneChip';

export interface ToneBarProps {
  tones: string[];
  selectedTone: string | null;
  onSelectTone?: (tone: string) => void;
  onAddTone?: () => void;
  addButtonActive?: boolean;
  disabled?: boolean;
}

export function ToneBar({
  tones,
  selectedTone,
  onSelectTone,
  onAddTone,
  addButtonActive = false,
  disabled = false,
}: ToneBarProps) {
  return (
    <div className="shrink-0 flex justify-center py-6 w-full z-10 border-b border-[#2a2a35]/50 bg-[#16161a]">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar max-w-full px-4 no-scrollbar">
        {tones.map((tone) => (
          <ToneChip
            key={tone}
            label={tone}
            selected={tone === selectedTone}
            disabled={disabled}
            onClick={() => !disabled && onSelectTone?.(tone)}
          />
        ))}
        <button
          disabled={disabled}
          className={
            disabled
              ? 'w-8 h-8 flex items-center justify-center rounded-full border border-dashed border-[#2a2a32] text-slate-gray transition-colors shrink-0 opacity-50 cursor-not-allowed'
              : addButtonActive
              ? 'w-8 h-8 flex items-center justify-center rounded-full bg-[#fbfbfe] text-[#16161a] shadow-sm transition-colors shrink-0'
              : 'w-8 h-8 flex items-center justify-center rounded-full border border-dashed border-[#2a2a32] text-slate-gray hover:text-soft-white hover:border-slate-gray transition-colors shrink-0'
          }
          onClick={disabled ? undefined : onAddTone}
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>
    </div>
  );
}
