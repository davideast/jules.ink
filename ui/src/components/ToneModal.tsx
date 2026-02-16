import { useState, useEffect, useCallback } from 'react';
import { EXPERT_PERSONAS } from '../lib/personas';
import type { ExpertPersona } from '../lib/personas';

export interface ToneModalProps {
  isOpen: boolean;
  initialPersonaId?: string | null;
  initialCustomInstructions?: string;
  initialScope?: 'session' | 'global';
  onClose: () => void;
  onApply: (
    personaId: string | null,
    customInstructions: string,
    scope: 'session' | 'global',
  ) => void;
}

export function ToneModal({
  isOpen,
  initialPersonaId = null,
  initialCustomInstructions = '',
  initialScope = 'session',
  onClose,
  onApply,
}: ToneModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialPersonaId);
  const [customInstructions, setCustomInstructions] = useState(initialCustomInstructions);
  const [scope, setScope] = useState<'session' | 'global'>(initialScope);

  // Sync local state when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      setSelectedId(initialPersonaId ?? null);
      setCustomInstructions(initialCustomInstructions ?? '');
      setScope(initialScope ?? 'session');
    }
  }, [isOpen, initialPersonaId, initialCustomInstructions, initialScope]);

  const selectedPersona = selectedId
    ? EXPERT_PERSONAS.find(p => p.id === selectedId)
    : undefined;

  const handlePresetClick = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const handleApply = useCallback(() => {
    onApply(selectedId, customInstructions, scope);
  }, [selectedId, customInstructions, scope, onApply]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  // Build preview text from persona or custom instructions
  const previewText = selectedPersona
    ? selectedPersona.personality || selectedPersona.role
    : customInstructions || null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#16161a]/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-[480px] bg-[#1e1e24] border border-[#2a2a35] rounded-lg p-8 shadow-2xl flex flex-col gap-6 relative">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between">
            <h2 className="text-[18px] font-semibold text-[#fbfbfe]">
              Customize Intelligence Tone
            </h2>
            <button
              className="text-[#72728a] hover:text-white transition-colors"
              onClick={onClose}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <p className="text-[13px] text-[#72728a]">
            Controls how all narration and responses are styled.
          </p>
        </div>

        {/* Preset Grid */}
        <div className="grid grid-cols-2 gap-2">
          {EXPERT_PERSONAS.map(persona => {
            const isSelected = selectedId === persona.id;
            return (
              <button
                key={persona.id}
                className={
                  isSelected
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded border border-white bg-[#16161a] text-sm text-soft-white font-medium transition-all text-left'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded border border-[#2a2a35] hover:border-[#3f3f4e] hover:bg-[#2a2a35] text-sm text-[#72728a] hover:text-soft-white transition-all text-left'
                }
                onClick={() => handlePresetClick(persona.id)}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {persona.icon}
                </span>
                {persona.name}
              </button>
            );
          })}
        </div>

        {/* Skill Detail (shown when a skill-backed persona is selected) */}
        {selectedPersona?.skillRef && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase">
              Skill
            </span>
            <span className="px-2 py-0.5 rounded bg-[#16161a] border border-[#2a2a35] text-[11px] font-mono text-[#a0a0b0]">
              {selectedPersona.skillRef}
            </span>
            {selectedPersona.focusTags?.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-[#16161a] border border-[#2a2a35] text-[10px] text-[#72728a]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Custom Instructions */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase">
            Custom Instructions
          </label>
          <textarea
            className="w-full h-[80px] bg-[#16161a] border border-[#2a2a35] rounded-md px-3 py-2.5 text-[13px] text-soft-white font-mono placeholder-[#72728a]/60 italic focus:outline-none focus:border-[#72728a] resize-none"
            placeholder="e.g., Explain things as if I'm learning Go..."
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
          />
        </div>

        {/* Preview */}
        {previewText && (
          <div className="bg-[#16161a] border border-[#2a2a35] rounded p-3 flex gap-3 items-start">
            <div className="shrink-0 pt-0.5">
              <span className="material-symbols-outlined text-[#72728a] text-[16px]">
                visibility
              </span>
            </div>
            <p className="text-[13px] text-[#72728a] italic leading-relaxed">
              {previewText}
            </p>
          </div>
        )}

        {/* Scope Selector */}
        <div className="flex flex-col gap-3">
          <label
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setScope('session')}
          >
            <div className="relative flex items-center justify-center w-4 h-4 rounded-full border border-[#2a2a35] bg-[#16161a] group-hover:border-[#72728a] transition-colors">
              {scope === 'session' && (
                <div className="w-2 h-2 rounded-full bg-[#19cc61]" />
              )}
            </div>
            <span
              className={
                scope === 'session'
                  ? 'text-[13px] text-soft-white'
                  : 'text-[13px] text-[#72728a] group-hover:text-soft-white transition-colors'
              }
            >
              This session only
            </span>
          </label>
          <label
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setScope('global')}
          >
            <div className="relative flex items-center justify-center w-4 h-4 rounded-full border border-[#2a2a35] bg-[#16161a] group-hover:border-[#72728a] transition-colors">
              {scope === 'global' && (
                <div className="w-2 h-2 rounded-full bg-[#19cc61]" />
              )}
            </div>
            <span
              className={
                scope === 'global'
                  ? 'text-[13px] text-soft-white'
                  : 'text-[13px] text-[#72728a] group-hover:text-soft-white transition-colors'
              }
            >
              All sessions (global default)
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-2">
          <button
            className="px-5 py-2 rounded-full text-[13px] font-medium text-[#72728a] hover:text-soft-white transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 rounded-full bg-[#fbfbfe] text-[#16161a] text-[13px] font-semibold hover:bg-white transition-colors shadow-sm"
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
