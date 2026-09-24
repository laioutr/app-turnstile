import { addPlugin, addServerPlugin, createResolver, defineNuxtModule, installModule, useLogger } from '@nuxt/kit';
import { defu } from 'defu';
import { resolveTurnstileKeys } from './module/resolveTurnstileKeys';
import type { NuxtModule } from '@nuxt/schema';
import { name as pkgName, version as pkgVersion } from '../package.json';

export interface ModuleOptions {
  siteKey?: string;
  secretKey?: string;
}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: { name: pkgName, version: pkgVersion, configKey: pkgName },
  async setup(options, nuxt) {
    const logger = useLogger(pkgName);
    const { resolve } = createResolver(import.meta.url);
    const resolveRuntimeModule = (path: string) => resolve('./runtime', path);

    nuxt.options.build.transpile.push(resolve('./runtime'));

    if (nuxt.options._prepare) {
      await installModule('@laioutr-core/frontend-core');
      return;
    }

    const keys = resolveTurnstileKeys(options);
    if (!keys.ok) {
      // Registering neither half makes frontend-core reject the protected actions as having no provider.
      logger.warn(`Missing ${keys.missing.map((key) => `"${key}"`).join(' and ')} in the app configuration. Every protected action will be rejected.`);
      return;
    }

    // frontend-core reads this to warn when protected actions have no provider. Either module may run first.
    (nuxt.options.runtimeConfig as any).laioutr = defu({ botProtection: { provider: 'turnstile' } }, (nuxt.options.runtimeConfig as any).laioutr);
    (nuxt.options.runtimeConfig.public as any)[pkgName] = keys.publicConfig;
    (nuxt.options.runtimeConfig as any)[pkgName] = keys.privateConfig;

    addPlugin({ src: resolveRuntimeModule('app/plugins/turnstile.client'), mode: 'client' });
    addServerPlugin(resolveRuntimeModule('server/plugins/turnstileVerifier'));
  },
});

export default module;
