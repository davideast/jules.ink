export interface FileStatRowProps {
  status: 'M' | 'A' | 'D' | 'R';
  path: string;
  additions: number;
  deletions: number;
  onClick?: () => void;
}

export function FileStatRow({ status, path, additions, deletions, onClick }: FileStatRowProps) {
  return (
    <div className="flex items-center text-[12px] font-mono text-[#72728a] hover:text-soft-white transition-colors cursor-pointer group" onClick={onClick}>
      <span className="w-6">{status}</span>
      <span className="group-hover:underline decoration-slate-gray underline-offset-4">{path}</span>
      <span className={`ml-auto ${additions > 0 ? 'text-green-500' : 'text-gray-600'}`}>+{additions}</span>
      <span className={`ml-2 ${deletions > 0 ? 'text-red-500' : 'text-gray-600'}`}>-{deletions}</span>
    </div>
  );
}
