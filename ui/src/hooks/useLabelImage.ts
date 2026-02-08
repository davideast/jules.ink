import { useState, useCallback } from 'react';

export interface UseLabelImageReturn {
  imageUrl: string | null;
  loading: boolean;
  generate: (labelData: object) => Promise<void>;
}

export function useLabelImage(): UseLabelImageReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (labelData: object) => {
    setLoading(true);
    try {
      const res = await fetch('/api/label/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(labelData),
      });

      if (!res.ok) throw new Error('Failed to generate label');

      const blob = await res.blob();

      // Revoke previous URL to prevent memory leaks
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { imageUrl, loading, generate };
}
