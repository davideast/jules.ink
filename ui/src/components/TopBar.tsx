import { PulsingDot } from './PulsingDot';

export type SessionState =
  | 'idle'
  | 'streaming'
  | 'paused'
  | 'complete'
  | 'failed'
  | 'waiting';

export interface TopBarProps {
  sessionId?: string | null;
  sessionTitle?: string | null;
  sessionState?: SessionState;
  onSessionInput?: (id: string) => void;
  onSessionClose?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  children?: React.ReactNode;
}

const FILLED: React.CSSProperties = {
  fontVariationSettings: "'FILL' 1",
};

const PILL =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#fbfbfe]/40 bg-transparent text-[#fbfbfe] hover:bg-white/5 transition-colors h-8';

const LOGO = (
  <div className="flex items-center gap-3">
    <div className="text-white">
      <span className="material-symbols-outlined text-2xl">pest_control</span>
    </div>
    <h1 className="text-white text-base font-semibold tracking-tight">
      Jules Ink
    </h1>
  </div>
);

export function TopBar({
  sessionId,
  sessionTitle,
  sessionState,
  onSessionInput,
  onSessionClose,
  onPlay,
  onPause,
  onStop,
}: TopBarProps) {
  return (
    <header className="h-[52px] bg-sidebar-bg border-b border-[#2a2a35] flex items-center justify-between px-4 shrink-0 z-30">
      {LOGO}
      <div className="flex items-center gap-4">
        {sessionId ? (
          <>
            {sessionTitle ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-soft-white text-sm">
                  ID: {sessionId}
                </span>
                <button
                  className="text-[#72728a] hover:text-white transition-colors flex items-center"
                  onClick={onSessionClose}
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">
                    close
                  </span>
                </button>
              </div>
            ) : null}
            <div className="h-4 w-px bg-[#2a2a32]" />

            {/* Status + transport — fixed width to prevent layout shift */}
            <div className="flex items-center justify-end gap-4 min-w-[280px]">
              {/* Status indicator */}
              {sessionState === 'streaming' ? (
                <div className="flex items-center gap-2">
                  <PulsingDot />
                  <span className="text-[#72728a] text-xs font-medium">
                    Streaming
                  </span>
                </div>
              ) : sessionState === 'paused' ? (
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[14px] text-yellow-500"
                    style={FILLED}
                  >
                    pause
                  </span>
                  <span className="text-[#72728a] text-xs font-medium">
                    Paused
                  </span>
                </div>
              ) : sessionState === 'complete' ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-[#72728a]">
                    check
                  </span>
                  <span className="text-[#72728a] text-xs font-medium">
                    Complete
                  </span>
                </div>
              ) : sessionState === 'failed' ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-red-500">
                    close
                  </span>
                  <span className="text-[#72728a] text-xs font-medium">
                    Failed
                  </span>
                </div>
              ) : sessionState === 'waiting' ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-yellow-500">
                    pause
                  </span>
                  <span className="text-[#72728a] text-xs font-medium">
                    Waiting
                  </span>
                </div>
              ) : null}

              {/* Transport controls */}
              {sessionState === 'idle' || !sessionState ? (
                <button className={PILL} onClick={onPlay}>
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={FILLED}
                  >
                    play_arrow
                  </span>
                  <span className="text-[13px] font-semibold">Play</span>
                </button>
              ) : sessionState === 'streaming' ? (
                <div className="flex items-center gap-2">
                  <button className={PILL} onClick={onPause}>
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={FILLED}
                    >
                      pause
                    </span>
                    <span className="text-[13px] font-semibold">Pause</span>
                  </button>
                  <button className={PILL} onClick={onStop}>
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={FILLED}
                    >
                      stop
                    </span>
                    <span className="text-[13px] font-semibold">Stop</span>
                  </button>
                </div>
              ) : sessionState === 'paused' ? (
                <div className="flex items-center gap-2">
                  <button className={PILL} onClick={onPlay}>
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={FILLED}
                    >
                      play_arrow
                    </span>
                    <span className="text-[13px] font-semibold">Play</span>
                  </button>
                  <button className={PILL} onClick={onStop}>
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={FILLED}
                    >
                      stop
                    </span>
                    <span className="text-[13px] font-semibold">Stop</span>
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <input
            className="w-[280px] h-8 bg-[#16161a] border border-[#2a2a32] rounded text-sm text-[#fbfbfe] placeholder-[#72728a] px-3 focus:outline-none focus:border-[#72728a] font-mono transition-colors"
            placeholder="Paste session ID..."
            type="text"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSessionInput?.((e.target as HTMLInputElement).value);
              }
            }}
          />
        )}
      </div>
    </header>
  );
}
