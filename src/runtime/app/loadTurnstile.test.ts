// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// happy-dom never fetches a script. It settles each one synchronously on insertion: `error` by
// default, `load` when this setting is on.
const settleScriptsAs = (outcome: 'load' | 'error') => {
  (window as any).happyDOM.settings.handleDisabledFileLoadingAsSuccess = outcome === 'load';
};

const scripts = () => [...document.querySelectorAll<HTMLScriptElement>('script[src*="challenges.cloudflare.com"]')];
const fake = () => ({ render: vi.fn(), remove: vi.fn() });

beforeEach(() => {
  vi.resetModules();
  document.head.innerHTML = '';
  delete (window as any).turnstile;
  settleScriptsAs('error');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('loadTurnstile', () => {
  it('adds the script once and resolves with the global when it loads', async () => {
    settleScriptsAs('load');
    (window as any).turnstile = fake();
    const { loadTurnstile, TURNSTILE_SCRIPT_URL } = await import('./loadTurnstile');

    const first = loadTurnstile();
    const second = loadTurnstile();
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0]!.src).toBe(TURNSTILE_SCRIPT_URL);
    await expect(first).resolves.toBe((window as any).turnstile);
    await expect(second).resolves.toBe((window as any).turnstile);
  });

  it('tries again after a failed load', async () => {
    // happy-dom caches a failed URL, so this test settles each script itself.
    const appended: HTMLScriptElement[] = [];
    vi.spyOn(document.head, 'append').mockImplementation((node) => {
      appended.push(node as HTMLScriptElement);
    });
    const { loadTurnstile } = await import('./loadTurnstile');

    const failed = loadTurnstile();
    appended[0]!.dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow(/could not load/i);

    const retried = loadTurnstile();
    expect(appended).toHaveLength(2);
    (window as any).turnstile = fake();
    appended[1]!.dispatchEvent(new Event('load'));
    await expect(retried).resolves.toBe((window as any).turnstile);
  });

  it('fails when the script loads without its global', async () => {
    settleScriptsAs('load');
    const { loadTurnstile } = await import('./loadTurnstile');
    await expect(loadTurnstile()).rejects.toThrow(/without its global/i);
  });

  it('gives up after the timeout and tries again next time', async () => {
    vi.useFakeTimers();
    // A script that is never settled: the insertion is swallowed.
    const append = vi.spyOn(document.head, 'append').mockImplementation(() => {});
    const { loadTurnstile, SCRIPT_TIMEOUT_MS } = await import('./loadTurnstile');

    const assertion = expect(loadTurnstile()).rejects.toThrow(/did not load/i);
    await vi.advanceTimersByTimeAsync(SCRIPT_TIMEOUT_MS);
    await assertion;

    loadTurnstile().catch(() => {});
    expect(append).toHaveBeenCalledTimes(2);
  });
});
