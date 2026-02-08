export interface TimelineEntryProps {
  time: string;
  eventType: string;
  active?: boolean;
  children: React.ReactNode;
}

export function TimelineEntry({
  time,
  eventType,
  active = false,
  children,
}: TimelineEntryProps) {
  return (
    <div
      className={[
        'flex flex-row w-full justify-center',
        active ? 'active-card-container' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        active
          ? {
              borderLeft: '2px solid white',
              marginLeft: -2,
              paddingLeft: 2,
            }
          : undefined
      }
    >
      <div className="w-[100px] shrink-0 flex flex-col items-end gap-1.5 text-right pt-2 mr-[20px]">
        <span
          className={`text-[13px] font-mono font-medium ${
            active ? 'text-soft-white' : 'text-slate-gray'
          }`}
        >
          {time}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            active
              ? 'bg-[#2a2a35] text-[#72728a]'
              : 'bg-[#2a2a35]/50 text-[#72728a]'
          }`}
        >
          {eventType}
        </span>
      </div>
      {children}
    </div>
  );
}
