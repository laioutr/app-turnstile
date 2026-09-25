# @laioutr/app-turnstile

## 0.1.1
### Patch Changes

- 8e3575e: The challenge dialog now has an accessible name in the page language, so a screen reader announces what it is for. A Turnstile widget that fails to render now fails its action cleanly, without a leftover timer or listener. The README documents the Content Security Policy that Turnstile needs.

## 0.1.0
### Minor Changes

- a27ad05: Cloudflare Turnstile as the bot-protection provider for Laioutr actions. Each project uses its own Turnstile widget; the app loads nothing before the first protected action and shows a dialog only when Cloudflare asks the visitor to interact.
