import { describe, expect, it } from 'vitest';
import { resolveTurnstileKeys } from './resolveTurnstileKeys';

describe('resolveTurnstileKeys', () => {
  it('puts the site key in public config and the secret only in private config', () => {
    const keys = resolveTurnstileKeys({ siteKey: 'site-1', secretKey: 'secret-1' });
    expect(keys).toEqual({ ok: true, publicConfig: { siteKey: 'site-1' }, privateConfig: { secretKey: 'secret-1' } });
    expect(JSON.stringify(keys.ok && keys.publicConfig)).not.toContain('secret-1');
  });

  it('names every missing or blank key', () => {
    expect(resolveTurnstileKeys({})).toEqual({ ok: false, missing: ['siteKey', 'secretKey'] });
    expect(resolveTurnstileKeys({ siteKey: '  ', secretKey: 'secret-1' })).toEqual({ ok: false, missing: ['siteKey'] });
  });
});
