import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

// Mock fs BEFORE importing the module under test
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: vi.fn() };
  }
}));

vi.mock('jules-ink/expert-personas', () => ({
  resolvePersonaByName: vi.fn()
}));

vi.mock('jules-ink/skill-loader', () => ({
  loadSkillRules: vi.fn()
}));

vi.mock('jules-ink/summarizer', () => ({
  SessionSummarizer: class {
    styleTransfer = vi.fn();
  }
}));

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
import { POST as POST_SESSION_ANALYSIS } from '../ui/src/pages/api/session-analysis.ts';
import { POST as POST_RESOLVE_CODE_REF } from '../ui/src/pages/api/resolve-code-ref.ts';
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

      it('should block non-string stack ID bypass in POST', async () => {
        // Attempt to pass an array to bypass regex validation if not correctly typed
        const maliciousStack = { id: ['valid-stack_123'], foo: 'bar' };
        const request = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify(maliciousStack)
        });

        const response = await POST_STACK({ request } as any);
        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('invalid stack id');
      });
  });

  describe('POST /api/session-analysis', () => {
    it('should block path traversal via stackId', async () => {
      const maliciousPayload = {
        sessionId: 'test-session',
        tone: 'noir',
        stackId: '../../../../etc/passwd'
      };
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(maliciousPayload)
      });
      const response = await POST_SESSION_ANALYSIS({ request } as any);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('invalid stackId');
    });
  });

  describe('POST /api/resolve-code-ref', () => {
    it('should block path traversal via stackId', async () => {
      const maliciousPayload = {
        stackId: '../../../../etc/passwd',
        filePath: 'test.ts',
        findingText: 'foo',
        sectionKey: 'bar',
        index: 0
      };
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify(maliciousPayload)
      });
      const response = await POST_RESOLVE_CODE_REF({ request } as any);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('invalid stackId');
    });
  });

  describe('GET /api/print-stack/[id]/regenerate', () => {
    it('should prevent path traversal via id parameter', async () => {
      const maliciousId = '../../../../etc/passwd';
      const context = {
        params: { id: maliciousId },
        request: new Request('http://localhost?tone=noir'),
      };
      const response = await GET_REGENERATE(context as any);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('invalid id');
    });
  });
});
