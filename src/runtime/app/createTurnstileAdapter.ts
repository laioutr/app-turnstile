import { loadTurnstile } from './loadTurnstile';
import { turnstileDialog } from './turnstileDialog';
import { BotProtectionCancelled } from '@laioutr-core/frontend-core/bot-protection';
import type { BotProtectionAdapter, BotProtectionRequest } from '@laioutr-core/frontend-core/bot-protection';
import { turnstileAction } from '../shared/turnstileAction';

export const TOKEN_TIMEOUT_MS = 30_000;
export const TURNSTILE_TOKEN_HEADER = 'x-turnstile-token';

const solve = async (siteKey: string, request: BotProtectionRequest): Promise<string> => {
  const turnstile = await loadTurnstile();
  const dialog = turnstileDialog();

  return new Promise<string>((resolve, reject) => {
    // `let`, not `const`: `finish` reads it, and a callback may run before `render` returns.
    // eslint-disable-next-line prefer-const
    let widgetId: string | undefined;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startDeadline = () => {
      timer = setTimeout(
        () => finish(() => reject(new Error('[@laioutr/app-turnstile] Turnstile returned no token in time.'))),
        TOKEN_TIMEOUT_MS
      );
    };
    startDeadline();
    const stopCancel = dialog.onCancel(() => finish(() => reject(new BotProtectionCancelled())));

    // Settles first: every later protected action waits on this one, so cleanup must never keep it pending.
    function finish(settle: () => void) {
      if (settled) return;
      settled = true;
      settle();
      clearTimeout(timer);
      stopCancel();
      dialog.close();
      try {
        if (widgetId !== undefined) turnstile.remove(widgetId);
      } catch {
        // The widget is gone either way; the token or error is already delivered.
      }
    }

    widgetId = turnstile.render(dialog.container, {
      sitekey: siteKey,
      action: turnstileAction(request.action),
      appearance: 'interaction-only',
      // Our own error handling decides; Turnstile's automatic retry would keep the action waiting.
      retry: 'never',
      callback: (token) => finish(() => resolve(token)),
      'error-callback': (code) => finish(() => reject(new Error(`[@laioutr/app-turnstile] Turnstile failed with error ${code}.`))),
      'unsupported-callback': () => finish(() => reject(new Error('[@laioutr/app-turnstile] This browser is not supported by Turnstile.'))),
      'timeout-callback': () => finish(() => reject(new BotProtectionCancelled())),
      'before-interactive-callback': () => {
        // A visitor solving a challenge is not a stalled widget.
        clearTimeout(timer);
        timer = undefined;
        dialog.open();
      },
      'after-interactive-callback': () => {
        dialog.close();
        // Verification continues after the click, and Cloudflare may never answer.
        startDeadline();
      },
    });
  });
};

export const createTurnstileAdapter = (siteKey: string): BotProtectionAdapter => {
  // One dialog holds one widget at a time, so protected actions queue.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    name: 'turnstile',
    prepare(request) {
      const next = queue.then(() => solve(siteKey, request));
      queue = next.catch(() => undefined);
      return next.then((token) => ({ [TURNSTILE_TOKEN_HEADER]: token }));
    },
  };
};
