import { describe, expect, it } from 'vitest';
import { turnstileAction } from './turnstileAction';

describe('turnstileAction', () => {
  it('keeps an id that is already valid', () => {
    expect(turnstileAction('newsletter-subscribe')).toBe('newsletter-subscribe');
  });

  it('replaces characters Turnstile rejects', () => {
    expect(turnstileAction('cart/add:line.v2')).toBe('cart_add_line_v2');
  });

  it('shortens a long id to 32 valid characters, the same way every time', () => {
    const id = 'app-example/some/very/long/protected/action/name';
    const action = turnstileAction(id);
    expect(action).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(turnstileAction(id)).toBe(action);
  });

  it('keeps two long ids with a shared prefix apart', () => {
    const prefix = 'app-example/checkout/submit/step';
    expect(turnstileAction(`${prefix}-one`)).not.toBe(turnstileAction(`${prefix}-two`));
  });

  it('hashes the original id, so ids differing only in replaced characters stay apart when long', () => {
    const a = 'app-example/checkout/submit/step/one';
    const b = 'app-example:checkout:submit:step:one';
    expect(turnstileAction(a)).not.toBe(turnstileAction(b));
  });
});
