export type FileAnalysisTab = 'analysis' | 'diff' | 'history';

interface FileAnalysisHeaderProps {
  filePath: string;
  additions: number;
  deletions: number;
  commitMessage: string;
  activeTab: FileAnalysisTab;
  onTabChange: (tab: FileAnalysisTab) => void;
  onBack: () => void;
}

const subTabs: { key: FileAnalysisTab; label: string }[] = [
  { key: 'analysis', label: 'Analysis' },
  { key: 'diff', label: 'Diff' },
  { key: 'history', label: 'History' },
];

export function FileAnalysisHeader({
  filePath,
  additions,
  deletions,
  commitMessage,
  activeTab,
  onTabChange,
  onBack,
}: FileAnalysisHeaderProps) {
  return (
    <div className="shrink-0 border-b border-[#2a2a35] bg-[#1e1e24]">
      <div className="h-[48px] flex items-center justify-between px-4">
        <div className="flex items-center gap-4 h-full">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#72728a] hover:text-soft-white transition-colors text-xs font-medium"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </button>
          <div className="w-px h-4 bg-[#2a2a35] mx-1" />
          <div className="flex h-full gap-6">
            {subTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`relative h-full flex items-center text-sm font-medium transition-colors ${
                    isActive ? 'text-soft-white' : 'text-[#72728a] hover:text-soft-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="px-4 py-2 border-t border-[#2a2a35]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-mono text-soft-white tracking-tight">{filePath}</span>
          <div className="flex items-center gap-3 text-[12px] font-mono">
            <span className="text-primary font-medium">+{additions}</span>
            <span className="text-red-400 font-medium">-{deletions}</span>
          </div>
        </div>
        {commitMessage ? (
          <div className="text-[12px] italic text-[#72728a] truncate">{commitMessage}</div>
        ) : null}
      </div>
    </div>
  );
}
