import { useState, useCallback } from 'react';

export interface PrinterInfo {
  name: string;
  online: boolean;
  isUsb: boolean;
}

export interface UsePrintersReturn {
  printers: PrinterInfo[];
  loading: boolean;
  scan: () => Promise<void>;
  print: (printerName: string, labelData: object) => Promise<string>;
}

export function usePrinters(): UsePrintersReturn {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/printers');
      const data = await res.json();
      setPrinters(data.printers || []);
    } catch {
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const print = useCallback(async (printerName: string, labelData: object): Promise<string> => {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName, labelData }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Print failed');
    return data.jobId;
  }, []);

  return { printers, loading, scan, print };
}
