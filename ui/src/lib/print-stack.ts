export interface PrintStack {
  id: string;
  sessionId: string;
  tone: string;
  repo: string;
  startedAt: string;
  activities: {
    index: number;
    activityId: string;
    activityType: string;
    summary: string;
    files: { path: string; additions: number; deletions: number }[];
    commitMessage?: string;
    createTime?: string;
    tone?: string;
    model?: string;
  }[];
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
