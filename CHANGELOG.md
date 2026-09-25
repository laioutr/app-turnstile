# @laioutr/app-turnstile

## 0.1.0
### Minor Changes

- a27ad05: Cloudflare Turnstile as the bot-protection provider for Laioutr actions. Each project uses its own Turnstile widget; the app loads nothing before the first protected action and shows a dialog only when Cloudflare asks the visitor to interact.
