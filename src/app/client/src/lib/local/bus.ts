/**
 * In-app event bus. Replaces the server's SSE broadcast: domain code emits
 * the same event names (`workspace:updated`, `project:updated`, ...) and
 * `ApiClient.initEventStream` delivers them to the existing listeners.
 */

export type BusListener = (event: string, data: unknown) => void;

export class EventBus {
  private listeners = new Set<BusListener>();

  emit(event: string, data: unknown = {}): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(event, data);
      } catch (err) {
        console.warn(`[EventBus] listener for ${event} failed:`, err);
      }
    }
  }

  on(listener: BusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
