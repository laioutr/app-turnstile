import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app';
import { useBotProtection } from '#imports';
import { createTurnstileAdapter } from '../createTurnstileAdapter';

export default defineNuxtPlugin(() => {
  const { siteKey } = useRuntimeConfig().public['@laioutr/app-turnstile'] as { siteKey: string };
  useBotProtection().setAdapter(createTurnstileAdapter(siteKey));
});
