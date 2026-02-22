import { useState, useRef, useEffect } from 'react';
import { MODELS } from './ModelSelector';

export interface VersionEntry {
  tone: string;
  model: string;
}

export interface VersionSwitcherProps {
  versionCount: number;
  versions: Record<string, VersionEntry>;
  toneName: string;
  modelName?: string;
  onVersionSelect: (tone: string, model: string) => void;
}

export function VersionSwitcher({
  versionCount,
  versions,
  toneName,
  modelName,
  onVersionSelect,
}: VersionSwitcherProps) {
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const versionMenuRef = useRef<HTMLDivElement>(null);

  // Close version menu on outside click
  useEffect(() => {
    if (!showVersionMenu) return;
    function handleClick(e: MouseEvent) {
      if (versionMenuRef.current && !versionMenuRef.current.contains(e.target as Node)) {
        setShowVersionMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showVersionMenu]);

  if (!versionCount || versionCount <= 1 || !versions || !onVersionSelect) {
    return null;
  }

  return (
    <div className="relative" ref={versionMenuRef}>
      <button
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[#72728a] text-[10px] font-medium border border-[#2a2a35] hover:border-[#fbfbfe]/30 hover:text-[#a0a0b0] transition-all cursor-pointer"
        onClick={() => setShowVersionMenu((v) => !v)}
      >
        <span className="material-symbols-outlined text-[12px]">history</span>
        {versionCount} versions
        <span className="material-symbols-outlined text-[10px]">
          {showVersionMenu ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {showVersionMenu ? (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-[#1e1e24] border border-[#2a2a35] rounded-lg shadow-xl py-1 z-20">
          {Object.entries(versions).map(([key, v]) => {
            const isActive =
              v.tone.toLowerCase() === toneName.toLowerCase() &&
              v.model === (MODELS.find((m) => m.name === modelName)?.id || '');
            const friendlyModel = MODELS.find((m) => m.id === v.model)?.name || v.model;
            return (
              <button
                key={key}
                className={`w-full text-left px-3 py-2 text-[12px] flex items-center justify-between transition-colors ${
                  isActive
                    ? 'text-[#fbfbfe] bg-[#2a2a35]'
                    : 'text-[#72728a] hover:text-[#fbfbfe] hover:bg-[#2a2a35]'
                }`}
                onClick={() => {
                  onVersionSelect(v.tone, v.model);
                  setShowVersionMenu(false);
                }}
              >
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      check
                    </span>
                  ) : (
                    <span className="w-[14px]" />
                  )}
                  <span className="capitalize font-medium">{v.tone}</span>
                </div>
                <span className="text-[10px] opacity-60">{friendlyModel}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
