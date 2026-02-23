import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// Hoisted mock
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  // We want to return an object that mimics the fs module
  // ensure both named export and default export have our mocks
  const mockExistsSync = vi.fn();
  const mockAccess = vi.fn();

  return {
    ...actual,
    existsSync: mockExistsSync,
    promises: {
      ...actual.promises,
      access: mockAccess,
    },
    default: {
      ...actual, // or ...actual.default if it exists? Node fs usually has default = itself
      existsSync: mockExistsSync,
      promises: {
        ...actual.promises,
        access: mockAccess,
      },
    },
  };
});

vi.mock('@napi-rs/canvas', () => ({
  loadImage: vi.fn(),
  GlobalFonts: {
    registerFromPath: vi.fn(),
  },
}));

describe('getTemplate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should load template if file exists', async () => {
    const fs = await import('fs');
    const { loadImage } = await import('@napi-rs/canvas');

    // Setup mocks
    const mockExistsSync = fs.default?.existsSync || fs.existsSync;
    const mockAccess = fs.default?.promises?.access || fs.promises.access;

    (mockExistsSync as any).mockReturnValue(true);
    (mockAccess as any).mockResolvedValue(undefined);
    (loadImage as any).mockResolvedValue('mock-image');

    // Import SUT
    const { getTemplate } = await import('../../../src/label/assets.js');

    const result = await getTemplate();

    expect(result).toBe('mock-image');
  });

  it('should return null if file does not exist', async () => {
    const fs = await import('fs');
    const mockExistsSync = fs.default?.existsSync || fs.existsSync;
    const mockAccess = fs.default?.promises?.access || fs.promises.access;

    // Simulate file existing for resolveAssetsDir (fonts) but NOT for template
    (mockExistsSync as any).mockImplementation((p: string) => {
      if (p.includes('fonts')) return true;
      return false;
    });

    // Async access fails with ENOENT (file not found)
    const error = new Error('File not found');
    (error as any).code = 'ENOENT';
    (mockAccess as any).mockRejectedValue(error);

    const { getTemplate } = await import('../../../src/label/assets.js');

    const result = await getTemplate();
    expect(result).toBeNull();
  });

  it('should return cached promise on subsequent calls', async () => {
    const fs = await import('fs');
    const { loadImage } = await import('@napi-rs/canvas');

    const mockExistsSync = fs.default?.existsSync || fs.existsSync;
    const mockAccess = fs.default?.promises?.access || fs.promises.access;

    (mockExistsSync as any).mockReturnValue(true);
    (mockAccess as any).mockResolvedValue(undefined);
    (loadImage as any).mockResolvedValue('mock-image');

    const { getTemplate } = await import('../../../src/label/assets.js');

    const promise1 = getTemplate();
    const promise2 = getTemplate();

    // Since getTemplate is async, it returns a new promise wrapper each time.
    // We verify caching by checking call counts on the underlying operation.
    expect(await promise1).toBe('mock-image');
    expect(await promise2).toBe('mock-image');

    expect(loadImage).toHaveBeenCalledTimes(1);
  });
});
