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

// Zero specificity through `:where`, so any storefront rule overrides these without `!important`.
const DEFAULT_STYLES = `
:where(dialog[data-laioutr-turnstile]) {
  position: fixed;
  border: 0;
  border-radius: 12px;
  padding: 40px 24px 24px;
  background: #fff;
  color: #111;
  box-shadow: 0 12px 40px rgb(0 0 0 / 18%);
}
:where(dialog[data-laioutr-turnstile])::backdrop {
  background: rgb(0 0 0 / 35%);
}
:where(dialog[data-laioutr-turnstile] > button) {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
:where(dialog[data-laioutr-turnstile] > button:hover) {
  background: rgb(0 0 0 / 6%);
}
`;

const DIALOG_LABELS: Record<string, string> = {
  de: 'Sicherheitsprüfung',
  en: 'Security check',
  es: 'Comprobación de seguridad',
  fr: 'Vérification de sécurité',
  it: 'Controllo di sicurezza',
  nl: 'Beveiligingscontrole',
  pl: 'Weryfikacja bezpieczeństwa',
};

let dialog: TurnstileDialog | undefined;

const create = (): TurnstileDialog => {
  const style = document.createElement('style');
  style.setAttribute('data-laioutr-turnstile', '');
  style.textContent = DEFAULT_STYLES;
  // First in <head>, so a storefront stylesheet also wins on source order.
  document.head.prepend(style);

  const element = document.createElement('dialog');
  element.setAttribute('data-laioutr-turnstile', '');
  element.setAttribute('data-state', 'closed');
  const language = document.documentElement.lang.slice(0, 2);
  element.setAttribute('aria-label', DIALOG_LABELS[language] ?? DIALOG_LABELS.en!);

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', CLOSE_LABELS[language] ?? CLOSE_LABELS.en!);

  const container = document.createElement('div');
  element.append(close, container);
  document.body.append(element);

  const listeners = new Set<() => void>();
  const hide = () => {
    // State first: the `close` listener below must see a close we started, whether it fires now or later.
    element.setAttribute('data-state', 'closed');
    if (element.open) element.close();
  };
  const cancel = () => {
    hide();
    for (const listener of listeners) listener();
  };

  close.addEventListener('click', cancel);
  // Chrome closes a modal dialog on a repeated Escape, and Android on the back gesture, without `cancel`.
  element.addEventListener('close', () => {
    if (element.getAttribute('data-state') === 'open') cancel();
  });
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
