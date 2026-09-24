import srcModule from '../src/module';

export default defineNuxtConfig({
  modules: [srcModule, '@laioutr-core/frontend-core'],
  devtools: { enabled: true },
  compatibilityDate: '2025-09-11',
});
