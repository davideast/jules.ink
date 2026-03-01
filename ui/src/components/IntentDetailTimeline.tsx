import { renderTextWithCode } from '../lib/markdown-utils';

export interface IntentActivity {
  index: number;
  commitMessage?: string;
  summary: string;
  activityType: string;
  createTime?: string;
}

export interface IntentDetailTimelineProps {
  activities: IntentActivity[];
}

export function IntentDetailTimeline({ activities }: IntentDetailTimelineProps) {
  if (activities.length === 0) return null;

  const firstTime = activities[0]?.createTime
    ? new Date(activities[0].createTime).getTime()
    : null;

  return (
    <div>
      <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-3">Steps</h3>
      <div className="flex flex-col">
        {activities.map((a, i) => {
          const isLast = i === activities.length - 1;
          // Humanize activityType: "planGenerated" → "Plan Generated"
          const humanType = a.activityType
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, c => c.toUpperCase())
            .trim();

          // Relative time from first activity
          let relTime = '';
          if (firstTime && a.createTime) {
            const diffMin = Math.round(
              (new Date(a.createTime).getTime() - firstTime) / 60000,
            );
            relTime = diffMin === 0 ? 'start' : `+${diffMin}m`;
          }

          return (
            <div key={a.index} className="flex gap-3">
              {/* Timeline connector */}
              <div className="flex flex-col items-center shrink-0 w-5">
                <div className="w-2 h-2 rounded-full bg-[#3f3f4e] mt-1.5 shrink-0" />
                {!isLast ? (
                  <div className="w-px flex-1 bg-[#2a2a35] my-1" />
                ) : null}
              </div>
              {/* Content */}
              <div className={`min-w-0 pb-${isLast ? '0' : '5'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[12px] text-[#e4e4e7] font-medium">
                    {a.commitMessage || humanType}
                  </span>
                  {relTime ? (
                    <span className="text-[10px] text-[#52526a] font-mono shrink-0">{relTime}</span>
                  ) : null}
                </div>
                {a.commitMessage ? (
                  <span className="text-[10px] text-[#52526a] uppercase tracking-wider">{humanType}</span>
                ) : null}
                <p className="text-[12px] text-[#8e8ea0] leading-[1.6] mt-1">
                  {renderTextWithCode(a.summary)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
