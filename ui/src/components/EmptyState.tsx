const ICON = (
  <span className="material-symbols-outlined text-[64px] text-[#72728a] opacity-30">
    pest_control
  </span>
);

export function EmptyState() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center h-full w-full">
      <div className="flex flex-col items-center justify-center text-center">
        {ICON}
        <p className="mt-[20px] text-[16px] text-[#72728a] font-medium">
          Paste a session ID to get started
        </p>
        <p className="mt-[8px] text-[13px] text-[#72728a] opacity-60">
          Labels will stream in as your Jules session progresses
        </p>
      </div>
    </main>
  );
}
