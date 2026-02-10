import type { Activity } from '@google/jules-sdk';
import { SessionSummarizer } from './summarizer.js';
import type { FileStat } from './label-generator.js';

// --- Typed events yielded by the generator ---

export type SessionEvent =
  | { type: 'session:info'; sessionId: string; repo: string; title: string; state: string }
  | {
      type: 'activity:processed';
      index: number;
      activityId: string;
      activityType: string;
      summary: string;
      files: FileStat[];
      commitMessage?: string;
      createTime?: string;
      status?: string;
      codeReview?: string;
      unidiffPatch?: string;
    }
  | { type: 'session:complete'; sessionId: string; totalActivities: number }
  | { type: 'session:error'; sessionId: string; error: string };

export interface SessionStreamOptions {
  model?: string;
  tone?: string;
  backend?: 'cloud' | 'local';
  apiKey?: string;
  live?: boolean;
  signal?: AbortSignal;
  afterIndex?: number;
}

/**
 * Portable session streaming core.
 * Yields typed events without any file I/O or printer coupling.
 * Both CLI and Astro SSR consume this same generator.
 */
export async function* streamSession(
  sessionId: string,
  options: SessionStreamOptions = {}
): AsyncGenerator<SessionEvent> {
  const {
    model,
    tone,
    backend = 'cloud',
    apiKey,
    live = true,
    signal,
    afterIndex = -1,
  } = options;

  const summarizer = new SessionSummarizer({
    backend,
    apiKey: apiKey || process.env.GEMINI_API_KEY,
    cloudModelName: model,
    tone,
    sessionId,
  });

  const { connect } = await import('@google/jules-sdk');
  const jules = connect();

  let rollingSummary = '';
  const session = jules.session(sessionId);

  // Emit session metadata
  try {
    const sessionInfo = await session.info();
    const repo = sessionInfo.sourceContext?.source?.replace('sources/github/', '') || 'unknown/repo';
    const title = (sessionInfo as any).title || '';
    const state = (sessionInfo as any).state || '';

    yield {
      type: 'session:info',
      sessionId,
      repo,
      title,
      state,
    };
  } catch (err: any) {
    yield { type: 'session:error', sessionId, error: err.message || String(err) };
    return;
  }

  // Stream activities
  const activityStream = live ? session.stream() : session.history();
  let count = 0;

  try {
    for await (const activity of activityStream) {
      if (signal?.aborted) break;

      // Skip already-processed activities (for resume after pause)
      if (count <= afterIndex) {
        count++;
        continue;
      }

      // Extract file stats and commit message
      const files = summarizer.getLabelData(activity);
      const changeSet = activity.artifacts?.find(a => a.type === 'changeSet');
      const commitMessage = changeSet?.gitPatch?.suggestedCommitMessage;
      const isChangeSet = !!changeSet;
      const unidiffPatch = changeSet?.gitPatch?.unidiffPatch;

      // Parallel: summary + status + code review
      const summaryPromise = summarizer.generateRollingSummary(rollingSummary, activity);
      const statusPromise = summarizer.generateStatus(count).catch(() => undefined);
      const reviewPromise = isChangeSet && unidiffPatch
        ? summarizer.generateCodeReview(activity.id, unidiffPatch, files).catch(() => undefined)
        : Promise.resolve(undefined);

      const [summary, status, review] = await Promise.all([summaryPromise, statusPromise, reviewPromise]);
      rollingSummary = summary;

      yield {
        type: 'activity:processed',
        index: count,
        activityId: activity.id,
        activityType: activity.type,
        summary: rollingSummary,
        files,
        commitMessage,
        createTime: (activity as any).createTime,
        status,
        codeReview: review,
        unidiffPatch,
      };

      count++;
    }
  } catch (err: any) {
    yield { type: 'session:error', sessionId, error: err.message || String(err) };
    return;
  }

  if (!signal?.aborted) {
    yield { type: 'session:complete', sessionId, totalActivities: count };
  }
}
