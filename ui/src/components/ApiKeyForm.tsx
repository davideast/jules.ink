import { useState } from 'react';

export interface ApiKeyFormProps {
  onSubmit: (keys: { geminiKey: string; julesKey: string }) => void;
  disabled?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  footerText?: string | null;
  initialGeminiKey?: string;
  initialJulesKey?: string;
}

export function ApiKeyForm({
  onSubmit,
  disabled,
  error,
  title = 'Configure API Keys',
  subtitle = 'Enter your API keys to get started. Keys are stored securely on the server.',
  submitLabel = 'Save & Continue',
  footerText = 'Keys can be updated anytime in settings',
  initialGeminiKey = '',
  initialJulesKey = '',
}: ApiKeyFormProps) {
  const [geminiKey, setGeminiKey] = useState(initialGeminiKey);
  const [julesKey, setJulesKey] = useState(initialJulesKey);

  const canSubmit =
    !disabled && geminiKey.trim().length > 0 && julesKey.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit({ geminiKey: geminiKey.trim(), julesKey: julesKey.trim() });
    }
  };

  return (
    <div className="w-full max-w-[480px] flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div>
          <span className="material-symbols-outlined text-[32px] text-[#72728a] opacity-50">
            key
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-[20px] font-display text-[#fbfbfe] font-medium leading-tight">
            {title}
          </h2>
          <p className="text-[13px] text-[#72728a] leading-normal">
            {subtitle}
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wide text-[#72728a] font-medium font-display">
            GEMINI API KEY
          </label>
          <input
            className="w-full bg-[#16161a] border border-[#2a2a35] rounded-md px-3 py-2.5 text-[14px] text-[#fbfbfe] placeholder-[#72728a]/40 focus:outline-none focus:border-[#72728a] focus:ring-0 transition-colors font-mono"
            placeholder="AIza..."
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
          <span className="text-[12px] text-[#72728a] opacity-60">
            Required for AI content generation
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wide text-[#72728a] font-medium font-display">
            JULES API KEY
          </label>
          <input
            className="w-full bg-[#16161a] border border-[#2a2a35] rounded-md px-3 py-2.5 text-[14px] text-[#fbfbfe] placeholder-[#72728a]/40 focus:outline-none focus:border-[#72728a] focus:ring-0 transition-colors font-mono"
            placeholder="jules_..."
            type="password"
            value={julesKey}
            onChange={(e) => setJulesKey(e.target.value)}
          />
          <span className="text-[12px] text-[#72728a] opacity-60">
            Required for session streaming
          </span>
        </div>

        <div className="pt-2">
          {error ? (
            <p className="text-[12px] text-red-500 mb-2">{error}</p>
          ) : null}
          <button
            className={`w-full rounded-full bg-[#fbfbfe] text-[#16161a] py-2.5 text-[14px] font-semibold transition-colors ${
              canSubmit
                ? 'hover:bg-white cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
            type="submit"
            disabled={!canSubmit}
          >
            {disabled ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>

      {footerText ? (
        <div className="text-center">
          <p className="text-[12px] text-[#72728a] opacity-50">{footerText}</p>
        </div>
      ) : null}
    </div>
  );
}
