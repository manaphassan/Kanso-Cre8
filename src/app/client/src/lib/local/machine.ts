/**
 * Machine tier (app.json in the OS config dir, or Data/ in portable mode).
 * Secrets are refused by Rust and never pass through here.
 */

export interface MachineStore {
  get<T = unknown>(key: string): Promise<T | null>;
  /** Setting `null` removes the key. */
  set(key: string, value: unknown): Promise<void>;
}

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

export class TauriMachineStore implements MachineStore {
  constructor(private readonly invoke: () => Promise<Invoke>) {}

  async get<T>(key: string): Promise<T | null> {
    const invoke = await this.invoke();
    return (await invoke<T | null>('machine_get', { key })) ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    const invoke = await this.invoke();
    await invoke('machine_set', { key, value: value ?? null });
  }
}

export class MemoryMachineStore implements MachineStore {
  readonly data = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.data.has(key) ? (structuredClone(this.data.get(key)) as T) : null);
  }

  async set(key: string, value: unknown): Promise<void> {
    if (value === null || value === undefined) this.data.delete(key);
    else this.data.set(key, structuredClone(value));
  }
}
