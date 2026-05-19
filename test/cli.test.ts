import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, 'fixtures');

interface Captured {
  stdout: string;
  stderr: string;
}

function capture<T>(fn: () => T): { result: T; captured: Captured } {
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
    const result = fn();
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

  it('exits 0 on clean fixture', () => {
    const { result } = capture(() =>
      main([path.join(fixturesRoot, 'clean'), '--no-config', '--format=plain']),
    );
    expect(result).toBe(0);
  });

  it('exits 1 and writes Xcode-format error to stderr on contamination', () => {
    const { result, captured } = capture(() =>
      main([path.join(fixturesRoot, 'hans-contaminated'), '--no-config', '--format=xcode']),
    );
    expect(result).toBe(1);
    expect(captured.stderr).toMatch(/^.*Localizable\.strings:\d+:\d+: error: zh-lint: /m);
    expect(captured.stderr).toContain('zh-Hans');
  });

  it('exits 1 with GitHub annotation format on stdout', () => {
    const { result, captured } = capture(() =>
      main([path.join(fixturesRoot, 'hant-contaminated'), '--no-config', '--format=github']),
    );
    expect(result).toBe(1);
    expect(captured.stdout).toMatch(/^::error file=.+,line=\d+,col=\d+::zh-lint: /m);
  });

  it('emits a JSON array on --format=json', () => {
    const { result, captured } = capture(() =>
      main([path.join(fixturesRoot, 'hans-contaminated'), '--no-config', '--format=json']),
    );
    expect(result).toBe(1);
    const parsed = JSON.parse(captured.stdout) as Array<Record<string, unknown>>;
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toHaveProperty('char');
    expect(parsed[0]).toHaveProperty('expectedScript');
  });

  it('rejects unknown --format value with exit code 2', () => {
    const { result } = capture(() => main(['--format=bogus', '.']));
    expect(result).toBe(2);
  });

  it('--help exits 0', () => {
    const { result } = capture(() => main(['--help']));
    expect(result).toBe(0);
  });
});
