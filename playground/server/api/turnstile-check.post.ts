import { getHeader, getRequestHost, getRequestIP } from 'h3';
import { verifyWithTurnstile } from '../../../src/runtime/server/lib/verifyWithTurnstile';

export default defineEventHandler((event) =>
  verifyWithTurnstile({
    token: getHeader(event, 'x-turnstile-token'),
    host: getRequestHost(event, { xForwardedHost: true }),
    remoteIp: getRequestIP(event, { xForwardedFor: true }),
    action: 'playground/check',
    secretKey: (useRuntimeConfig()['@laioutr/app-turnstile'] as { secretKey: string }).secretKey,
  })
);
