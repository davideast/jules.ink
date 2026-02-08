import { useState, useCallback, useEffect } from 'react';
import { TopBar } from '../TopBar';
import type { SessionState } from '../TopBar';
import { ToneBar } from '../ToneBar';
import { TimelineEntry } from '../TimelineEntry';
import { LabelCard } from '../LabelCard';
import { ReadingPane } from '../ReadingPane';
import { ToneCreator } from '../ToneCreator';
import type { SavedTone } from '../ToneCreator';
import { StatusBar } from '../StatusBar';
import { PrinterDropdown } from '../PrinterDropdown';
import type { PrinterOption } from '../PrinterDropdown';
import { useSessionStream } from '../../hooks/useSessionStream';
import { usePrinters } from '../../hooks/usePrinters';

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
}

export function SessionPage({ sessionId = '' }: SessionPageProps) {
  const [selectedTone, setSelectedTone] = useState<string>('Noir');
  const [rightPanelMode, setRightPanelMode] =
    useState<RightPanelMode>('reading');
  const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
  const [activeLabelIndex, setActiveLabelIndex] = useState(0);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [savedTones, setSavedTones] = useState<SavedTone[]>([]);

  const stream = useSessionStream();
  const printerHook = usePrinters();

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

  const handlePlay = useCallback(() => {
    if (stream.sessionState === 'paused') {
      stream.resume();
    } else {
      stream.play(sessionId, selectedTone.toLowerCase());
    }
  }, [sessionId, selectedTone, stream]);

  const handlePause = useCallback(() => {
    stream.pause();
  }, [stream]);

  const handleStop = useCallback(() => {
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
      setSavedTones((prev) => [...prev, { name, instructions }]);
      setRightPanelMode('reading');
    },
    [],
  );

  const handleDeleteTone = useCallback((name: string) => {
    setSavedTones((prev) => prev.filter((t) => t.name !== name));
  }, []);

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
        sessionTitle={stream.sessionInfo?.title || (sessionId ? 'Loading...' : undefined)}
        sessionState={stream.sessionState}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSessionClose={() => {
          stream.stop();
          window.location.href = '/';
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: tone bar + timeline */}
        <main className="w-[55%] bg-[#16161a] flex flex-col relative border-r border-[#2a2a35]">
          <ToneBar
            tones={allTones}
            selectedTone={selectedTone}
            onSelectTone={setSelectedTone}
            onAddTone={handleAddTone}
            addButtonActive={rightPanelMode === 'creating'}
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
                      {activity.imageUrl ? (
                        <img
                          src={activity.imageUrl}
                          alt={activity.summary}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full p-6">
                          <div className="animate-pulse flex flex-col gap-3 w-full">
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                            <div className="h-2 bg-gray-200 rounded w-1/3" />
                            <div className="h-8 bg-gray-200 rounded w-full mt-4" />
                            <div className="h-8 bg-gray-200 rounded w-5/6" />
                          </div>
                        </div>
                      )}
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
              toneName={selectedTone}
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
