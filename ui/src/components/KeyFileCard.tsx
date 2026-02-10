export interface KeyFileCardProps {
  path: string;
  additions: number;
  deletions: number;
  description: string;
  onClick?: () => void;
}

export function KeyFileCard({ path, additions, deletions, description, onClick }: KeyFileCardProps) {
  return (
    <div
      className="bg-[#16161a] border border-[#2a2a35] rounded p-3 hover:border-[#3f3f4e] transition-all cursor-pointer flex flex-col justify-center gap-1"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-[12px] text-soft-white font-medium truncate">
          {path}
        </div>
        <div className="text-[10px] font-mono whitespace-nowrap">
          <span className="text-primary">+{additions}</span>
          <span className="text-red-400 ml-1">-{deletions}</span>
        </div>
      </div>
      <p className="text-[11px] text-[#72728a] font-display leading-tight truncate">
        {description}
      </p>
    </div>
  );
}
