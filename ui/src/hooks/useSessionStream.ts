import { useState, useRef, useCallback } from 'react';
import type { SessionState } from '../components/TopBar';

export interface SessionInfo {
  sessionId: string;
  repo: string;
  title: string;
  state: string;
}

export interface ProcessedActivity {
  index: number;
  activityId: string;
  activityType: string;
  summary: string;
  files: { path: string; additions: number; deletions: number }[];
  commitMessage?: string;
  createTime?: string;
  imageUrl?: string;
  tone?: string;
}

export interface UseSessionStreamReturn {
  sessionInfo: SessionInfo | null;
  activities: ProcessedActivity[];
  sessionState: SessionState;
  play: (sessionId: string, tone?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setTone: (tone: string) => void;
  error: string | null;
}

export function useSessionStream(): UseSessionStreamReturn {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [activities, setActivities] = useState<ProcessedActivity[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string>('');
  const toneRef = useRef<string | undefined>(undefined);
  const sessionInfoRef = useRef<SessionInfo | null>(null);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback((sessionId: string, tone?: string, afterIndex?: number) => {
    closeEventSource();
    setError(null);

    const params = new URLSearchParams();
    if (tone) params.set('tone', tone);
    if (afterIndex !== undefined && afterIndex >= 0) params.set('afterIndex', String(afterIndex));
    const qs = params.toString();
    const url = `/api/session/${encodeURIComponent(sessionId)}/stream${qs ? `?${qs}` : ''}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;
    setSessionState('streaming');

    es.addEventListener('session:info', (e) => {
      const data = JSON.parse(e.data) as SessionInfo & { type: string };
      const info = { sessionId: data.sessionId, repo: data.repo, title: data.title, state: data.state };
      sessionInfoRef.current = info;
      setSessionInfo(info);
    });

    es.addEventListener('activity:processed', (e) => {
      const data = JSON.parse(e.data) as ProcessedActivity & { type: string };
      const activity: ProcessedActivity = {
        index: data.index,
        activityId: data.activityId,
        activityType: data.activityType,
        summary: data.summary,
        files: data.files,
        commitMessage: data.commitMessage,
        createTime: data.createTime,
        tone: toneRef.current,
      };
      setActivities((prev) => [...prev, activity]);

      // Fetch the label PNG in the background
      const info = sessionInfoRef.current;
      if (info) {
        fetch('/api/label/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo: info.repo,
            sessionId: info.sessionId,
            summary: activity.summary,
            files: activity.files,
          }),
        })
          .then(res => res.ok ? res.blob() : null)
          .then(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            setActivities(prev =>
              prev.map(a => a.activityId === activity.activityId ? { ...a, imageUrl: url } : a)
            );
          })
          .catch(() => { /* label image fetch failed, card stays in skeleton */ });
      }
    });

    es.addEventListener('session:complete', () => {
      setSessionState('complete');
      closeEventSource();
    });

    es.addEventListener('session:error', (e) => {
      const data = JSON.parse(e.data) as { error: string };
      setError(data.error);
      setSessionState('failed');
      closeEventSource();
    });

    es.onerror = () => {
      // EventSource auto-reconnects, but if it fails permanently
      // the readyState will be CLOSED (2)
      if (es.readyState === EventSource.CLOSED) {
        setSessionState('failed');
        setError('Connection lost');
        closeEventSource();
      }
    };
  }, [closeEventSource]);

  const play = useCallback((sessionId: string, tone?: string) => {
    sessionIdRef.current = sessionId;
    toneRef.current = tone;
    setActivities([]);
    setSessionInfo(null);
    connect(sessionId, tone);
  }, [connect]);

  const pause = useCallback(() => {
    const sessionId = sessionIdRef.current;
    closeEventSource();
    setSessionState('paused');

    // Tell server to abort its stream
    if (sessionId) {
      fetch(`/api/session/${encodeURIComponent(sessionId)}/pause`, { method: 'POST' }).catch(() => {});
    }
  }, [closeEventSource]);

  const resume = useCallback(() => {
    const sessionId = sessionIdRef.current;
    const tone = toneRef.current;
    if (!sessionId) return;

    // Resume from where we left off
    setActivities((prev) => {
      const lastIndex = prev.length > 0 ? prev[prev.length - 1].index : -1;
      connect(sessionId, tone, lastIndex);
      return prev;
    });
  }, [connect]);

  const stop = useCallback(() => {
    const sessionId = sessionIdRef.current;
    closeEventSource();
    setSessionState('idle');
    setActivities([]);
    setSessionInfo(null);
    setError(null);

    if (sessionId) {
      fetch(`/api/session/${encodeURIComponent(sessionId)}/pause`, { method: 'POST' }).catch(() => {});
    }
  }, [closeEventSource]);

  const setTone = useCallback((tone: string) => {
    toneRef.current = tone;
  }, []);

  return { sessionInfo, activities, sessionState, play, pause, resume, stop, setTone, error };
}
