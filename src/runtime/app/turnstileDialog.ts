export interface TurnstileDialog {
  container: HTMLElement;
  open(): void;
  close(): void;
  /** Calls `listener` when the visitor closes the dialog, by Escape or by the close control. */
  onCancel(listener: () => void): () => void;
}

// The locales ui-kit ships. The dialog lives outside Vue, so it cannot reach the storefront's i18n.
const CLOSE_LABELS: Record<string, string> = {
  de: 'Schließen',
  en: 'Close',
  es: 'Cerrar',
  fr: 'Fermer',
  it: 'Chiudi',
  nl: 'Sluiten',
  pl: 'Zamknij',
};

let dialog: TurnstileDialog | undefined;

const create = (): TurnstileDialog => {
  const element = document.createElement('dialog');
  element.setAttribute('data-laioutr-turnstile', '');
  element.setAttribute('data-state', 'closed');

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', CLOSE_LABELS[document.documentElement.lang.slice(0, 2)] ?? CLOSE_LABELS.en!);

  const container = document.createElement('div');
  element.append(close, container);
  document.body.append(element);

  const listeners = new Set<() => void>();
  const hide = () => {
    if (element.open) element.close();
    element.setAttribute('data-state', 'closed');
  };
  const cancel = () => {
    hide();
    for (const listener of listeners) listener();
  };

  close.addEventListener('click', cancel);
  // Escape fires `cancel` and closes the dialog without our button.
  element.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancel();
  });

  return {
    container,
    open() {
      if (!element.open) element.showModal();
      element.setAttribute('data-state', 'open');
    },
    close: hide,
    onCancel(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const turnstileDialog = (): TurnstileDialog => (dialog ??= create());
