/**
 * Kanso Cre8 — Shared Modal Utilities
 * Handles Escape key detection and backdrop click dismissal.
 */

export interface UseModalOptions {
  onClose?: () => void;
  isOpen?: () => boolean;
}

/**
 * Handle Escape key press to dismiss open modals.
 */
export function handleModalKeydown(e: KeyboardEvent, onClose?: () => void, isOpen: boolean = true): void {
  if (e.key === 'Escape' && isOpen && onClose) {
    onClose();
  }
}

/**
 * Handle clicking on the backdrop overlay (ignoring clicks on child dialog content).
 */
export function handleBackdropClick(e: MouseEvent, onClose?: () => void): void {
  if (e.target === e.currentTarget && onClose) {
    onClose();
  }
}

/**
 * Svelte action for binding modal backdrop dismissal and window Escape key handling.
 */
export function useModal(node: HTMLElement, options: UseModalOptions = {}) {
  function onKeydown(e: KeyboardEvent) {
    const open = options.isOpen ? options.isOpen() : true;
    if (e.key === 'Escape' && open && options.onClose) {
      options.onClose();
    }
  }

  function onClick(e: MouseEvent) {
    if (e.target === node && options.onClose) {
      options.onClose();
    }
  }

  window.addEventListener('keydown', onKeydown);
  node.addEventListener('click', onClick);

  return {
    update(newOptions: UseModalOptions) {
      options = newOptions;
    },
    destroy() {
      window.removeEventListener('keydown', onKeydown);
      node.removeEventListener('click', onClick);
    }
  };
}
