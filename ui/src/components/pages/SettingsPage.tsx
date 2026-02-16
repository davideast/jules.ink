import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '../TopBar';
import { ApiKeyForm } from '../ApiKeyForm';

export function SettingsPage() {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/keys')
      .then((res) => res.json())
      .then(() => {
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  const handleSubmit = useCallback(
    async (keys: { geminiKey: string; julesKey: string }) => {
      setSaving(true);
      setError(null);
      setSaved(false);
      try {
        const res = await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(keys),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to save keys');
        }
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save keys');
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return (
    <>
      <TopBar />
      <main className="flex-1 flex flex-col items-center justify-center w-full px-4 overflow-y-auto">
        <div className="w-full max-w-[480px] flex flex-col gap-6">
          <a
            href="/"
            className="flex items-center gap-1 text-[13px] text-[#72728a] hover:text-[#fbfbfe] transition-colors font-mono w-fit"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            Back
          </a>
          {loaded ? (
            <ApiKeyForm
              onSubmit={handleSubmit}
              disabled={saving}
              error={error}
              title="Update API Keys"
              subtitle="Enter new API keys to replace the current ones. Both keys are required."
              submitLabel="Save"
              footerText={saved ? 'Keys updated successfully' : null}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-[#72728a] text-sm">
              Loading...
            </div>
          )}
        </div>
      </main>
    </>
  );
}
