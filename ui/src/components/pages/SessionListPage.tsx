import { useState, useMemo, useCallback } from 'react';
import { TopBar } from '../TopBar';
import { SessionRow } from '../SessionRow';
import type { SessionStatus } from '../SessionRow';

interface Session {
  id: string;
  title: string;
  repo: string;
  status: SessionStatus;
  createTime: string;
  updateTime: string;
}

interface SessionListPageProps {
  initialSessions?: Session[];
  initialNextPageToken?: string | null;
  initialError?: string | null;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  const diffW = Math.floor(diffD / 7);
  if (diffW === 1) return '1 week ago';
  return `${diffW} weeks ago`;
}

export function SessionListPage({
  initialSessions = [],
  initialNextPageToken = null,
  initialError = null,
}: SessionListPageProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [error] = useState<string | null>(initialError);
  const [search, setSearch] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | null>(initialNextPageToken);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ pageSize: '25', pageToken: nextPageToken });
      const res = await fetch(`/api/sessions?${params}`);
      if (!res.ok) throw new Error('Failed to load more');
      const data = await res.json();
      setSessions((prev) => [...prev, ...data.sessions]);
      setNextPageToken(data.nextPageToken);
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.repo.toLowerCase().includes(q),
    );
  }, [search, sessions]);

  const handleSelect = (session: Session) => {
    window.location.href = `/session?id=${encodeURIComponent(session.id)}`;
  };

  const handleSessionInput = (id: string) => {
    if (id.trim()) {
      window.location.href = `/session?id=${encodeURIComponent(id.trim())}`;
    }
  };

  // Error state
  if (error) {
    return (
      <>
        <TopBar
          onSessionInput={handleSessionInput}
          onSettings={() => { window.location.href = '/settings'; }}
        />
        <main className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-[48px] text-[#ef4444] opacity-50 mb-4">
              error
            </span>
            <p className="text-[14px] text-[#72728a]">{error}</p>
            <p className="mt-2 text-[13px] text-[#72728a] opacity-60">
              You can still paste a session ID above
            </p>
          </div>
        </main>
      </>
    );
  }

  // Zero state: no sessions exist
  if (sessions.length === 0) {
    return (
      <>
        <TopBar
          onSessionInput={handleSessionInput}
          onSettings={() => { window.location.href = '/settings'; }}
        />
        <main className="flex-1 flex flex-col items-center justify-center w-full">
          <div className="flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-[64px] text-[#72728a] opacity-30">
              pest_control
            </span>
            <p className="mt-5 text-[16px] text-[#72728a] font-medium">
              No sessions yet
            </p>
            <p className="mt-2 text-[13px] text-[#72728a] opacity-60">
              Paste a session ID above to get started
            </p>
          </div>
        </main>
      </>
    );
  }

  // Sessions list
  return (
    <>
      <TopBar
        onSessionInput={handleSessionInput}
        onSettings={() => { window.location.href = '/settings'; }}
      />
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center pt-12 pb-12 w-full">
        <div className="w-full max-w-[640px] px-4">
          <div className="mb-8">
            <h2 className="text-[16px] font-medium text-[#fbfbfe] mb-1">
              Recent Sessions
            </h2>
            <p className="text-[13px] text-[#72728a]">
              Select a session to start printing labels
            </p>
          </div>

          <div className="relative mb-6">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#72728a] text-[16px]">
              search
            </span>
            <input
              className="w-full bg-[#16161a] border border-[#2a2a32] rounded-md pl-9 pr-4 py-1.5 text-sm text-[#fbfbfe] placeholder-[#72728a] focus:outline-none focus:border-[#72728a] transition-colors font-mono"
              placeholder="Search sessions..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full flex flex-col border-t border-[#2a2a35]">
            {filtered.length > 0 ? (
              filtered.map((session) => (
                <SessionRow
                  key={session.id}
                  title={session.title}
                  repo={session.repo}
                  status={session.status}
                  time={relativeTime(session.updateTime || session.createTime)}
                  onClick={() => handleSelect(session)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="material-symbols-outlined text-[48px] text-[#72728a] opacity-30 mb-4">
                  search_off
                </span>
                <p className="text-[14px] text-[#72728a]">No sessions found</p>
              </div>
            )}
          </div>

          {nextPageToken ? (
            <div className="flex justify-center pt-6">
              <button
                className="text-[13px] text-[#72728a] hover:text-[#fbfbfe] transition-colors font-mono"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
