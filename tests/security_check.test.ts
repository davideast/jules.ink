import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

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
});
