/**
 * Kanso Cre8 — Shared Lightbox Helper
 * Manages lightbox open state, selected deliverable item, and comparison mode.
 */
import type { DeliverableItem } from '$lib/types';

export function useLightbox() {
  let open = $state(false);
  let selectedDeliverable = $state<DeliverableItem | null>(null);
  let initialDiffMode = $state(false);

  function openLightbox(item: DeliverableItem, diffMode: boolean = false): void {
    selectedDeliverable = item;
    initialDiffMode = diffMode;
    open = true;
  }

  function closeLightbox(): void {
    open = false;
  }

  return {
    get open() { return open; },
    set open(v: boolean) { open = v; },
    get selectedDeliverable() { return selectedDeliverable; },
    set selectedDeliverable(v: DeliverableItem | null) { selectedDeliverable = v; },
    get initialDiffMode() { return initialDiffMode; },
    set initialDiffMode(v: boolean) { initialDiffMode = v; },
    openLightbox,
    closeLightbox
  };
}
