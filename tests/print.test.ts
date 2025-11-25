import { describe, it, beforeEach, vi, expect } from 'vitest';
import thermal from '../src/print.js'; // Use .js extension for modules
import { exec } from 'node:child_process';
import { writeFile, unlink, access } from 'node:fs/promises';

// --- Mocks Setup ---

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
}));

// Cast the mocked functions for type safety and autocompletion
const mockedExec = vi.mocked(exec);
const mockedWriteFile = vi.mocked(writeFile);
const mockedUnlink = vi.mocked(unlink);
const mockedAccess = vi.mocked(access);


describe('Printer Module', () => {
  const hw = thermal();

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Default mock implementations
    mockedWriteFile.mockResolvedValue(undefined);
    mockedUnlink.mockResolvedValue(undefined);
    mockedAccess.mockResolvedValue(undefined);

    mockedExec.mockImplementation(((cmd: string, cb: any) => {
      // 1. Simulate "lpstat -p -d" (List printers)
      if (cmd.includes('lpstat -p -d')) {
        cb(null, { stdout: `
printer Zebra_LP2844 idle. enabled since Mon 01 Jan 00:00:00 2024
printer Rollo_USB disabled. enabled since Mon 01 Jan 00:00:00 2024
system default destination: Zebra_LP2844
        `, stderr: '' });
        return;
      }

      // 2. Simulate "lpstat -v" (List devices/protocols)
      if (cmd.includes('lpstat -v')) {
        cb(null, { stdout: `
device for Zebra_LP2844: usb://Zebra/LP2844?serial=12345
device for Rollo_USB: usb://Rollo/Printer?serial=67890
        `, stderr: '' });
        return;
      }

      // 3. Simulate "lpstat -p <name>" (Check status)
      if (cmd.includes('lpstat -p')) {
        if (cmd.includes('Rollo')) {
          cb(null, { stdout: 'printer Rollo_USB disabled since...', stderr: '' });
        } else {
          cb(null, { stdout: 'printer Zebra_LP2844 idle. enabled since...', stderr: '' });
        }
        return;
      }

      // 4. Simulate "cupsenable" / "cupsaccept"
      if (cmd.includes('cupsenable') || cmd.includes('cupsaccept')) {
        cb(null, { stdout: '', stderr: '' });
        return;
      }

      // 5. Simulate "lp" (Print command)
      if (cmd.startsWith('lp ')) {
        cb(null, { stdout: 'request id is Zebra_LP2844-42 (1 file(s))', stderr: '' });
        return;
      }

      cb(new Error(`Unknown command: ${cmd}`));
    }) as any); // Use `as any` to match the complex signature of exec
  });

  it('scans and parses printers correctly', async () => {
    const devices = await hw.scan();

    expect(devices).toHaveLength(2);

    // Check Parsing
    const zebra = devices.find(d => d.name === 'Zebra_LP2844');
    expect(zebra).toBeDefined();
    if (!zebra) return; // type guard

    expect(zebra.def).toBe(true);
    expect(zebra.usb).toBe(true);
    expect(zebra.stat.trim()).toBe('idle. enabled since Mon 01 Jan 00:00:00 2024');
  });

  it('finds the preferred printer (Default + USB)', async () => {
    const printer = await hw.find();
    expect(printer).toBeDefined();
    if (!printer) return;
    expect(printer.name).toBe('Zebra_LP2844');
  });

  it('detects and fixes a disabled printer', async () => {
    await hw.fix('Rollo_USB');

    // Should call lpstat -p, then cupsenable, then cupsaccept
    const calls = mockedExec.mock.calls.map(c => c[0]);

    expect(calls.some(cmd => cmd.includes('lpstat -p "Rollo_USB"'))).toBe(true);
    expect(calls.some(cmd => cmd.includes('cupsenable "Rollo_USB"'))).toBe(true);
    expect(calls.some(cmd => cmd.includes('cupsaccept "Rollo_USB"'))).toBe(true);
  });

  it('prints a buffer by creating and cleaning up a temp file', async () => {
    const buffer = Buffer.from('mock-image-data');
    const jobId = await hw.print('Zebra_LP2844', buffer, { fit: true, copies: 2 });

    expect(jobId).toBe('42');

    // Verify File Operations
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    expect(mockedUnlink).toHaveBeenCalledTimes(1);

    // Verify Print Command Arguments
    const printCall = mockedExec.mock.calls.find(c => c[0].startsWith('lp '));
    const cmd = printCall?.[0] as string;

    expect(cmd).toBeDefined();
    expect(cmd).toContain('-d "Zebra_LP2844"');
    expect(cmd).toContain('-o fit-to-page');
    expect(cmd).toContain('-n 2');
    // Ensure temp file path is quoted and at the end
    expect(cmd).toMatch(/"\/.*sticker-.*\.png"$/);
  });

  it('prints a file path directly without temp files', async () => {
    const path = '/tmp/existing-image.png';
    await hw.print('Zebra_LP2844', path);

    expect(mockedWriteFile).not.toHaveBeenCalled();
    expect(mockedUnlink).not.toHaveBeenCalled();
    expect(mockedAccess).toHaveBeenCalledTimes(1);

    const printCall = mockedExec.mock.calls.find(c => c[0].startsWith('lp '));
    expect(printCall?.[0]).toContain(`"${path}"`);
  });

  it('cleans up temp file even if printing fails', async () => {
    // Force lp to fail for this specific test
    mockedExec.mockImplementation(((cmd: string, cb: any) => {
      if (cmd.startsWith('lp ')) {
        cb(new Error('Printer on fire'));
        return;
      }
      // Fallback to the default implementation for other commands if needed
      // (not necessary in this specific test case but good practice)
       if (cmd.includes('lpstat -p -d')) cb(null, { stdout: '', stderr: '' });
       else if (cmd.includes('lpstat -v')) cb(null, { stdout: '', stderr: '' });
       else cb(null, { stdout: '', stderr: '' });

    }) as any);

    const promise = hw.print('Zebra_LP2844', Buffer.from('data'));
    await expect(promise).rejects.toThrow('Printer on fire');

    // Must still cleanup
    expect(mockedUnlink).toHaveBeenCalledTimes(1);
  });
});
