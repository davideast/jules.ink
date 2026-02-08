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
  }[];
}

const STORAGE_KEY = 'jules-ink:print-stacks';

export function loadPrintStacks(): PrintStack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PrintStack[];
  } catch (e) {
    console.error('Failed to load print stacks', e);
    return [];
  }
}

export function savePrintStack(stack: PrintStack): void {
  try {
    const stacks = loadPrintStacks();
    const index = stacks.findIndex((s) => s.id === stack.id);
    if (index >= 0) {
      stacks[index] = stack;
    } else {
      stacks.push(stack);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
  } catch (e) {
    console.error('Failed to save print stack', e);
  }
}

export function getPrintStack(id: string): PrintStack | null {
  const stacks = loadPrintStacks();
  return stacks.find((s) => s.id === id) || null;
}
