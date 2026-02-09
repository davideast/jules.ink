import { useCallback, useState } from 'react';
import { TopBar } from '../TopBar';
import { ApiKeyForm } from '../ApiKeyForm';

export function SetupPage() {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (keys: { geminiKey: string; julesKey: string }) => {
      setSaving(true);
      setError(null);
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
        window.location.href = '/';
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save keys');
        setSaving(false);
      }
    },
    [],
  );

  return (
    <>
      <TopBar />
      <main className="flex-1 flex flex-col items-center justify-center w-full px-4 overflow-y-auto">
        <ApiKeyForm onSubmit={handleSubmit} disabled={saving} error={error} />
      </main>
    </>
  );
}
