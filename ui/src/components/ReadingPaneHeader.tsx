import { VersionSwitcher, type VersionEntry } from './VersionSwitcher';

interface ReadingPaneHeaderProps {
  toneName: string;
  modelName?: string;
  versionCount: number;
  versions: Record<string, VersionEntry>;
  onVersionSelect: (tone: string, model: string) => void;
  onRegenerate?: () => void;
  regenerateLabel?: string;
}

export function ReadingPaneHeader({
  toneName,
  modelName,
  versionCount,
  versions,
  onVersionSelect,
  onRegenerate,
  regenerateLabel,
}: ReadingPaneHeaderProps) {
  return (
    <div className="flex gap-2 mb-[32px] items-center">
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[#16161a] text-[10px] font-bold tracking-widest bg-[#fbfbfe] uppercase">
        {toneName}
      </span>
      {modelName ? (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[#72728a] text-[10px] font-bold tracking-widest border border-[#2a2a35] uppercase">
          {modelName}
        </span>
      ) : null}
      <VersionSwitcher
        versionCount={versionCount}
        versions={versions}
        toneName={toneName}
        modelName={modelName}
        onVersionSelect={onVersionSelect}
      />
      {onRegenerate ? (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#fbfbfe]/20 bg-transparent text-[#fbfbfe] hover:bg-[#fbfbfe] hover:text-[#16161a] transition-all text-[10px] font-bold tracking-widest uppercase ml-auto"
          onClick={onRegenerate}
        >
          <span className="material-symbols-outlined text-[14px]">
            {regenerateLabel === 'Switch' ? 'swap_horiz' : 'refresh'}
          </span>
          {regenerateLabel || 'Regenerate'}
        </button>
      ) : null}
    </div>
  );
}
