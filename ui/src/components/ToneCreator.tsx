import { InspirationChip } from './InspirationChip';
import { SavedToneEntry } from './SavedToneEntry';

export interface SavedTone {
  name: string;
  instructions: string;
}

export interface ToneCreatorProps {
  savedTones?: SavedTone[];
  onSave?: (name: string, instructions: string) => void;
  onDeleteTone?: (name: string) => void;
  onSelectTone?: (name: string) => void;
  onClose?: () => void;
}

const INSPIRATION_SUGGESTIONS = [
  'Sports commentator',
  'Confused time traveler',
  'Passive-aggressive reviewer',
  'Overenthusiastic intern',
];

export function ToneCreator({
  savedTones = [],
  onSave,
  onDeleteTone,
  onSelectTone,
  onClose,
}: ToneCreatorProps) {
  return (
    <div className="flex-1 px-[40px] py-[32px] overflow-y-auto custom-scrollbar">
      <div className="flex flex-col h-full gap-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-soft-white tracking-tight">
            Create a Tone
          </h2>
          <button
            className="text-[#72728a] hover:text-white transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const name = (form.elements.namedItem('toneName') as HTMLInputElement).value;
            const instructions = (form.elements.namedItem('voiceInstructions') as HTMLTextAreaElement).value;
            onSave?.(name, instructions);
          }}
        >
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase">
              Name
            </label>
            <input
              name="toneName"
              className="w-full bg-[#16161a] border border-[#2a2a32] rounded-md px-4 py-2.5 text-sm text-soft-white placeholder-[#72728a]/60 focus:outline-none focus:border-[#72728a] transition-colors"
              placeholder="e.g., Surfer"
              type="text"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase">
              Voice Instructions
            </label>
            <textarea
              name="voiceInstructions"
              className="w-full bg-[#16161a] border border-[#2a2a32] rounded-md px-4 py-3 text-sm text-soft-white placeholder-[#72728a]/60 italic focus:outline-none focus:border-[#72728a] transition-colors resize-none h-[100px]"
              placeholder="Describe the voice..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {INSPIRATION_SUGGESTIONS.map((suggestion) => (
              <InspirationChip
                key={suggestion}
                label={suggestion}
                onClick={() => {
                  const textarea = document.querySelector(
                    'textarea[name="voiceInstructions"]',
                  ) as HTMLTextAreaElement | null;
                  if (textarea) {
                    textarea.value = suggestion;
                    textarea.focus();
                  }
                }}
              />
            ))}
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-[#fbfbfe] text-[#16161a] text-sm font-semibold hover:bg-white transition-colors mt-2"
          >
            Save Tone
          </button>
        </form>
        <div className="h-px bg-[#2a2a32] w-full my-2" />
        <div className="flex flex-col gap-4">
          <h3 className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-1">
            Your Tones
          </h3>
          {savedTones.map((tone) => (
            <SavedToneEntry
              key={tone.name}
              name={tone.name}
              preview={tone.instructions}
              onDelete={() => onDeleteTone?.(tone.name)}
              onClick={() => onSelectTone?.(tone.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
