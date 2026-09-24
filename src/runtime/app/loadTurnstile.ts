import type { TurnstileGlobal } from './turnstileTypes';

export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const SCRIPT_TIMEOUT_MS = 10_000;

let loading: Promise<TurnstileGlobal> | undefined;

export const loadTurnstile = (): Promise<TurnstileGlobal> => {
  loading ??= new Promise<TurnstileGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = (message: string) => {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(new Error(`[@laioutr/app-turnstile] ${message}`));
    };
    const timer = setTimeout(() => fail('Turnstile did not load in time.'), SCRIPT_TIMEOUT_MS);

    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.addEventListener('load', () => {
      clearTimeout(timer);
      const turnstile = (window as { turnstile?: TurnstileGlobal }).turnstile;
      if (turnstile) resolve(turnstile);
      else fail('Turnstile loaded without its global.');
    });
    script.addEventListener('error', () => fail('Could not load Turnstile.'));
    document.head.append(script);
  });
  return loading;
};
