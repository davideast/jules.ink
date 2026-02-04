import { jules, type Activity } from '@google/jules-sdk';
import { analyzeChangeSet } from './analyzer.js';
import { ChangeSetSummary } from './types.js';

export interface ProcessedActivity {
  activityId: string;
  type: 'changeSet';
  summary: ChangeSetSummary;
  rawActivity: Activity;
}

export interface StreamMetricsOptions {
  /**
   * If true, keeps the stream open and listens for new activities from the network.
   * If false, only reads existing history from the local cache and exits.
   * @default true
   */
  live?: boolean;
}

/**
 * Streams activities from a Jules session and yields parsed metrics
 * whenever a ChangeSet is encountered.
 */
export async function* streamChangeMetrics(
  sessionId: string,
  options: StreamMetricsOptions = {}
): AsyncGenerator<ProcessedActivity> {
  const { live = true } = options;
  const session = jules.session(sessionId);

  // Choose between the infinite stream or the finite history
  const activityStream = live ? session.stream() : session.history();

  for await (const activity of activityStream) {
    // We look for specific artifact types in the activity
    const changeSetArtifact = activity.artifacts?.find(a => a.type === 'changeSet');

    if (changeSetArtifact && changeSetArtifact.gitPatch?.unidiffPatch) {
      const rawPatch = changeSetArtifact.gitPatch.unidiffPatch;

      const summary = analyzeChangeSet(rawPatch);

      yield {
        activityId: activity.id,
        type: 'changeSet',
        summary,
        rawActivity: activity
      };
    }
  }
}
