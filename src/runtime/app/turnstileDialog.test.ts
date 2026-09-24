// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  document.documentElement.lang = 'en';
});

describe('turnstileDialog', () => {
  it('creates one dialog, closed, and reports its state as data-state', async () => {
    const { turnstileDialog } = await import('./turnstileDialog');
    const dialog = turnstileDialog();
    expect(turnstileDialog()).toBe(dialog);
    const element = document.querySelectorAll('dialog[data-laioutr-turnstile]');
    expect(element).toHaveLength(1);
    expect(element[0]!.getAttribute('data-state')).toBe('closed');

    dialog.open();
    expect(element[0]!.getAttribute('data-state')).toBe('open');
    dialog.close();
    expect(element[0]!.getAttribute('data-state')).toBe('closed');
  });

  it('reports a cancel from the close control and from Escape', async () => {
    const { turnstileDialog } = await import('./turnstileDialog');
    const dialog = turnstileDialog();
    const listener = vi.fn();
    const stop = dialog.onCancel(listener);
    dialog.open();

    document.querySelector<HTMLButtonElement>('dialog[data-laioutr-turnstile] button')!.click();
    expect(listener).toHaveBeenCalledTimes(1);

    dialog.open();
    document.querySelector('dialog[data-laioutr-turnstile]')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(document.querySelector('dialog[data-laioutr-turnstile]')!.getAttribute('data-state')).toBe('closed');

    stop();
    dialog.open();
    document.querySelector<HTMLButtonElement>('dialog[data-laioutr-turnstile] button')!.click();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('labels the close control in the page language', async () => {
    document.documentElement.lang = 'de-DE';
    const { turnstileDialog } = await import('./turnstileDialog');
    turnstileDialog();
    expect(document.querySelector('dialog[data-laioutr-turnstile] button')!.getAttribute('aria-label')).toBe('Schließen');
  });
});
