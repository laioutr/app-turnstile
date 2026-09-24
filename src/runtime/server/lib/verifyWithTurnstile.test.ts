import { afterEach, describe, expect, it, vi } from 'vitest';
import { SITEVERIFY_URL, verifyWithTurnstile } from './verifyWithTurnstile';
import type { TurnstileCheck } from './verifyWithTurnstile';

const check = (overrides: Partial<TurnstileCheck> = {}): TurnstileCheck => ({
  token: 'token-1',
  host: 'shop.example.com',
  remoteIp: '203.0.113.7',
  action: 'cart/add',
  secretKey: 'secret-1',
  ...overrides,
});

const answer = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe('verifyWithTurnstile', () => {
  it('is valid when Cloudflare confirms the token for this host and action', async () => {
    const fetch = answer({ success: true, hostname: 'shop.example.com', action: 'cart_add' });
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'valid' });

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(SITEVERIFY_URL);
    const body = init!.body as URLSearchParams;
    expect(body.get('secret')).toBe('secret-1');
    expect(body.get('response')).toBe('token-1');
    expect(body.get('remoteip')).toBe('203.0.113.7');
    expect(init!.signal).toBeInstanceOf(AbortSignal);
  });

  it('compares the bare lower-case host, so a port or upper case does not reject', async () => {
    answer({ success: true, hostname: 'localhost', action: 'cart_add' });
    await expect(verifyWithTurnstile(check({ host: 'LocalHost:3000' }))).resolves.toEqual({ status: 'valid' });
  });

  it('rejects a request without a token and does not call Cloudflare', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    await expect(verifyWithTurnstile(check({ token: undefined }))).resolves.toEqual({ status: 'invalid', reason: 'missing-token' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a token Cloudflare refuses', async () => {
    answer({ success: false, 'error-codes': ['timeout-or-duplicate'] });
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'invalid', reason: 'timeout-or-duplicate' });
  });

  it('rejects on a wrong secret instead of reporting an outage', async () => {
    // Cloudflare sends this one with HTTP 400.
    answer({ success: false, 'error-codes': ['invalid-input-secret'] }, 400);
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'invalid', reason: 'invalid-input-secret' });
  });

  it('rejects a token solved on another host', async () => {
    answer({ success: true, hostname: 'elsewhere.example.com', action: 'cart_add' });
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'invalid', reason: 'hostname-mismatch' });
  });

  it('rejects a token solved for another action', async () => {
    answer({ success: true, hostname: 'shop.example.com', action: 'newsletter_subscribe' });
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'invalid', reason: 'action-mismatch' });
  });

  it('skips the host and action comparison only for a result Cloudflare marks as a test key', async () => {
    answer({ success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } });
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'valid' });
  });

  it('reports an outage when Cloudflare answers 5xx', async () => {
    answer({}, 503);
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'unavailable', reason: 'http-503' });
  });

  it('reports an outage when the request fails or times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'unavailable', reason: 'timeout' });

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'unavailable', reason: 'network' });
  });

  it('reports an outage when a 200 answer is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>', { status: 200 }));
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'unavailable', reason: 'malformed-response' });
  });

  it('rejects on a 4xx, because that is our request, not an outage', async () => {
    answer({}, 400);
    await expect(verifyWithTurnstile(check())).resolves.toEqual({ status: 'invalid', reason: 'http-400' });
  });
});
