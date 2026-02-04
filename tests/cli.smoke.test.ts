import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

/**
 * Smoke test for the CLI.
 * Verifies that the CLI can be invoked and responds correctly to basic commands.
 * This ensures the packaged CLI will work when published.
 */
describe('CLI Smoke Test', () => {
  const CLI_PATH = path.resolve('./src/cli.ts');

  it('should display help when --help is passed', () => {
    const result = execSync(`npx tsx ${CLI_PATH} --help`, { encoding: 'utf-8' });

    expect(result).toContain('jules-ink');
    expect(result).toContain('Label Pipeline CLI');
    expect(result).toContain('print');
  });

  it('should display version when --version is passed', () => {
    const result = execSync(`npx tsx ${CLI_PATH} --version`, { encoding: 'utf-8' });

    // Version should be a semver-like string
    expect(result.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should display print command help', () => {
    const result = execSync(`npx tsx ${CLI_PATH} print --help`, { encoding: 'utf-8' });

    expect(result).toContain('--session');
    expect(result).toContain('--model');
    expect(result).toContain('--tone');
    expect(result).toContain('--printer');
  });

  it('should error when session is not provided', () => {
    try {
      execSync(`npx tsx ${CLI_PATH} print`, { encoding: 'utf-8', stdio: 'pipe' });
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      // Commander exits with code 1 when required option is missing
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('--session');
    }
  });
});
