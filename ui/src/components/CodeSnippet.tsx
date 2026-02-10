interface CodeSnippetProps {
  label: string;
  code: string;
}

export function CodeSnippet({ label, code }: CodeSnippetProps) {
  return (
    <div className="relative group">
      <div className="absolute -top-3 left-4 px-2 bg-[#16161a] text-[10px] font-bold text-[#72728a] z-10 uppercase tracking-wider">
        {label}
      </div>
      <pre className="bg-[#16161a] border border-[#2a2a35] rounded-lg p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-soft-white">
        {code}
      </pre>
    </div>
  );
}
