---
'@laioutr/app-turnstile': patch
---

The challenge dialog now has an accessible name in the page language, so a screen reader announces what it is for. A Turnstile widget that fails to render now fails its action cleanly, without a leftover timer or listener. The README documents the Content Security Policy that Turnstile needs.
