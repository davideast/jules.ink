import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Mock jules-ink/summarizer
vi.mock('jules-ink/summarizer', () => ({
  SessionSummarizer: class {
    constructor() {}
    styleTransfer() { return Promise.resolve('mock summary'); }
  }
}));

// Mock fs BEFORE importing the module under test
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    default: {
      ...actual as any,
      readFile: vi.fn().mockResolvedValue('{"mock": "data"}'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      readdir: vi.fn().mockResolvedValue([]),
    },
    readFile: vi.fn().mockResolvedValue('{"mock": "data"}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
  };
});

import { GET as GET_ID } from '../ui/src/pages/api/print-stack/[id]/index.ts';
import { POST as POST_STACK } from '../ui/src/pages/api/print-stack/index.ts';
import { GET as GET_REGENERATE } from '../ui/src/pages/api/print-stack/[id]/regenerate.ts';

describe('Vulnerability Check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementation
    const readFileMock = fs.readFile as unknown as ReturnType<typeof vi.fn>;
    readFileMock.mockResolvedValue('{"mock": "data"}');
  });

  describe('GET /api/print-stack/[id]', () => {
    it('should prevent path traversal and return 400', async () => {
        const maliciousId = '../../../../etc/passwd';
        const context = {
          params: { id: maliciousId },
          request: new Request('http://localhost'),
        };

        const response = await GET_ID(context as any);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('invalid id');

        const readFileMock = fs.readFile as unknown as ReturnType<typeof vi.fn>;
        expect(readFileMock).not.toHaveBeenCalled();
      });

      it('should allow valid IDs', async () => {
        const validId = 'valid-stack-id_123';
        const context = {
          params: { id: validId },
          request: new Request('http://localhost'),
        };

        const response = await GET_ID(context as any);
        expect(response.status).toBe(200);

        const readFileMock = fs.readFile as unknown as ReturnType<typeof vi.fn>;
        expect(readFileMock).toHaveBeenCalled();
        const calledPath = readFileMock.mock.calls[0][0] as string;
        expect(calledPath).toContain('valid-stack-id_123.json');
      });
  });

  describe('POST /api/print-stack', () => {
      it('should reject invalid stack ID in POST', async () => {
          const maliciousStack = { id: '../../../../etc/passwd', foo: 'bar' };
          const request = new Request('http://localhost', {
              method: 'POST',
              body: JSON.stringify(maliciousStack)
          });

          const response = await POST_STACK({ request } as any);
          expect(response.status).toBe(400);

          const body = await response.json();
          expect(body.error).toBe('invalid stack id');

          const writeFileMock = fs.writeFile as unknown as ReturnType<typeof vi.fn>;
          expect(writeFileMock).not.toHaveBeenCalled();
      });

      it('should allow valid stack ID in POST', async () => {
        const validStack = { id: 'valid-stack_123', foo: 'bar', stackStatus: 'complete' };
        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify(validStack)
        });

        // Mock readFile to throw (file doesn't exist) so we don't hit 409 logic
        const readFileMock = fs.readFile as unknown as ReturnType<typeof vi.fn>;
        readFileMock.mockRejectedValueOnce(new Error('ENOENT'));

        const response = await POST_STACK({ request } as any);
        expect(response.status).toBe(200);

        const writeFileMock = fs.writeFile as unknown as ReturnType<typeof vi.fn>;
        expect(writeFileMock).toHaveBeenCalled();
        const calledPath = writeFileMock.mock.calls[0][0] as string;
        expect(calledPath).toContain('valid-stack_123.json');
      });
  });

  describe('GET /api/print-stack/[id]/regenerate', () => {
      it('should prevent path traversal', async () => {
        const maliciousId = '../../../../etc/passwd';
        const context = {
          params: { id: maliciousId },
          request: new Request('http://localhost'),
        };

        // We expect it to FAIL or behave incorrectly currently.
        // But for the test to pass AFTER fix, we assert correct behavior.
        // If we want to see it fail, we can assert failure first or just observe Vitest output.
        // I'll write the assertion for the FIXED behavior.
        // If not fixed, it will likely return something else (e.g. 500 or 404)
        // OR it will call fs.readFile with malicious path.

        const response = await GET_REGENERATE(context as any);

        // If vulnerability is present, it tries to read file.
        // If file not found (mock returns data, but maybe path is constructed),
        // it parses JSON. If JSON has no activities, it returns 409.
        // If fs.readFile fails, it returns 404.

        // But we want 400 'invalid id' BEFORE fs.readFile

        if (response.status !== 400) {
           // If it's not 400, it means the fix is not applied (or logic is different).
           // We can check if fs.readFile was called with malicious path to confirm vulnerability.
        }

        expect(response.status).toBe(400); // This will fail initially
        const body = await response.json();
        expect(body.error).toBe('invalid id'); // This will fail initially

        const readFileMock = fs.readFile as unknown as ReturnType<typeof vi.fn>;
        // Should not be called with malicious path
        const calls = readFileMock.mock.calls;
        const maliciousCalls = calls.filter((args: any[]) => args[0] && args[0].toString().includes('passwd'));
        expect(maliciousCalls.length).toBe(0);
      });
  });
});
