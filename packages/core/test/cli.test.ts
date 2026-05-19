import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, '_fixtures');
const mockPluginPath = path.join(fixturesRoot, 'mock-plugin.mjs');

interface Captured {
  stdout: string;
  stderr: string;
}

async function capture<T>(fn: () => Promise<T>): Promise<{ result: T; captured: Captured }> {
  const captured: Captured = { stdout: '', stderr: '' };
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      captured.stdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      captured.stderr += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
      return true;
    });
  try {
    const result = await fn();
    return { result, captured };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  }
}

describe('cli main()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits 0 with --help', async () => {
    const { result, captured } = await capture(() => main(['--help']));
    expect(result).toBe(0);
    expect(captured.stdout).toContain('locale-lint');
  });

  it('exits 2 on unknown --format value', async () => {
    const { result } = await capture(() => main(['--format=bogus', '.']));
    expect(result).toBe(2);
  });

  it('exits 2 when no plugins configured', async () => {
    const { result, captured } = await capture(() =>
      main([fixturesRoot, '--no-config']),
    );
    expect(result).toBe(2);
    expect(captured.stderr).toContain('No plugins configured');
  });

  it('runs the mock plugin via --plugin=<absolute path>', async () => {
    const { result, captured } = await capture(() =>
      main([fixturesRoot, '--no-config', `--plugin=${mockPluginPath}`, '--format=plain']),
    );
    expect(result).toBe(1);
    expect(captured.stdout).toMatch(/mock\.lproj\/Localizable\.strings:\d+:\d+: error: /);
    expect(captured.stdout).toContain('forbidden');
  });

  it('emits Xcode format on stderr', async () => {
    const { result, captured } = await capture(() =>
      main([fixturesRoot, '--no-config', `--plugin=${mockPluginPath}`, '--format=xcode']),
    );
    expect(result).toBe(1);
    expect(captured.stderr).toMatch(/^.*Localizable\.strings:\d+:\d+: error: locale-lint\(mock\): /m);
  });

  it('emits JSON array with structured fields', async () => {
    const { result, captured } = await capture(() =>
      main([fixturesRoot, '--no-config', `--plugin=${mockPluginPath}`, '--format=json']),
    );
    expect(result).toBe(1);
    const parsed = JSON.parse(captured.stdout) as Array<Record<string, unknown>>;
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toMatchObject({
      pluginId: 'mock',
      severity: 'error',
      variantExpected: 'mock-variant',
    });
  });

  it('emits GitHub annotation format on stdout', async () => {
    const { result, captured } = await capture(() =>
      main([fixturesRoot, '--no-config', `--plugin=${mockPluginPath}`, '--format=github']),
    );
    expect(result).toBe(1);
    expect(captured.stdout).toMatch(/^::error file=.+,line=\d+,col=\d+::locale-lint\(mock\): /m);
  });
});
