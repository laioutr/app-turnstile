// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BotProtectionCancelled } from '@laioutr-core/frontend-core/bot-protection';
import type { TurnstileGlobal, TurnstileRenderOptions } from './turnstileTypes';

vi.mock('./loadTurnstile', () => ({ loadTurnstile: vi.fn() }));

const renders: TurnstileRenderOptions[] = [];
const fake: TurnstileGlobal = {
  render: vi.fn((_container, options) => {
    renders.push(options);
    return `widget-${renders.length}`;
  }),
  remove: vi.fn(),
};

const dialogElement = () => document.querySelector('dialog[data-laioutr-turnstile]')!;

beforeEach(async () => {
  vi.resetModules();
  renders.length = 0;
  vi.mocked(fake.render).mockClear();
  vi.mocked(fake.remove).mockReset();
  document.body.innerHTML = '';
  const { loadTurnstile } = await import('./loadTurnstile');
  vi.mocked(loadTurnstile).mockResolvedValue(fake);
});
afterEach(() => vi.useRealTimers());

const adapter = async () => (await import('./createTurnstileAdapter')).createTurnstileAdapter('site-1');
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createTurnstileAdapter', () => {
  it('contacts nothing before the first protected action', async () => {
    const { loadTurnstile } = await import('./loadTurnstile');
    const turnstile = await adapter();
    turnstile.setup?.({ targets: [] });
    expect(loadTurnstile).not.toHaveBeenCalled();
  });

  it('renders an interaction-only widget for the action and returns its token as a header', async () => {
    const pending = (await adapter()).prepare({ action: 'cart/add' });
    await settle();
    expect(renders[0]).toMatchObject({ sitekey: 'site-1', action: 'cart_add', appearance: 'interaction-only', retry: 'never' });

    renders[0]!.callback('token-1');
    await expect(pending).resolves.toEqual({ 'x-turnstile-token': 'token-1' });
    expect(fake.remove).toHaveBeenCalledWith('widget-1');
  });

  it('runs two actions one after the other', async () => {
    const turnstile = await adapter();
    const first = turnstile.prepare({ action: 'a' });
    const second = turnstile.prepare({ action: 'b' });
    await settle();
    expect(renders).toHaveLength(1);

    renders[0]!.callback('token-a');
    await expect(first).resolves.toEqual({ 'x-turnstile-token': 'token-a' });
    await settle();
    expect(renders).toHaveLength(2);
    renders[1]!.callback('token-b');
    await expect(second).resolves.toEqual({ 'x-turnstile-token': 'token-b' });
  });

  it('shows the dialog only while Cloudflare asks for interaction', async () => {
    const pending = (await adapter()).prepare({ action: 'a' });
    await settle();
    expect(dialogElement().getAttribute('data-state')).toBe('closed');
    renders[0]!['before-interactive-callback']();
    expect(dialogElement().getAttribute('data-state')).toBe('open');
    renders[0]!['after-interactive-callback']();
    expect(dialogElement().getAttribute('data-state')).toBe('closed');
    renders[0]!.callback('token');
    await pending;
  });

  it('cancels the action when the visitor presses Escape', async () => {
    const pending = (await adapter()).prepare({ action: 'a' });
    await settle();
    renders[0]!['before-interactive-callback']();
    dialogElement().dispatchEvent(new Event('cancel', { cancelable: true }));
    await expect(pending).rejects.toBeInstanceOf(BotProtectionCancelled);
    expect(fake.remove).toHaveBeenCalledWith('widget-1');
  });

  it('cancels the action when the interaction times out', async () => {
    const pending = (await adapter()).prepare({ action: 'a' });
    await settle();
    renders[0]!['timeout-callback']();
    await expect(pending).rejects.toBeInstanceOf(BotProtectionCancelled);
  });

  it('fails the action with the Turnstile error code', async () => {
    const pending = (await adapter()).prepare({ action: 'a' });
    await settle();
    renders[0]!['error-callback']('300030');
    await expect(pending).rejects.toThrow(/300030/);
  });

  it('fails the action on an unsupported browser', async () => {
    const pending = (await adapter()).prepare({ action: 'a' });
    await settle();
    renders[0]!['unsupported-callback']();
    await expect(pending).rejects.toThrow(/not supported/i);
  });

  it('fails the action when no token arrives in time without interaction', async () => {
    vi.useFakeTimers();
    const { TOKEN_TIMEOUT_MS } = await import('./createTurnstileAdapter');
    const pending = (await adapter()).prepare({ action: 'a' });
    const assertion = expect(pending).rejects.toThrow(/no token/i);
    await vi.advanceTimersByTimeAsync(TOKEN_TIMEOUT_MS);
    await assertion;
  });

  it('keeps waiting while the visitor interacts', async () => {
    vi.useFakeTimers();
    const { TOKEN_TIMEOUT_MS } = await import('./createTurnstileAdapter');
    const pending = (await adapter()).prepare({ action: 'a' });
    await vi.advanceTimersByTimeAsync(0);
    renders[0]!['before-interactive-callback']();
    await vi.advanceTimersByTimeAsync(TOKEN_TIMEOUT_MS * 2);
    renders[0]!.callback('late-token');
    await expect(pending).resolves.toEqual({ 'x-turnstile-token': 'late-token' });
  });

  it('fails the action when no token arrives in time after the interaction', async () => {
    vi.useFakeTimers();
    const { TOKEN_TIMEOUT_MS } = await import('./createTurnstileAdapter');
    const pending = (await adapter()).prepare({ action: 'a' });
    await vi.advanceTimersByTimeAsync(0);
    renders[0]!['before-interactive-callback']();
    renders[0]!['after-interactive-callback']();
    const assertion = expect(pending).rejects.toThrow(/no token/i);
    await vi.advanceTimersByTimeAsync(TOKEN_TIMEOUT_MS);
    await assertion;
  });

  it('settles the action and frees the queue when removing the widget throws', async () => {
    vi.mocked(fake.remove).mockImplementation(() => {
      throw new Error('already removed');
    });
    const turnstile = await adapter();
    const first = turnstile.prepare({ action: 'a' });
    const second = turnstile.prepare({ action: 'b' });
    await settle();
    renders[0]!.callback('token-a');
    await expect(first).resolves.toEqual({ 'x-turnstile-token': 'token-a' });
    await settle();
    renders[1]!.callback('token-b');
    await expect(second).resolves.toEqual({ 'x-turnstile-token': 'token-b' });
  });

  it('lets the next action run after one fails', async () => {
    const turnstile = await adapter();
    const failed = turnstile.prepare({ action: 'a' });
    const next = turnstile.prepare({ action: 'b' });
    await settle();
    renders[0]!['error-callback']('600010');
    await expect(failed).rejects.toThrow();
    await settle();
    renders[1]!.callback('token-b');
    await expect(next).resolves.toEqual({ 'x-turnstile-token': 'token-b' });
  });
});
