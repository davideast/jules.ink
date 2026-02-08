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
    <svg
      width="18"
      height="20"
      viewBox="0 0 84 95"
      fill="currentColor"
      className="text-white/80 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M41.824 4.80334C55.2044 4.80334 66.0631 15.6622 66.0632 29.0426C66.0632 29.7486 66.0299 30.4552 65.9626 31.1276C65.9963 31.4636 66.0632 31.7999 66.0632 32.1696V51.6354C66.0632 52.7782 65.7946 53.8539 65.324 54.8287V74.4957C65.324 76.6137 67.0722 78.3619 69.1902 78.3619C71.2421 78.3619 72.9471 76.7212 73.0515 74.693L73.0613 74.2985C73.1659 72.2704 74.8708 70.6295 76.9226 70.6295C79.0405 70.6296 80.7886 72.3443 80.7888 74.4957C80.7888 80.6143 76.0149 85.5898 69.9636 86.027C69.7283 86.0606 69.4591 86.0944 69.1902 86.0944C68.9212 86.0944 68.6857 86.0942 68.4167 86.027C62.399 85.6235 57.5916 80.648 57.5916 74.4957V59.0309H52.4138V74.3619C52.4136 76.4798 50.6991 78.2281 48.5476 78.2281C46.4298 78.228 44.6816 76.5133 44.6814 74.3619V59.0309H39.5046V74.3619C39.5044 76.4797 37.7898 78.228 35.6384 78.2281C33.5205 78.2281 31.7724 76.5134 31.7722 74.3619V59.0309H26.5945V74.4957C26.5945 80.6143 21.787 85.6234 15.7693 86.027C15.534 86.0606 15.2648 86.0944 14.9958 86.0944C14.7269 86.0944 14.4913 86.0942 14.2224 86.027C8.20468 85.6234 3.39722 80.648 3.39722 74.4957C3.3974 72.3779 5.14552 70.6295 7.26343 70.6295C9.38133 70.6295 11.1295 72.3443 11.1296 74.4957C11.1296 76.6137 12.8779 78.3619 14.9958 78.3619C17.1139 78.3619 18.8621 76.6137 18.8621 74.4957V55.8033C18.0554 54.6268 17.5848 53.1816 17.5847 51.6354V32.1696C17.5847 31.7999 17.6517 31.4636 17.6853 31.1276C17.6181 30.4216 17.5847 29.7486 17.5847 29.0426C17.5848 15.6623 28.4436 4.80336 41.824 4.80334ZM29.1833 38.9938C27.0481 38.9938 25.3171 41.1619 25.3171 43.8356C25.3173 46.5091 27.0482 48.6764 29.1833 48.6764C31.3184 48.6763 33.0494 46.509 33.0496 43.8356C33.0496 41.1619 31.3185 38.9939 29.1833 38.9938ZM55.0027 38.9938C52.8675 38.9938 51.1365 41.1619 51.1365 43.8356C51.1366 46.5091 52.8676 48.6763 55.0027 48.6764C57.1378 48.6764 58.8687 46.5091 58.8689 43.8356C58.8689 41.1619 57.1379 38.9938 55.0027 38.9938Z" />
    </svg>
    <h1 className="text-white/60 text-[13px] font-mono tracking-[-0.02em]">
      jules.ink
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
