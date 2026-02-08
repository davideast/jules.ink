import { useState, useCallback } from 'react';
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

type RightPanelMode = 'reading' | 'creating';

interface LabelData {
  id: string;
  time: string;
  eventType: string;
  content: React.ReactNode;
}

const DEFAULT_TONES = [
  'Noir',
  'Professional',
  'Pirate',
  'Shakespearean',
  'Excited',
  'Haiku',
  'Surfer',
  'Butler',
];

const DEMO_LABELS: LabelData[] = [
  {
    id: '1',
    time: '10:42 AM',
    eventType: 'CODE',
    content: (
      <>
        <div className="flex flex-col gap-4">
          <div className="w-2/3 h-4 bg-black rounded-sm" />
          <div className="w-1/3 h-2 bg-gray-400 rounded-sm" />
          <div className="mt-8 flex flex-col gap-2">
            <div className="w-full h-1.5 bg-gray-800 rounded-sm" />
            <div className="w-full h-1.5 bg-gray-800 rounded-sm" />
            <div className="w-5/6 h-1.5 bg-gray-800 rounded-sm" />
            <div className="w-full h-1.5 bg-gray-800 rounded-sm" />
            <div className="w-4/5 h-1.5 bg-gray-800 rounded-sm" />
          </div>
        </div>
        <div className="mt-auto self-end opacity-80">
          <div className="w-12 h-12 border border-black p-0.5 grid grid-cols-2 gap-0.5">
            <div className="bg-black" />
            <div className="bg-transparent" />
            <div className="bg-transparent" />
            <div className="bg-black" />
          </div>
        </div>
      </>
    ),
  },
  {
    id: '2',
    time: '10:45 AM',
    eventType: 'PLAN',
    content: (
      <>
        <div className="flex flex-col gap-4">
          <div className="w-3/4 h-4 bg-black rounded-sm" />
          <div className="w-1/2 h-2 bg-gray-400 rounded-sm" />
          <div className="mt-6 flex flex-col gap-2">
            <div className="w-full h-1.5 bg-gray-800 rounded-sm" />
            <div className="w-11/12 h-1.5 bg-gray-800 rounded-sm" />
            <div className="w-full h-1.5 bg-gray-800 rounded-sm" />
          </div>
        </div>
        <div className="flex justify-between items-end border-t-2 border-black pt-4 mt-auto">
          <div className="text-xs font-mono font-bold">JD-204</div>
          <div className="w-12 h-1.5 bg-gray-800 rounded-sm" />
        </div>
      </>
    ),
  },
  {
    id: '3',
    time: '11:02 AM',
    eventType: 'CODE',
    content: (
      <div className="flex flex-col gap-4 text-center items-center pt-4">
        <div className="w-16 h-16 rounded-full border-[4px] border-black flex items-center justify-center mb-2">
          <span className="material-symbols-outlined text-black text-3xl">
            local_police
          </span>
        </div>
        <div className="w-3/4 h-4 bg-black rounded-sm" />
        <div className="mt-2 flex flex-col gap-2 w-full items-center">
          <div className="w-5/6 h-1.5 bg-gray-600 rounded-sm" />
          <div className="w-4/5 h-1.5 bg-gray-600 rounded-sm" />
        </div>
      </div>
    ),
  },
];

const DEMO_PRINTERS: PrinterOption[] = [
  { name: 'PM-241-BT', online: true },
  { name: 'DYMO-450', online: false },
];

const DEMO_SAVED_TONES: SavedTone[] = [
  {
    name: 'Surfer',
    instructions:
      "Uses a lot of slang like 'radical' and 'tubular', very relaxed pacing, ends sentences with 'dude'...",
  },
  {
    name: 'Butler',
    instructions:
      "Extremely polite and formal, refers to the user as 'Sir' or 'Madam', uses sophisticated vocabulary...",
  },
];

export function SessionPage() {
  const [selectedTone, setSelectedTone] = useState<string>('Noir');
  const [rightPanelMode, setRightPanelMode] =
    useState<RightPanelMode>('reading');
  const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
  const [activeLabelIndex, setActiveLabelIndex] = useState(0);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(
    'PM-241-BT',
  );
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [savedTones, setSavedTones] = useState<SavedTone[]>(DEMO_SAVED_TONES);

  const handlePlay = useCallback(() => {
    setSessionState('streaming');
  }, []);

  const handlePause = useCallback(() => {
    setSessionState('paused');
  }, []);

  const handleStop = useCallback(() => {
    setSessionState('idle');
  }, []);

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

  const selectedPrinterData = DEMO_PRINTERS.find(
    (p) => p.name === selectedPrinter,
  );

  return (
    <>
      <TopBar
        sessionId="7058525"
        sessionTitle="Debugging Core Dump"
        sessionState={sessionState}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSessionClose={() => {
          window.location.href = '/';
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: tone bar + timeline */}
        <main className="w-[55%] bg-[#16161a] flex flex-col relative border-r border-[#2a2a35]">
          <ToneBar
            tones={DEFAULT_TONES}
            selectedTone={selectedTone}
            onSelectTone={setSelectedTone}
            onAddTone={handleAddTone}
            addButtonActive={rightPanelMode === 'creating'}
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-12">
            <div className="flex flex-col gap-[40px] w-full pt-8 px-8">
              {DEMO_LABELS.map((label, index) => (
                <TimelineEntry
                  key={label.id}
                  time={label.time}
                  eventType={label.eventType}
                  active={index === activeLabelIndex}
                >
                  <LabelCard
                    selected={index === activeLabelIndex}
                    onClick={() => setActiveLabelIndex(index)}
                  >
                    {label.content}
                  </LabelCard>
                </TimelineEntry>
              ))}
            </div>
          </div>
        </main>

        {/* Right panel: reading pane or tone creator */}
        <aside className="w-[45%] bg-sidebar-bg flex flex-col relative h-full">
          {rightPanelMode === 'reading' ? (
            <ReadingPane
              toneName={selectedTone}
              summary="The authentication module walked in wearing a trench coat. It refactored the handshake protocol and didn't leave a forwarding address."
              files={[
                {
                  status: 'M',
                  path: 'src/api-client.ts',
                  additions: 34,
                  deletions: 9,
                },
                {
                  status: 'M',
                  path: 'src/session.ts',
                  additions: 13,
                  deletions: 4,
                },
                {
                  status: 'A',
                  path: 'src/types.ts',
                  additions: 10,
                  deletions: 0,
                },
              ]}
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
              printers={DEMO_PRINTERS}
              selectedPrinter={selectedPrinter}
              onSelectPrinter={handlePrinterSelect}
              onScan={() => {}}
            />
          </div>
        </div>
      )}

      <StatusBar
        printerName={selectedPrinter}
        printerOnline={selectedPrinterData?.online ?? false}
        labelCount={DEMO_LABELS.length}
        printedCount={DEMO_LABELS.length}
        onPrinterClick={() => setPrinterDropdownOpen((prev) => !prev)}
      />
    </>
  );
}
