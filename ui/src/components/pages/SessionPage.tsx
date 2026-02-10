import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { TopBar } from '../TopBar';
import type { SessionState } from '../TopBar';
import { ToneTrigger } from '../ToneTrigger';
import { ToneModal } from '../ToneModal';
import { PanelTabs } from '../PanelTabs';
import type { Tab } from '../PanelTabs';
import { TimelineEntry } from '../TimelineEntry';
import { LabelCard } from '../LabelCard';
import { LabelPreview } from '../LabelPreview';
import { LabelCardSkeleton } from '../LabelCardSkeleton';
import { ModelSelector, MODELS } from '../ModelSelector';
import { ReadingPane } from '../ReadingPane';
import { AnalysisPane } from '../AnalysisPane';
import type { KeyFile } from '../AnalysisPane';
import { FileAnalysisView } from '../FileAnalysisView';
import type { FileAnalysisData } from '../FileAnalysisView';
import { DiffView } from '../DiffView';
import { StatusBar } from '../StatusBar';
import { PrinterDropdown } from '../PrinterDropdown';
import type { PrinterOption } from '../PrinterDropdown';
import { useSessionStream } from '../../hooks/useSessionStream';
import { usePrinters } from '../../hooks/usePrinters';
import {
  type PrintStack,
  savePrintStack,
  findLatestStack,
  versionKey,
} from '../../lib/print-stack';
import { EXPERT_PERSONAS } from '../../lib/personas';
import type { FileTreeNode } from '../FileTree';

const RIGHT_PANEL_TABS: Tab[] = [
  { id: 'narration', label: 'Activity' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'recs', label: 'Recs' },
  { id: 'memory', label: 'Memory' },
];

/** Convert a flat file list into a nested FileTreeNode[] structure. */
function buildFileTree(
  files: { path: string; additions: number; deletions: number }[],
): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split('/');
    let level = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      if (i === parts.length - 1) {
        level.push({
          name,
          type: 'file',
          status: 'M',
          additions: file.additions,
          deletions: file.deletions,
        });
      } else {
        let dir = level.find(n => n.name === name && n.type === 'directory');
        if (!dir) {
          dir = { name, type: 'directory', children: [] };
          level.push(dir);
        }
        level = dir.children!;
      }
    }
  }
  return root;
}

interface SessionPageProps {
  sessionId?: string;
  sessionTitle?: string;
  sessionRepo?: string;
  sessionStatus?: string;
  sessionPrompt?: string;
  initialTone?: string;
  initialModel?: string;
}

