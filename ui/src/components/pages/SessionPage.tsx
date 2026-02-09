import { useState, useCallback, useEffect, useRef } from 'react';
import { TopBar } from '../TopBar';
import type { SessionState } from '../TopBar';
import { ToneBar } from '../ToneBar';
import { TimelineEntry } from '../TimelineEntry';
import { LabelCard } from '../LabelCard';
import { LabelPreview } from '../LabelPreview';
import { ModelSelector } from '../ModelSelector';
import { ReadingPane } from '../ReadingPane';
import { ToneCreator } from '../ToneCreator';
import type { SavedTone } from '../ToneCreator';
import { StatusBar } from '../StatusBar';
import { PrinterDropdown } from '../PrinterDropdown';
import type { PrinterOption } from '../PrinterDropdown';
import { useSessionStream } from '../../hooks/useSessionStream';
import { usePrinters } from '../../hooks/usePrinters';
import { useTones } from '../../hooks/useTones';
import {
  type PrintStack,
  savePrintStack,
} from '../../lib/print-stack';

type RightPanelMode = 'reading' | 'creating';

const DEFAULT_TONES = [
  'Noir',
  'Professional',
  'Pirate',
  'Shakespearean',
  'Excited',
  'Haiku',
];

interface SessionPageProps {
  sessionId?: string;
  sessionTitle?: string;
  sessionRepo?: string;
  sessionStatus?: string;
  sessionPrompt?: string;
}

export function SessionPage({
  sessionId = '',
  sessionTitle,
  sessionRepo,
  sessionStatus,
  sessionPrompt,
}: SessionPageProps) {
  const [selectedTone, setSelectedTone] = useState<string>('Noir');
  const [rightPanelMode, setRightPanelMode] =
    useState<RightPanelMode>('reading');
  const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
  const [activeLabelIndex, setActiveLabelIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-lite');
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [currentStackId, setCurrentStackId] = useState<string | null>(null);

  const stackMetadataRef = useRef<{ startedAt: string; tone: string; repo: string } | null>(null);

  const stream = useSessionStream();
  const printerHook = usePrinters();
  const { tones: savedTones, save: saveTone, remove: removeTone } = useTones();

  // Map printer data to PrinterOption format
  const printerOptions: PrinterOption[] = printerHook.printers.map(p => ({
    name: p.name,
    online: p.online,
  }));

  // Auto-select latest activity as it arrives
  useEffect(() => {
    if (stream.activities.length > 0) {
      setActiveLabelIndex(stream.activities.length - 1);
    }
  }, [stream.activities.length]);

  // Update tone in stream when selectedTone changes
  useEffect(() => {
    stream.setTone(selectedTone.toLowerCase());
  }, [selectedTone, stream]);

  // Persist activities to PrintStack
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
      activities: activitiesToSave,
    };
    savePrintStack(updatedStack).catch((err) => console.error('Failed to save stack', err));
  }, [currentStackId, stream.activities, stream.sessionInfo, sessionId]);

  const handlePlay = useCallback(() => {
    if (stream.sessionState === 'paused') {
      stream.resume();
    } else {
      const newStackId = crypto.randomUUID();
      const startedAt = new Date().toISOString();
      const repo = stream.sessionInfo?.repo || '';

      stackMetadataRef.current = {
        startedAt,
        tone: selectedTone,
        repo
      };

      const newStack: PrintStack = {
        id: newStackId,
        sessionId: sessionId,
        tone: selectedTone,
        repo: repo,
        startedAt: startedAt,
        activities: [],
      };
      savePrintStack(newStack).catch((err) => console.error('Failed to save initial stack', err));
      setCurrentStackId(newStackId);

      stream.play(sessionId, selectedTone.toLowerCase(), selectedModel);
    }
  }, [sessionId, selectedTone, selectedModel, stream]);

  const handlePause = useCallback(() => {
    stream.pause();
  }, [stream]);

  const handleStop = useCallback(() => {
    setCurrentStackId(null);
    stream.stop();
    setActiveLabelIndex(0);
  }, [stream]);

  const handleAddTone = useCallback(() => {
    setRightPanelMode((prev) =>
      prev === 'creating' ? 'reading' : 'creating',
    );
  }, []);

  const handleSaveTone = useCallback(
    (name: string, instructions: string) => {
      if (!name.trim()) return;
      saveTone(name, instructions);
      setRightPanelMode('reading');
    },
    [saveTone],
  );

  const handleDeleteTone = useCallback((name: string) => {
    removeTone(name);
  }, [removeTone]);

  const handleSelectSavedTone = useCallback((name: string) => {
    setSelectedTone(name);
    setRightPanelMode('reading');
  }, []);

  const handlePrinterSelect = useCallback((name: string | null) => {
    setSelectedPrinter(name);
    setPrinterDropdownOpen(false);
  }, []);

  const handleScanPrinters = useCallback(() => {
    printerHook.scan();
  }, [printerHook]);

  // Derive the active activity for the reading pane
  const activeActivity = stream.activities[activeLabelIndex] ?? null;

  // Derive selected printer data
  const selectedPrinterData = printerOptions.find(
    (p) => p.name === selectedPrinter,
  );

  // All tones: defaults + saved custom tones
  const allTones = [...DEFAULT_TONES, ...savedTones.map(t => t.name)];

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

  return (
    <>
      <TopBar
        sessionId={sessionId || undefined}
        sessionTitle={stream.sessionInfo?.title || sessionTitle || (sessionId ? sessionId : undefined)}
        sessionRepo={stream.sessionInfo?.repo || sessionRepo}
        sessionState={stream.sessionState}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSessionClose={() => {
          stream.stop();
          window.location.href = '/';
        }}
        onSettings={() => { window.location.href = '/settings'; }}
      >
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          disabled={stream.sessionState === 'streaming'}
        />
      </TopBar>
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: tone bar + timeline */}
        <main className="w-[55%] bg-[#16161a] flex flex-col relative border-r border-[#2a2a35]">
          <ToneBar
            tones={allTones}
            selectedTone={selectedTone}
            onSelectTone={setSelectedTone}
            onAddTone={handleAddTone}
            addButtonActive={rightPanelMode === 'creating'}
            disabled={stream.sessionState === 'streaming'}
          />
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
                stream.activities.map((activity, index) => (
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
                      <LabelPreview
                        repo={stream.sessionInfo?.repo || sessionRepo || ''}
                        sessionId={sessionId}
                        summary={activity.summary}
                        files={activity.files}
                      />
                    </LabelCard>
                  </TimelineEntry>
                ))
              )}
            </div>
          </div>
        </main>

        {/* Right panel: reading pane or tone creator */}
        <aside className="w-[45%] bg-sidebar-bg flex flex-col relative h-full">
          {rightPanelMode === 'reading' ? (
            <ReadingPane
              toneName={activeActivity?.tone || selectedTone}
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
            />
          ) : (
            <ToneCreator
              savedTones={savedTones}
              onSave={handleSaveTone}
              onDeleteTone={handleDeleteTone}
              onSelectTone={handleSelectSavedTone}
              onClose={() => setRightPanelMode('reading')}
            />
          )}
        </aside>
      </div>

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
