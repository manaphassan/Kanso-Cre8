/**
 * In-process replacement for the Express API. `ApiClient.request` hands each
 * endpoint to this router in the desktop app; handlers return the same JSON
 * shapes the server returned, so views do not change. Paths use Express
 * syntax (`/projects/:id/brief`).
 */

import type { LocalContext } from './context';

export class LocalHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const notFound = (message: string) => new LocalHttpError(404, message);
export const badRequest = (message: string) => new LocalHttpError(400, message);

export interface LocalRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  ctx: LocalContext;
}

export type Handler = (req: LocalRequest) => unknown | Promise<unknown>;

interface Route {
  method: string;
  pattern: string;
  segments: string[];
  handler: Handler;
}

export type RouteModule = (router: LocalRouter) => void;

export class LocalRouter {
  private routes: Route[] = [];

  constructor(private readonly ctx: LocalContext) {}

  add(method: string, patterns: string | string[], handler: Handler): this {
    for (const pattern of Array.isArray(patterns) ? patterns : [patterns]) {
      this.routes.push({
        method: method.toUpperCase(),
        pattern,
        segments: pattern.split('/').filter(Boolean),
        handler
      });
    }
    return this;
  }

  get(p: string | string[], h: Handler) { return this.add('GET', p, h); }
  post(p: string | string[], h: Handler) { return this.add('POST', p, h); }
  put(p: string | string[], h: Handler) { return this.add('PUT', p, h); }
  delete(p: string | string[], h: Handler) { return this.add('DELETE', p, h); }

  use(...modules: RouteModule[]): this {
    for (const m of modules) m(this);
    return this;
  }

  /** Registered patterns, for tests and diagnostics. */
  list(): string[] {
    return this.routes.map((r) => `${r.method} ${r.pattern}`);
  }

  private match(method: string, segments: string[]): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== segments.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < segments.length; i++) {
        const want = route.segments[i];
        if (want.startsWith(':')) {
          params[want.slice(1)] = decodeURIComponent(segments[i]);
        } else if (want !== segments[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { route, params };
    }
    return null;
  }

  /** Returns `{ matched: false }` when no route exists for the endpoint. */
  async handle(
    method: string,
    endpoint: string,
    body?: BodyInit | null
  ): Promise<{ matched: false } | { matched: true; data: unknown }> {
    const upper = (method || 'GET').toUpperCase();
    const [rawPath, rawQuery = ''] = endpoint.split('?');
    const segments = rawPath.split('/').filter(Boolean);
    const found = this.match(upper, segments);
    if (!found) return { matched: false };

    const query: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(rawQuery)) query[k] = v;
    let parsed: any = {};
    if (typeof body === 'string' && body.length) {
      try {
        parsed = JSON.parse(body);
      } catch {
        throw badRequest('Request body is not valid JSON.');
      }
    }
    const data = await found.route.handler({
      method: upper,
      path: '/' + segments.join('/'),
      params: found.params,
      query,
      body: parsed,
      ctx: this.ctx
    });
    return { matched: true, data };
  }
}