export function SessionPage({
  sessionId = '',
  sessionTitle,
  sessionRepo,
  sessionStatus,
  sessionPrompt,
  initialTone,
  initialModel,
}: SessionPageProps) {
  const [selectedTone, setSelectedTone] = useState<string>(initialTone || 'React Perf Expert');
  const [customInstructions, setCustomInstructions] = useState('');
  const [activeTab, setActiveTab] = useState('narration');
  const [toneModalOpen, setToneModalOpen] = useState(false);
  const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
  const [activeLabelIndex, setActiveLabelIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState(initialModel || 'gemini-2.5-flash-lite');
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [currentStackId, setCurrentStackId] = useState<string | null>(null);
  const [diffFilePath, setDiffFilePath] = useState<string | null>(null);
  const [fetchingDiff, setFetchingDiff] = useState(false);
  const [analysisFilePath, setAnalysisFilePath] = useState<string | null>(null);
  const [isLoadingStack, setIsLoadingStack] = useState(!!sessionId);
  const [loadedStack, setLoadedStack] = useState<PrintStack | null>(null);

  const stackMetadataRef = useRef<{ startedAt: string; tone: string; model: string; repo: string } | null>(null);
  const skipAutoSelectRef = useRef(false);

  // Debounced save refs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef<PrintStack | null>(null);

  const stream = useSessionStream();
  const printerHook = usePrinters();

  // Map printer data to PrinterOption format
  const printerOptions: PrinterOption[] = printerHook.printers.map(p => ({
    name: p.name,
    online: p.online,
  }));

  // --- Debounced save helpers ---
  const flushSave = useCallback(async (stack: PrintStack) => {
    if (saveInFlightRef.current) {
      pendingSaveRef.current = stack;
      return;
    }
    saveInFlightRef.current = true;
    try {
      await savePrintStack(stack);
    } catch (err) {
      console.error('Failed to save stack', err);
    } finally {
      saveInFlightRef.current = false;
      const pending = pendingSaveRef.current;
      if (pending) {
        pendingSaveRef.current = null;
        flushSave(pending);
      }
    }
  }, []);

  // --- Load cached stack on mount ---
  useEffect(() => {
    if (!sessionId) {
      setIsLoadingStack(false);
      return;
    }
    let cancelled = false;
    findLatestStack(sessionId).then(stack => {
      if (cancelled) return;
      if (stack && stack.activities.length > 0) {
        skipAutoSelectRef.current = true;
        stream.loadFromStack(stack, sessionStatus);
        setSelectedTone(stack.tone);
        setLoadedStack(stack);
        // Sync model to first activity so ReadingPane matches the label
        const firstModel = stack.activities[0]?.model;
        if (firstModel) setSelectedModel(firstModel);
      }
      setIsLoadingStack(false);
    });
    return () => { cancelled = true; };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  // Auto-select latest activity as it arrives (skip on cache load)
  useEffect(() => {
    if (skipAutoSelectRef.current) {
      skipAutoSelectRef.current = false;
      return;
    }
    if (stream.activities.length > 0) {
      setActiveLabelIndex(stream.activities.length - 1);
    }
  }, [stream.activities.length]);

  // Reset diff view when switching timeline entries
  useEffect(() => {
    setDiffFilePath(null);
  }, [activeLabelIndex]);

  // Update tone in stream when selectedTone changes
  useEffect(() => {
    stream.setTone(selectedTone.toLowerCase());
  }, [selectedTone, stream]);

  // Update model in stream when selectedModel changes
  useEffect(() => {
    stream.setModel(selectedModel);
  }, [selectedModel, stream]);

  // Bulk-switch cached versions when tone/model selection changes on a completed session
  useEffect(() => {
    if (stream.sessionState !== 'complete' && stream.sessionState !== 'ready') return;
    stream.switchAllVersions(selectedTone, selectedModel);
  }, [selectedTone, selectedModel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced persist of activities to PrintStack
  useEffect(() => {
    if (!currentStackId || !stackMetadataRef.current) return;

    // Update repo if we have it now
    if (stream.sessionInfo?.repo && !stackMetadataRef.current.repo) {
      stackMetadataRef.current.repo = stream.sessionInfo.repo;
    }

    const activitiesToSave = stream.activities.map(
      ({ imageUrl, ...rest }) => rest,
    );
    const updatedStack: PrintStack = {
      id: currentStackId,
      sessionId: stream.sessionInfo?.sessionId || sessionId,
      tone: stackMetadataRef.current.tone,
      repo: stackMetadataRef.current.repo,
      startedAt: stackMetadataRef.current.startedAt,
      stackStatus: 'streaming',
      activities: activitiesToSave,
    };

    // Debounce: clear previous timer, set new 500ms timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave(updatedStack);
    }, 500);
  }, [currentStackId, stream.activities, stream.sessionInfo, sessionId, flushSave]);

  // Mark stack complete when session finishes
  useEffect(() => {
    if (stream.sessionState !== 'complete' || !currentStackId || !stackMetadataRef.current) return;

    // Cancel any pending debounced save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Update repo if we have it now
    if (stream.sessionInfo?.repo && !stackMetadataRef.current.repo) {
      stackMetadataRef.current.repo = stream.sessionInfo.repo;
    }

    const activitiesToSave = stream.activities.map(
      ({ imageUrl, ...rest }) => rest,
    );
    const finalStack: PrintStack = {
      id: currentStackId,
      sessionId: stream.sessionInfo?.sessionId || sessionId,
      tone: stackMetadataRef.current.tone,
      repo: stackMetadataRef.current.repo,
      startedAt: stackMetadataRef.current.startedAt,
      stackStatus: 'complete',
      activities: activitiesToSave,
    };
    flushSave(finalStack);

    // Store as loadedStack for regeneration reference
    setLoadedStack(finalStack);
  }, [stream.sessionState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive the active activity for the reading pane
  const activeActivity = stream.activities[activeLabelIndex] ?? null;

  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const restartSnapshotRef = useRef<Map<string, string>>(new Map());

  // Clear skeleton state as activities get replaced during restart
  useEffect(() => {
    if (regeneratingIds.size === 0) return;
    const snapshot = restartSnapshotRef.current;
    if (snapshot.size === 0) return;
    setRegeneratingIds(prev => {
      const next = new Set(prev);
      for (const activity of stream.activities) {
        if (next.has(activity.activityId) && activity.summary !== snapshot.get(activity.activityId)) {
          next.delete(activity.activityId);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [stream.activities]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear all skeletons when stream completes
  useEffect(() => {
    if (stream.sessionState === 'complete') {
      if (regeneratingIds.size > 0) {
        setRegeneratingIds(new Set());
        restartSnapshotRef.current = new Map();
      }
    }
  }, [stream.sessionState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shared helper: check cache for each activity, regenerate uncached ones, persist.
  const regenerateActivities = useCallback(async (
    targets: typeof stream.activities,
    tone: string,
    model: string,
  ) => {
    const targetKey = versionKey(tone, model);
    const normalizedTone = tone.toLowerCase();

    // Instant-switch any activities that already have cached versions
    stream.switchAllVersions(tone, model);

    // Find activities missing a version for this permutation
    const uncached = targets.filter(a => !a.versions?.[targetKey]);
    if (uncached.length === 0) return;

    // Show skeletons for uncached activities
    setRegeneratingIds(new Set(uncached.map(a => a.activityId)));

    // Regenerate in parallel, collect results
    const results = new Map<string, string>();

    await Promise.all(uncached.map(async (activity) => {
      try {
        const res = await fetch('/api/regenerate-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: activity.summary,
            activityType: activity.activityType,
            tone: normalizedTone,
            model,
          }),
        });
        if (!res.ok) throw new Error('Regeneration failed');
        const { summary } = await res.json();
        results.set(activity.activityId, summary);
        stream.patchActivityVersion(activity.activityId, tone, model, { summary });
      } catch (err) {
        console.error('Failed to regenerate activity:', err);
      } finally {
        setRegeneratingIds(prev => {
          const next = new Set(prev);
          next.delete(activity.activityId);
          return next;
        });
      }
    }));

    // Persist updated stack with new versions
    const stackId = currentStackId || loadedStack?.id;
    if (stackId && results.size > 0) {
      const newKey = versionKey(normalizedTone, model);
      const updatedActivities = stream.activities.map(a => {
        const { imageUrl, ...rest } = a;
        const newSummary = results.get(a.activityId);
        if (!newSummary) return rest;
        const newVersion = { summary: newSummary, tone: normalizedTone, model, status: rest.status, codeReview: rest.codeReview };
        return {
          ...rest,
          summary: newSummary, tone: normalizedTone, model,
          versions: { ...rest.versions, [newKey]: newVersion },
        };
      });
      const src = loadedStack;
      const meta = stackMetadataRef.current;
      const updatedStack: PrintStack = {
        id: stackId,
        sessionId: src?.sessionId || stream.sessionInfo?.sessionId || sessionId,
        tone: src?.tone || meta?.tone || tone,
        repo: src?.repo || meta?.repo || stream.sessionInfo?.repo || '',
        startedAt: src?.startedAt || meta?.startedAt || new Date().toISOString(),
        stackStatus: 'complete',
        activities: updatedActivities,
      };
      flushSave(updatedStack);
      setLoadedStack(updatedStack);
    }
  }, [stream, currentStackId, loadedStack, sessionId, flushSave]);

  const handlePlay = useCallback(() => {
    if (stream.sessionState === 'paused') {
      stream.resume();
      return;
    }

    // Switch existing activities to cached versions for the current permutation
    if (stream.activities.length > 0) {
      stream.switchAllVersions(selectedTone, selectedModel);
    }

    const newStackId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const repo = stream.sessionInfo?.repo || '';

    stackMetadataRef.current = {
      startedAt,
      tone: selectedTone,
      model: selectedModel,
      repo,
    };

    const newStack: PrintStack = {
      id: newStackId,
      sessionId,
      tone: selectedTone,
      repo,
      startedAt,
      stackStatus: 'streaming',
      activities: [],
    };
    savePrintStack(newStack).catch((err) => console.error('Failed to save initial stack', err));
    setCurrentStackId(newStackId);

    // Continue from last known activity, or fresh start if no activities
    const lastIndex = stream.activities.length > 0
      ? stream.activities[stream.activities.length - 1].index
      : undefined;
    stream.play(sessionId, selectedTone.toLowerCase(), selectedModel,
      lastIndex !== undefined
        ? { afterIndex: lastIndex, preserveVersionsFrom: stream.activities }
        : undefined,
    );
  }, [sessionId, selectedTone, selectedModel, stream]);

  const handleRestart = useCallback(() => {
    // Snapshot current summaries to detect when activities are replaced
    restartSnapshotRef.current = new Map(
      stream.activities.map(a => [a.activityId, a.summary]),
    );
    // Show skeletons on all existing cards
    setRegeneratingIds(new Set(stream.activities.map(a => a.activityId)));

    const newStackId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const repo = stream.sessionInfo?.repo || '';

    stackMetadataRef.current = {
      startedAt,
      tone: selectedTone,
      model: selectedModel,
      repo,
    };

    const newStack: PrintStack = {
      id: newStackId,
      sessionId,
      tone: selectedTone,
      repo,
      startedAt,
      stackStatus: 'streaming',
      activities: [],
    };
    savePrintStack(newStack).catch((err) => console.error('Failed to save initial stack', err));
    setCurrentStackId(newStackId);

    // Restart from beginning, replacing existing cards as data arrives
    stream.play(sessionId, selectedTone.toLowerCase(), selectedModel, {
      restart: true,
      preserveVersionsFrom: stream.activities,
    });
  }, [sessionId, selectedTone, selectedModel, stream]);

  const handlePause = useCallback(() => {
    stream.pause();
  }, [stream]);

  const handleStop = useCallback(() => {
    // Finalize current stack
    if (currentStackId && stackMetadataRef.current) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (stream.sessionInfo?.repo && !stackMetadataRef.current.repo) {
        stackMetadataRef.current.repo = stream.sessionInfo.repo;
      }
      const activitiesToSave = stream.activities.map(
        ({ imageUrl, ...rest }) => rest,
      );
      const finalStack: PrintStack = {
        id: currentStackId,
        sessionId: stream.sessionInfo?.sessionId || sessionId,
        tone: stackMetadataRef.current.tone,
        repo: stackMetadataRef.current.repo,
        startedAt: stackMetadataRef.current.startedAt,
        stackStatus: 'complete',
        activities: activitiesToSave,
      };
      flushSave(finalStack);
      setLoadedStack(finalStack);
    }

    setCurrentStackId(null);
    stream.stop();
  }, [stream, currentStackId, sessionId, flushSave]);

  const handleRegenerate = useCallback(async () => {
    const activity = activeActivity;
    if (!activity) return;
    await regenerateActivities([activity], selectedTone, selectedModel);
  }, [activeActivity, selectedTone, selectedModel, regenerateActivities]);

  const handleVersionSelect = useCallback((tone: string, model: string) => {
    if (!activeActivity) return;
    stream.switchActivityVersion(activeActivity.activityId, tone, model);
    // Update selectors to match the chosen version
    const titleCaseTone = tone.charAt(0).toUpperCase() + tone.slice(1);
    setSelectedTone(titleCaseTone);
    setSelectedModel(model);
  }, [activeActivity, stream]);

  // --- Tone modal ---
  const handleToneApply = useCallback((
    personaId: string | null,
    instructions: string,
    _scope: 'session' | 'global',
  ) => {
    if (personaId) {
      const persona = EXPERT_PERSONAS.find(p => p.id === personaId);
      if (persona) setSelectedTone(persona.name);
    } else if (instructions.trim()) {
      setSelectedTone(instructions.trim());
    }
    setCustomInstructions(instructions);
    setToneModalOpen(false);
  }, []);

  // --- File click / diff ---
  const handleFileClick = useCallback((filePath: string) => {
    const activity = stream.activities[activeLabelIndex];
    if (!activity) return;

    if (activity.unidiffPatch) {
      setDiffFilePath(filePath);
      return;
    }

    // Fetch diff on-demand from Jules API
    const sid = stream.sessionInfo?.sessionId || sessionId;
    if (!sid) return;

    setFetchingDiff(true);
    fetch(`/api/session/${encodeURIComponent(sid)}/diff?activityId=${encodeURIComponent(activity.activityId)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.unidiffPatch) {
          stream.patchActivity(activity.activityId, { unidiffPatch: data.unidiffPatch });
          setDiffFilePath(filePath);
        }
      })
      .catch(() => {})
      .finally(() => setFetchingDiff(false));
  }, [stream, activeLabelIndex, sessionId]);

  const handleDiffBack = useCallback(() => {
    setDiffFilePath(null);
  }, []);

  const handlePrinterSelect = useCallback((name: string | null) => {
    setSelectedPrinter(name);
    setPrinterDropdownOpen(false);
  }, []);

  const handleScanPrinters = useCallback(() => {
    printerHook.scan();
  }, [printerHook]);

  // Derive selected printer data
  const selectedPrinterData = printerOptions.find(
    (p) => p.name === selectedPrinter,
  );

  // Active persona for ToneTrigger icon and ToneModal initial state
  const activePersona = EXPERT_PERSONAS.find(
    p => p.name.toLowerCase() === selectedTone.toLowerCase(),
  );

  // Version-aware regeneration controls
  const targetKey = activeActivity ? versionKey(selectedTone, selectedModel) : null;
  const hasCachedVersion = !!(targetKey && activeActivity?.versions?.[targetKey]);
  const versionCount = activeActivity?.versions ? Object.keys(activeActivity.versions).length : 0;
  const showRegenerate = !!(
    activeActivity &&
    (stream.sessionState === 'complete' || stream.sessionState === 'ready') &&
    regeneratingIds.size === 0 &&
    (selectedTone.toLowerCase() !== (activeActivity.tone || '').toLowerCase() ||
     selectedModel !== activeActivity.model)
  );

  // --- Analysis data derived from all activities ---
  const analysisData = useMemo(() => {
    const fileMap = new Map<string, { additions: number; deletions: number }>();
    for (const a of stream.activities) {
      for (const f of a.files) {
        const existing = fileMap.get(f.path);
        if (existing) {
          existing.additions += f.additions;
          existing.deletions += f.deletions;
        } else {
          fileMap.set(f.path, { additions: f.additions, deletions: f.deletions });
        }
      }
    }

    const entries = Array.from(fileMap.entries());
    const totalAdditions = entries.reduce((s, [, f]) => s + f.additions, 0);
    const totalDeletions = entries.reduce((s, [, f]) => s + f.deletions, 0);

    const keyFiles: KeyFile[] = entries
      .sort((a, b) => (b[1].additions + b[1].deletions) - (a[1].additions + a[1].deletions))
      .slice(0, 4)
      .map(([path, stats]) => ({
        path,
        additions: stats.additions,
        deletions: stats.deletions,
        description: `${stats.additions + stats.deletions} lines changed`,
      }));

    const fileTree: FileTreeNode[] = buildFileTree(
      entries.map(([path, stats]) => ({ path, ...stats })),
    );

    return {
      totalFiles: fileMap.size,
      totalAdditions,
      totalDeletions,
      keyFiles,
      fileTree,
    };
  }, [stream.activities]);

  // --- File analysis drill-in data ---
  const fileAnalysisData = useMemo<FileAnalysisData | null>(() => {
    if (!analysisFilePath) return null;

    // Find the activity containing this file
    const activity = stream.activities.find(a =>
      a.files.some(f => f.path === analysisFilePath),
    );
    if (!activity) return null;

    const fileStats = activity.files.find(f => f.path === analysisFilePath);
    const relatedFiles = activity.files
      .filter(f => f.path !== analysisFilePath)
      .map(f => f.path);

    return {
      filePath: analysisFilePath,
      additions: fileStats?.additions ?? 0,
      deletions: fileStats?.deletions ?? 0,
      commitSummary: activity.summary?.slice(0, 120) || '',
      explanation: activity.codeReview || activity.summary || 'No analysis available yet.',
      patterns: [],
      tradeoffs: [],
      relatedFiles,
      unidiffPatch: activity.unidiffPatch,
    };
  }, [analysisFilePath, stream.activities]);

  const handleAnalysisFileClick = useCallback((filePath: string) => {
    setAnalysisFilePath(filePath);
  }, []);

  const handleAnalysisDrillBack = useCallback(() => {
    setAnalysisFilePath(null);
  }, []);

  // Format time from createTime or use index
  const formatTime = (activity: typeof stream.activities[0]) => {
    if (activity.createTime) {
      try {
        return new Date(activity.createTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        // fall through
      }
    }
    return `#${activity.index + 1}`;
  };

  // Map activity type to display label
  const formatEventType = (activityType: string) => {
    const map: Record<string, string> = {
      changeSet: 'CODE',
      planGenerated: 'PLAN',
      planApproved: 'PLAN',
      agentMessaged: 'MSG',
      userMessaged: 'MSG',
      progressUpdated: 'PROGRESS',
    };
    return map[activityType] || activityType.toUpperCase();
  };

  if (isLoadingStack) {
    return (
      <>
        <TopBar
          sessionId={sessionId || undefined}
          sessionTitle={sessionTitle || (sessionId ? sessionId : undefined)}
          sessionRepo={sessionRepo}
          sessionState="idle"
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
          onSessionClose={() => { window.location.href = '/'; }}
          onSettings={() => { window.location.href = '/settings'; }}
        />
        <div className="flex flex-1 items-center justify-center text-[#72728a] text-sm">
          Loading session...
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        sessionId={sessionId || undefined}
        sessionTitle={stream.sessionInfo?.title || sessionTitle || (sessionId ? sessionId : undefined)}
        sessionRepo={stream.sessionInfo?.repo || sessionRepo}
        sessionState={stream.sessionState}
        onPlay={handlePlay}
        onRestart={handleRestart}
        onPause={handlePause}
        onStop={handleStop}
        onSessionClose={() => {
          stream.stop();
          window.location.href = '/';
        }}
        onSettings={() => { window.location.href = '/settings'; }}
      >
        <ToneTrigger
          label={activePersona?.name || selectedTone}
          icon={activePersona?.icon}
          onClick={() => setToneModalOpen(true)}
        />
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={stream.sessionState === 'streaming'}
        />
      </TopBar>
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: timeline */}
        <main className="w-[55%] bg-[#16161a] flex flex-col relative border-r border-[#2a2a35]">
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-12">
            <div className="flex flex-col gap-[40px] w-full pt-8 px-8">
              {stream.activities.length === 0 && stream.sessionState === 'idle' ? (
                <div className="flex items-center justify-center h-64 text-[#72728a] text-sm">
                  Press Play to start streaming
                </div>
              ) : stream.activities.length === 0 && stream.sessionState === 'streaming' ? (
                <div className="flex items-center justify-center h-64 text-[#72728a] text-sm">
                  Waiting for activities...
                </div>
              ) : (
                <>
                  {stream.activities.map((activity, index) => (
                    <TimelineEntry
                      key={activity.activityId}
                      time={formatTime(activity)}
                      eventType={formatEventType(activity.activityType)}
                      active={index === activeLabelIndex}
                    >
                      <LabelCard
                        selected={index === activeLabelIndex}
                        onClick={() => setActiveLabelIndex(index)}
                      >
                        {regeneratingIds.has(activity.activityId) ? (
                          <LabelCardSkeleton />
                        ) : (
                          <LabelPreview
                            repo={stream.sessionInfo?.repo || sessionRepo || ''}
                            sessionId={sessionId}
                            summary={activity.summary}
                            files={activity.files}
                          />
                        )}
                      </LabelCard>
                    </TimelineEntry>
                  ))}
                  {stream.sessionState === 'streaming' && (
                    <TimelineEntry time="--:--" eventType="..." active={false}>
                      <LabelCardSkeleton />
                    </TimelineEntry>
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        {/* Right panel: tabbed */}
        <aside className="w-[45%] bg-sidebar-bg flex flex-col relative h-full">
          {diffFilePath && activeActivity?.unidiffPatch ? (
            <DiffView
              filePath={diffFilePath}
              unidiffPatch={activeActivity.unidiffPatch}
              onBack={handleDiffBack}
            />
          ) : fetchingDiff ? (
            <div className="flex-1 flex items-center justify-center text-[#72728a] text-sm">
              Loading diff...
            </div>
          ) : (
            <>
              <PanelTabs
                tabs={RIGHT_PANEL_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
              {activeTab === 'narration' ? (
                <ReadingPane
                  toneName={activeActivity?.tone || selectedTone}
                  modelName={MODELS.find(m => m.id === (activeActivity?.model || selectedModel))?.name}
                  summary={
                    activeActivity?.summary ||
                    (stream.sessionState === 'idle'
                      ? 'Select a tone and press Play to begin streaming.'
                      : 'Waiting for data...')
                  }
                  files={
                    activeActivity?.files.map(f => ({
                      status: 'M' as const,
                      path: f.path,
                      additions: f.additions,
                      deletions: f.deletions,
                    })) ?? []
                  }
                  status={activeActivity?.status}
                  codeReview={activeActivity?.codeReview}
                  onFileClick={activeActivity?.files.length ? handleFileClick : undefined}
                  onRegenerate={showRegenerate ? handleRegenerate : undefined}
                  regenerateLabel={hasCachedVersion ? 'Switch' : 'Regenerate'}
                  versionCount={versionCount}
                  unidiffPatch={activeActivity?.unidiffPatch}
                  versions={activeActivity?.versions}
                  onVersionSelect={handleVersionSelect}
                />
              ) : activeTab === 'analysis' ? (
                analysisFilePath && fileAnalysisData ? (
                  <FileAnalysisView
                    data={fileAnalysisData}
                    onBack={handleAnalysisDrillBack}
                    onFileClick={handleAnalysisFileClick}
                  />
                ) : (
                  <AnalysisPane
                    summary={
                      stream.activities.length > 0
                        ? `Session analysis across ${stream.activities.length} activit${stream.activities.length === 1 ? 'y' : 'ies'} in ${stream.sessionInfo?.repo || sessionRepo || 'this repository'}.`
                        : undefined
                    }
                    totalFiles={analysisData.totalFiles}
                    totalAdditions={analysisData.totalAdditions}
                    totalDeletions={analysisData.totalDeletions}
                    keyFiles={analysisData.keyFiles}
                    fileTree={analysisData.fileTree}
                    onFileClick={handleAnalysisFileClick}
                  />
                )
              ) : activeTab === 'recs' ? (
                <div className="flex-1 flex items-center justify-center text-[#72728a] text-sm">
                  Recommendations coming soon
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#72728a] text-sm">
                  Memory coming soon
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Tone customization modal */}
      <ToneModal
        isOpen={toneModalOpen}
        initialPersonaId={activePersona?.id ?? null}
        initialCustomInstructions={customInstructions}
        onClose={() => setToneModalOpen(false)}
        onApply={handleToneApply}
      />

      {/* Printer dropdown overlay */}
      {printerDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPrinterDropdownOpen(false)}
        >
          <div
            className="absolute bottom-10 left-3"
            onClick={(e) => e.stopPropagation()}
          >
            <PrinterDropdown
              printers={printerOptions}
              selectedPrinter={selectedPrinter}
              onSelectPrinter={handlePrinterSelect}
              onScan={handleScanPrinters}
            />
          </div>
        </div>
      )}

      <StatusBar
        printerName={selectedPrinter}
        printerOnline={selectedPrinterData?.online ?? false}
        labelCount={stream.activities.length}
        printedCount={0}
        onPrinterClick={() => setPrinterDropdownOpen((prev) => !prev)}
      />
    </>
  );
}
