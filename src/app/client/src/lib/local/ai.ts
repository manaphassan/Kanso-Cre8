/**
 * The AI backend behind the local routes. In the desktop app every call goes
 * to a Rust command (the key stays in the OS keychain); tests use
 * `MemoryAiBackend`. Errors are the plain sentences Rust produces.
 */

export interface AiStatus {
  provider: 'gemini';
  model: string;
  models: string[];
  configured: boolean;
  /** Where the key is kept, or null when no key is saved. */
  storage: 'keychain' | 'file' | null;
  keychainName: string;
}

export interface AiRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface AiBackend {
  status(): Promise<AiStatus>;
  setKey(key: string): Promise<AiStatus>;
  clearKey(): Promise<AiStatus>;
  setModel(model: string): Promise<AiStatus>;
  test(): Promise<{ ok: boolean; model: string; elapsedMs: number }>;
  complete(request: AiRequest): Promise<{ text: string; model: string }>;
}

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

/** Tauri rejects with the command's error string; turn it into an Error. */
async function call<T>(invoke: () => Promise<Invoke>, cmd: string, args?: Record<string, unknown>): Promise<T> {
  const run = await invoke();
  try {
    return await run<T>(cmd, args);
  } catch (err: any) {
    throw new Error(typeof err === 'string' ? err : err?.message || String(err));
  }
}

export class TauriAiBackend implements AiBackend {
  constructor(private readonly invoke: () => Promise<Invoke>) {}
  status = () => call<AiStatus>(this.invoke, 'ai_status');
  setKey = (key: string) => call<AiStatus>(this.invoke, 'ai_set_key', { provider: 'gemini', key });
  clearKey = () => call<AiStatus>(this.invoke, 'ai_clear_key', { provider: 'gemini' });
  setModel = (model: string) => call<AiStatus>(this.invoke, 'ai_set_model', { model });
  test = () => call<{ ok: boolean; model: string; elapsedMs: number }>(this.invoke, 'ai_test');
  complete = (request: AiRequest) =>
    call<{ text: string; model: string }>(this.invoke, 'ai_complete', { input: { provider: 'gemini', ...request } });
}

/** Test backend: records requests and answers with `reply` (or throws `error`). */
export class MemoryAiBackend implements AiBackend {
  key: string | null = null;
  model = 'gemini-2.5-flash';
  reply = 'Generated text';
  error: string | null = null;
  readonly requests: AiRequest[] = [];

  async status(): Promise<AiStatus> {
    return {
      provider: 'gemini',
      model: this.model,
      models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
      configured: Boolean(this.key),
      storage: this.key ? 'keychain' : null,
      keychainName: 'Windows Credential Manager'
    };
  }
  async setKey(key: string) {
    if (key.trim().length < 10) throw new Error('That does not look like an API key. Copy it again from Google AI Studio.');
    this.key = key.trim();
    return this.status();
  }
  async clearKey() {
    this.key = null;
    return this.status();
  }
  async setModel(model: string) {
    this.model = model;
    return this.status();
  }
  async test() {
    if (!this.key) throw new Error('Add your API key in Settings > AI first.');
    if (this.error) throw new Error(this.error);
    return { ok: true, model: this.model, elapsedMs: 5 };
  }
  async complete(request: AiRequest) {
    this.requests.push(request);
    if (!this.key) throw new Error('Add your API key in Settings > AI first.');
    if (this.error) throw new Error(this.error);
    return { text: this.reply, model: this.model };
  }
}
