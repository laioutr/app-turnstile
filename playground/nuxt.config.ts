import srcModule from '../src/module';

export default defineNuxtConfig({
  modules: [srcModule, '@laioutr-core/frontend-core'],
  '@laioutr/app-turnstile': {
    siteKey: process.env.TURNSTILE_SITE_KEY ?? '1x00000000000000000000BB',
    secretKey: process.env.TURNSTILE_SECRET_KEY ?? '1x0000000000000000000000000000000AA',
  },
  devtools: { enabled: true },
  compatibilityDate: '2025-09-11',
});
