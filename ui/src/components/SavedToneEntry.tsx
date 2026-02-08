export interface SavedToneEntryProps {
  name: string;
  preview: string;
  onDelete?: () => void;
  onClick?: () => void;
}

export function SavedToneEntry({ name, preview, onDelete, onClick }: SavedToneEntryProps) {
  return (
    <div
      className="bg-[#16161a] border border-[#2a2a32] rounded-lg p-4 relative group hover:border-[#72728a] transition-colors cursor-pointer"
      onClick={onClick}
    >
      <button
        className="absolute top-3 right-3 text-[#72728a] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.();
        }}
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
      <div className="font-medium text-soft-white mb-1">{name}</div>
      <p className="text-sm text-[#72728a] italic line-clamp-2">{preview}</p>
    </div>
  );
}
