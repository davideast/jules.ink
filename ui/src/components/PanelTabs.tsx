export interface Tab {
  id: string;
  label: string;
}

export interface PanelTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function PanelTabs({ tabs, activeTab, onTabChange }: PanelTabsProps) {
  return (
    <div className="h-[48px] flex items-end px-8 border-b border-[#2a2a35] shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={
            tab.id === activeTab
              ? 'pb-3 text-[13px] font-medium text-soft-white border-b-2 border-white px-4 transition-colors'
              : 'pb-3 text-[13px] font-medium text-[#72728a] hover:text-white px-4 transition-colors'
          }
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
