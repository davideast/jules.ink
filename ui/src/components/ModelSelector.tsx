import { useState, useRef, useEffect } from 'react';

export interface ModelOption {
  id: string;
  name: string;
  icon: string;
  descriptor: string;
}

export const MODELS: ModelOption[] = [
  { id: 'gemini-2.5-flash-lite', name: '2.5 Flash Lite', icon: 'speed', descriptor: 'Fast' },
  { id: 'gemini-2.5-flash', name: '2.5 Flash', icon: 'bolt', descriptor: 'Balanced' },
  { id: 'gemini-3-flash-preview', name: '3.0 Flash', icon: 'bolt', descriptor: 'Next Gen' },
  { id: 'gemini-3-pro-preview', name: '3.0 Pro', icon: 'psychology', descriptor: 'Quality' },
];

export interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2a2a35] text-soft-white border border-[#3f3f4e] hover:border-[#72728a] transition-all text-[13px] font-medium disabled:opacity-50 disabled:pointer-events-none"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span className="material-symbols-outlined text-[16px] text-primary">
          {current.icon}
        </span>
        <span>{current.name}</span>
        <span className="material-symbols-outlined text-[16px] text-[#72728a]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open ? (
        <div className="absolute top-full right-0 mt-2 w-56 bg-[#1e1e24] border border-[#2a2a35] rounded-lg shadow-xl py-1 z-50">
          {MODELS.map((model) => {
            const isSelected = model.id === current.id;
            return (
              <button
                key={model.id}
                className={`w-full text-left px-3 py-2 text-[13px] flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'text-soft-white bg-[#2a2a35]'
                    : 'text-[#72728a] hover:text-soft-white hover:bg-[#2a2a35]'
                }`}
                onClick={() => {
                  onModelChange(model.id);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      isSelected ? 'text-primary' : ''
                    }`}
                  >
                    {model.icon}
                  </span>
                  <span>Gemini {model.name}</span>
                </div>
                <span className="text-[11px] opacity-60">{model.descriptor}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
