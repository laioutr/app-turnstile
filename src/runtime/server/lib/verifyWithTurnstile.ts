import { SpanKind, trace } from '@opentelemetry/api';
import type { BotProtectionVerdict } from '@laioutr-core/frontend-core/bot-protection';
import { turnstileAction } from '../../shared/turnstileAction';

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const SITEVERIFY_TIMEOUT_MS = 5000;

export interface TurnstileCheck {
  token: string | undefined;
  /** The request host, with or without a port, in any case. */
  host: string;
  remoteIp: string | undefined;
  /** The protected-action id, before mapping. */
  action: string;
  secretKey: string;
}

interface SiteverifyResult {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
  metadata?: { result_with_testing_key?: boolean };
}

const bareHost = (host: string) => host.replace(/:\d+$/, '').toLowerCase();

const judge = (result: SiteverifyResult, check: TurnstileCheck): BotProtectionVerdict => {
  if (!result.success) return { status: 'invalid', reason: result['error-codes']?.[0] ?? 'rejected' };
  // A test key answers for `example.com` and carries no action, whatever the page.
  if (result.metadata?.result_with_testing_key) return { status: 'valid' };
  if (bareHost(result.hostname ?? '') !== bareHost(check.host)) return { status: 'invalid', reason: 'hostname-mismatch' };
  if (result.action !== turnstileAction(check.action)) return { status: 'invalid', reason: 'action-mismatch' };
  return { status: 'valid' };
};

const siteverify = async (check: TurnstileCheck & { token: string }): Promise<BotProtectionVerdict> => {
  const body = new URLSearchParams({ secret: check.secretKey, response: check.token });
  if (check.remoteIp) body.set('remoteip', check.remoteIp);

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS) });
  } catch (error) {
    return { status: 'unavailable', reason: (error as Error).name === 'TimeoutError' ? 'timeout' : 'network' };
  }

  if (response.status >= 500) return { status: 'unavailable', reason: `http-${response.status}` };
  if (!response.ok) return { status: 'invalid', reason: `http-${response.status}` };

  try {
    return judge((await response.json()) as SiteverifyResult, check);
  } catch {
    return { status: 'unavailable', reason: 'malformed-response' };
  }
};

export const verifyWithTurnstile = (check: TurnstileCheck): Promise<BotProtectionVerdict> => {
  if (!check.token) return Promise.resolve({ status: 'invalid', reason: 'missing-token' });
  const token = check.token;

  return trace
    .getTracer('@laioutr/app-turnstile')
    .startActiveSpan('turnstile.siteverify', { kind: SpanKind.CLIENT }, async (span) => {
      try {
        const verdict = await siteverify({ ...check, token });
        // An outage is degraded service, not a failed request: frontend-core's policy decides, so no ERROR status.
        if (verdict.status === 'unavailable') span.setAttribute('error.type', verdict.reason);
        return verdict;
      } finally {
        span.end();
      }
    });
};
