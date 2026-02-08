/**
 * In-memory server-side state shared between stream and pause endpoints.
 * Each active session gets an AbortController so pause can signal the stream to stop.
 */

interface ActiveSession {
  controller: AbortController;
  processedCount: number;
  rollingSummary: string;
}

const activeSessions = new Map<string, ActiveSession>();

export function getSession(sessionId: string): ActiveSession | undefined {
  return activeSessions.get(sessionId);
}

export function createSession(sessionId: string): ActiveSession {
  // Abort any existing session first
  const existing = activeSessions.get(sessionId);
  if (existing) {
    existing.controller.abort();
  }

  const session: ActiveSession = {
    controller: new AbortController(),
    processedCount: 0,
    rollingSummary: '',
  };
  activeSessions.set(sessionId, session);
  return session;
}

export function removeSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.controller.abort();
    activeSessions.delete(sessionId);
  }
}
