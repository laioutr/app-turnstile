# Laioutr App: Cloudflare Turnstile

[![Laioutr][laioutr-src]][laioutr-href]
[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Makes [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) the bot-protection provider
of a [Laioutr](https://laioutr.com) storefront. Every action the project protects must carry a
Turnstile token, and the server checks it with Cloudflare before the action runs. Most visitors never
see Turnstile. When Cloudflare asks a visitor to confirm they are human, the app shows the widget in a
small dialog.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)

> [!WARNING]
> **A visitor whose browser cannot reach Cloudflare cannot run a protected action**, even with
> `whenUnavailable: "open"`. This includes a blocked or failed load of Turnstile's script and a browser
> Turnstile does not support. `open` covers only an outage that the server sees. A browser cannot prove
> an outage, because every bot could make the same claim.

## Setup

1. **Create a widget in your own Cloudflare account**: Turnstile → Add widget, mode **Managed**. Add
   every hostname the storefront answers on, including preview hostnames. On the Free plan a widget
   takes up to 10 hostnames, and an account up to 20 widgets. Verifications have no limit.
2. **Install the app** and configure it with the widget's two keys. List the actions to protect in the
   project's bot-protection configuration:

   ```json
   {
     "apps": [
       { "name": "@laioutr/app-turnstile", "config": { "siteKey": "0x…", "secretKey": "0x…" } }
     ],
     "config": { "botProtection": { "actions": ["<action token>"] } }
   }
   ```

   The site key reaches the browser. The secret stays on the server. If either key is missing, the
   app logs a warning at build time and registers nothing, so every protected action is rejected.

## What loads, and when

Nothing loads before the first protected action. On that action, the browser loads
`https://challenges.cloudflare.com/turnstile/v0/api.js` and Cloudflare runs its challenge. Whether that
needs the visitor's consent is for the storefront operator to decide.

## The dialog

The dialog is a native `<dialog data-laioutr-turnstile>` with `data-state="open" | "closed"`. Its
default styles use `:where(…)`, so any rule in the storefront's stylesheet overrides them without
`!important`. Escape and the close control both cancel the action, and the action then sends no
request.

## Content Security Policy

With a Content Security Policy, allow Cloudflare in two directives, or the browser blocks Turnstile and
every protected action fails:

```
script-src https://challenges.cloudflare.com;
frame-src https://challenges.cloudflare.com;
```

A nonce-based policy needs `'strict-dynamic'`. The app inserts Turnstile's script from its own code and
does not set a nonce on it, so the script loads only when your trusted scripts may load further ones.

The dialog's default styles are an inline `<style>`. A policy without `style-src 'unsafe-inline'` blocks
them. The dialog still works, but unstyled, so style it in your own stylesheet.

## Testing with Cloudflare's test keys

Cloudflare's test keys work on any hostname, including `localhost`:

| Site key | Behaviour |
| --- | --- |
| `1x00000000000000000000BB` | Always passes, invisible |
| `2x00000000000000000000BB` | Always fails, invisible |
| `3x00000000000000000000FF` | Forces an interactive challenge |

| Secret | Behaviour |
| --- | --- |
| `1x0000000000000000000000000000000AA` | Always passes |
| `2x0000000000000000000000000000000AA` | Always fails |
| `3x0000000000000000000000000000000AA` | Returns "token already spent" |

A test secret accepts every token, so the server logs a warning at startup when one is configured.
**Never ship a test secret.**

## Development

Requires Node.js 22.12 or newer and pnpm 10 or newer. The committed `.npmrc` maps the Laioutr scopes
to [npm.laioutr.cloud](https://npm.laioutr.cloud).

1. `npm login --registry https://npm.laioutr.cloud` — once per machine. See the
   [Laioutr NPM Guide](https://docs.laioutr.com/cockpit/project-settings/npm).
2. `pnpm install`
3. `pnpm dev` — starts the playground on http://localhost:3000. Its page runs one protected action
   against Cloudflare. Choose the keys with `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Without
   them the playground uses the always-passing test keys.

## Linting and Formatting

We use ESLint and Prettier to lint and format the code. This repository contains opinionated configurations for both tools. You can, of course, replace them with your own configurations.

## Publishing

Releases run through [changesets](https://github.com/changesets/changesets) and publish to npmjs.org
with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), so CI needs no npm token and
every release carries provenance.

Day to day: run `pnpm changeset` to describe your change and merge it. The release workflow opens a
"chore: release" PR collecting the pending changesets; merging **that** builds and publishes.

### One-time setup per repository

1. **Repository secrets**
   - `NPM_LAIOUTR_TOKEN` — read access to npm.laioutr.cloud, so CI can install `@laioutr-core/*`.
   - `RELEASE_TOKEN` — a fine-grained PAT owned by the org, scoped to this repo, with **Contents:
     read and write** and **Pull requests: read and write**. A PR opened with the default
     `GITHUB_TOKEN` cannot trigger workflows, so release PRs would arrive with no CI and could never
     satisfy a required-status rule.

2. **Bootstrap the package on npm.** Trusted publishing is configured on a package that already
   exists, so the very first version has to be published by hand. `publishConfig.provenance` fails
   outside CI — there is no OIDC provider — so disable it for that one publish:

   ```bash
   pnpm prepack
   npm publish --access public --no-provenance
   ```

   A brand-new package can 404 on the registry for a few minutes afterwards. That is replication lag,
   not a failed publish; check again before re-running anything.

3. **Configure the trusted publisher** on the package's npm settings page: GitHub Actions,
   this repository, workflow `release.yml`. Every release after that is tokenless.

### Private publishing

If you want to publish a private package to npm.laioutr.cloud, you need to:

1. Log in with publish access: `npm login --registry https://npm.laioutr.cloud`, then enable **Publish** on the authorize screen. Keep the token in your user `~/.npmrc` — the project's `.npmrc` is committed.
2. Add this line to the root of the `package.json` file: `"publishConfig": { "registry": "https://npm.laioutr.cloud/" }`
3. Make sure your package-name follows the `@laioutr-org/<organization-slug>__<package-name>` format.

After that you can run `pnpm release` to publish the package to npm.laioutr.cloud.

More information for publishing can be found in the [NPM Guide](https://docs.laioutr.com/cockpit/project-settings/npm#publish-an-organization-package).

## Contribution

Follow the [setup guide](https://docs.laioutr.com/getting-started/next-steps/local-setup) to get started.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@laioutr/app-turnstile/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@laioutr/app-turnstile
[npm-downloads-src]: https://img.shields.io/npm/dm/@laioutr/app-turnstile.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/@laioutr/app-turnstile
[license-src]: https://img.shields.io/npm/l/@laioutr/app-turnstile.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@laioutr/app-turnstile
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
[laioutr-src]: https://img.shields.io/badge/%F0%9F%A6%99_Laioutr_App-702DCE
[laioutr-href]: https://www.laioutr.com/
