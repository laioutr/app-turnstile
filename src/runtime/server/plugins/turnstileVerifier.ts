import { getHeader, getRequestHost, getRequestIP } from 'h3';
import { defineNitroPlugin, setBotProtectionVerifier, useRuntimeConfig } from '#imports';
import { isTestSecret } from '../lib/isTestSecret';
import { verifyWithTurnstile } from '../lib/verifyWithTurnstile';

export default defineNitroPlugin(() => {
  const { secretKey } = useRuntimeConfig()['@laioutr/app-turnstile'] as { secretKey: string };

  if (isTestSecret(secretKey)) {
    console.warn('[@laioutr/app-turnstile] A Cloudflare test secret is configured. It accepts every token, so protected actions are not protected.');
  }

  setBotProtectionVerifier({
    name: 'turnstile',
    verify: async (event, request) =>
      verifyWithTurnstile({
        token: getHeader(event, 'x-turnstile-token'),
        host: getRequestHost(event, { xForwardedHost: true }),
        remoteIp: getRequestIP(event, { xForwardedFor: true }),
        action: request.action,
        secretKey,
      }),
  });
});
