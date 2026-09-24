export interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  appearance: 'interaction-only';
  retry: 'never';
  callback: (token: string) => void;
  'error-callback': (code: string) => void;
  'unsupported-callback': () => void;
  'timeout-callback': () => void;
  'before-interactive-callback': () => void;
  'after-interactive-callback': () => void;
}
export interface TurnstileGlobal {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  remove(widgetId: string): void;
}
