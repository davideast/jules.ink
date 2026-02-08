import { useState } from 'react';
import { TopBar } from '../TopBar';
import { ToneBar } from '../ToneBar';
import { EmptyState } from '../EmptyState';

const DEFAULT_TONES = [
  'Professional',
  'Noir',
  'Pirate',
  'Shakespearean',
  'Excited',
  'Haiku',
  'Surfer',
  'Butler',
];

export function LandingPage() {
  const [selectedTone, setSelectedTone] = useState<string>('Professional');

  const handleSessionInput = (id: string) => {
    if (id.trim()) {
      window.location.href = `/session?id=${encodeURIComponent(id.trim())}`;
    }
  };

  return (
    <>
      <TopBar onSessionInput={handleSessionInput} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ToneBar
          tones={DEFAULT_TONES}
          selectedTone={selectedTone}
          onSelectTone={setSelectedTone}
        />
        <EmptyState />
      </div>
    </>
  );
}
