import { defineNuxtModule } from '@nuxt/kit';
import type { NuxtModule } from '@nuxt/schema';
import { name as pkgName, version as pkgVersion } from '../package.json';

export interface ModuleOptions {
  siteKey?: string;
  secretKey?: string;
}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: { name: pkgName, version: pkgVersion, configKey: pkgName },
  setup() {},
});

export default module;
