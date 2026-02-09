import { PulsingDot } from './PulsingDot';

export type SessionStatus = 'completed' | 'in_progress' | 'failed';

export interface SessionRowProps {
  title: string;
  repo: string;
  status: SessionStatus;
  time: string;
  onClick?: () => void;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  failed: 'Failed',
};

export function SessionRow({ title, repo, status, time, onClick }: SessionRowProps) {
  return (
    <div
      className="group flex items-center justify-between py-4 border-b border-[#2a2a35] hover:bg-[#1e1e24] transition-colors cursor-pointer px-3 -mx-3 rounded-sm"
      onClick={onClick}
    >
      <div className="flex flex-col gap-1">
        <div className="text-[14px] font-medium text-[#fbfbfe] truncate max-w-[400px]">{title}</div>
        <div className="text-[12px] font-mono text-[#72728a]">{repo}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {status === 'in_progress' ? (
            <PulsingDot />
          ) : (
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'failed' ? 'bg-[#ef4444]' : 'bg-primary'
              }`}
            />
          )}
          <span className="text-[11px] text-[#72728a]">
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#72728a]">{time}</div>
      </div>
    </div>
  );
}
