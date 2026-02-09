import { useState, useCallback, useEffect } from 'react';

export interface SavedTone {
  name: string;
  instructions: string;
}

export function useTones() {
  const [tones, setTones] = useState<SavedTone[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tones');
      if (!res.ok) throw new Error('Failed to load tones');
      const data = await res.json();
      setTones(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (name: string, instructions: string) => {
    try {
      const res = await fetch('/api/tones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, instructions }),
      });
      if (!res.ok) throw new Error('Failed to save tone');
      const newTones = await res.json();
      setTones(newTones);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const remove = useCallback(async (name: string) => {
    try {
      const res = await fetch(`/api/tones/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete tone');
      const newTones = await res.json();
      setTones(newTones);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { tones, loading, save, remove };
}
