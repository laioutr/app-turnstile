// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
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

  it('reports a cancel when the browser closes the dialog without a cancel event', async () => {
    const { turnstileDialog } = await import('./turnstileDialog');
    const dialog = turnstileDialog();
    const listener = vi.fn();
    dialog.onCancel(listener);
    dialog.open();

    // Chrome closes a modal dialog on a repeated Escape, and Android on the back gesture, without `cancel`.
    document.querySelector<HTMLDialogElement>('dialog[data-laioutr-turnstile]')!.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(document.querySelector('dialog[data-laioutr-turnstile]')!.getAttribute('data-state')).toBe('closed');

    dialog.open();
    dialog.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('adds its default styles once, at zero specificity, so a storefront rule always wins', async () => {
    const { turnstileDialog } = await import('./turnstileDialog');
    turnstileDialog();
    turnstileDialog();
    const styles = document.querySelectorAll('style[data-laioutr-turnstile]');
    expect(styles).toHaveLength(1);
    const selectors = [...(styles[0] as HTMLStyleElement).sheet!.cssRules].map((rule) => (rule as CSSStyleRule).selectorText);
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toMatch(/^:where\(/);
  });

  it('labels the close control in the page language', async () => {
    document.documentElement.lang = 'de-DE';
    const { turnstileDialog } = await import('./turnstileDialog');
    turnstileDialog();
    expect(document.querySelector('dialog[data-laioutr-turnstile] button')!.getAttribute('aria-label')).toBe('Schließen');
  });
});
