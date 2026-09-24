export type TurnstileKeys =
  | { ok: true; publicConfig: { siteKey: string }; privateConfig: { secretKey: string } }
  | { ok: false; missing: ('siteKey' | 'secretKey')[] };

export const resolveTurnstileKeys = (options: { siteKey?: string; secretKey?: string }): TurnstileKeys => {
  const siteKey = options.siteKey?.trim() ?? '';
  const secretKey = options.secretKey?.trim() ?? '';
  const missing = [...(siteKey ? [] : ['siteKey' as const]), ...(secretKey ? [] : ['secretKey' as const])];
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, publicConfig: { siteKey }, privateConfig: { secretKey } };
};
