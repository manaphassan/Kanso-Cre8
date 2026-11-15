import { describe, expect, it } from 'vitest';
import { createMemoryContext } from '../context';
import { LocalRouter } from '../router';
import { registerRoutes } from './index';

describe('registered routes', () => {
  it('never registers the same method and path twice', () => {
    const router = new LocalRouter(createMemoryContext());
    registerRoutes(router);
    const all = router.list();
    const dupes = all.filter((r, i) => all.indexOf(r) !== i);
    expect(dupes).toEqual([]);
  });

  it('serves every endpoint ApiClient calls that a view uses, except the planned ones', async () => {
    const router = new LocalRouter(createMemoryContext());
    registerRoutes(router);
    const patterns = router.list().map((r) => {
      const [method, path] = r.split(' ');
      return { method, re: new RegExp('^' + path.replace(/:[^/]+/g, '[^/]+') + '$') };
    });
    const api = (await import('../../services/api.ts?raw')).default as string;
    const normalize = (raw: string) => {
      let p = raw;
      // Collapse nested ${...} template expressions to a placeholder.
      for (let i = 0; i < 5 && p.includes('${'); i++) p = p.replace(/\$\{[^{}]*\}/g, 'X');
      p = p.replace(/\$\{.*$/, '').replace(/\?.*$/, '');
      // `/dashboardX` is a query-string interpolation, not a path segment.
      return p.replace(/([^/])X+$/, '$1').replace(/\/$/, '');
    };
    const calls = [...api.matchAll(/this\.request(?:<[^>]*>)?\(\s*[`']([^`']+)[`'](?:,\s*\{\s*method:\s*'(\w+)')?/g)].map((m) => ({
      method: (m[2] || 'GET').toUpperCase(),
      path: normalize(m[1])
    }));
    const missing = calls
      .filter((c) => !patterns.some((p) => p.method === c.method && (p.re.test(c.path) || p.re.test(c.path.replace(/\/X$/, '')))))
      .map((c) => `${c.method} ${c.path}`);
    // Ported in later tasks: finance and timer (P2.6, P2.7), AI (Phase 3);
    // auth and team are deleted (D1).
    const planned = /^(GET|POST|PUT|DELETE) \/(finance|system\/timer|ai|auth|team|users|webhooks|audit|system\/license\/verify)/;
    expect(missing.filter((m) => !planned.test(m))).toEqual([]);
  });
});
