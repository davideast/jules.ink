export type StackStatus = 'streaming' | 'complete';

export interface PrintStackActivity {
  index: number;
  activityId: string;
  activityType: string;
  summary: string;
  files: { path: string; additions: number; deletions: number }[];
  commitMessage?: string;
  createTime?: string;
  tone?: string;
  model?: string;
  status?: string;
  codeReview?: string;
  unidiffPatch?: string;
}

export interface PrintStack {
  id: string;
  sessionId: string;
  tone: string;
  repo: string;
  startedAt: string;
  stackStatus?: StackStatus;
  parentStackId?: string;
  activities: PrintStackActivity[];
}

export async function findLatestStack(sessionId: string): Promise<PrintStack | null> {
  try {
    const params = new URLSearchParams({ sessionId });
    const res = await fetch(`/api/print-stack?${params}`);
    if (!res.ok) throw new Error('Failed to find stack');
    const stacks: PrintStack[] = await res.json();
    if (stacks.length === 0) return null;

    // Pick the stack with the most activities — status fields are unreliable.
    return stacks.reduce((best, s) =>
      s.activities.length > best.activities.length ? s : best
    );
  } catch (e) {
    console.error('Failed to find latest stack', e);
    return null;
  }
}

export async function loadPrintStacks(): Promise<PrintStack[]> {
  try {
    const res = await fetch('/api/print-stack');
    if (!res.ok) throw new Error('Failed to load stacks');
    return await res.json();
  } catch (e) {
    console.error('Failed to load print stacks', e);
    return [];
  }
}

export async function savePrintStack(stack: PrintStack): Promise<void> {
  try {
    const res = await fetch('/api/print-stack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stack),
    });
    if (!res.ok) throw new Error('Failed to save stack');
  } catch (e) {
    console.error('Failed to save print stack', e);
  }
}

export async function getPrintStack(id: string): Promise<PrintStack | null> {
  try {
    const res = await fetch(`/api/print-stack/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to get stack');
    return await res.json();
  } catch (e) {
    console.error('Failed to get print stack', e);
    return null;
  }
}
