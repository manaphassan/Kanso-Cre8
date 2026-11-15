import { describe, expect, it } from 'vitest';
import { createMemoryContext } from './context';
import { LocalHttpError, LocalRouter, notFound } from './router';

function router() {
  const r = new LocalRouter(createMemoryContext());
  r.get('/projects/:id', ({ params, query }) => ({ id: params.id, view: query.view ?? null }));
  r.get(['/journal/daily/:date', '/journal/daily'], ({ params }) => ({ date: params.date ?? 'today' }));
  r.post('/notes/atomic', ({ body }) => ({ saved: body.title }));
  r.delete('/notes/atomic/:category/:id', ({ params }) => params);
  r.get('/missing/:id', ({ params }) => {
    throw notFound(`No ${params.id}`);
  });
  return r;
}

describe('LocalRouter', () => {
  it('matches params, decodes them and parses the query string', async () => {
    expect(await router().handle('GET', '/projects/0001D%20ACME?view=table')).toEqual({
      matched: true,
      data: { id: '0001D ACME', view: 'table' }
    });
  });

  it('supports several patterns for one handler', async () => {
    const r = router();
    expect((await r.handle('GET', '/journal/daily/2026-09-14')) as any).toMatchObject({ data: { date: '2026-09-14' } });
    expect((await r.handle('GET', '/journal/daily')) as any).toMatchObject({ data: { date: 'today' } });
  });

  it('parses JSON bodies and respects the method', async () => {
    const r = router();
    expect(await r.handle('POST', '/notes/atomic', JSON.stringify({ title: 'Hook' }))).toEqual({
      matched: true,
      data: { saved: 'Hook' }
    });
    expect(await r.handle('GET', '/notes/atomic')).toEqual({ matched: false });
    expect(await r.handle('DELETE', '/notes/atomic/permanent/n1')).toEqual({
      matched: true,
      data: { category: 'permanent', id: 'n1' }
    });
    await expect(r.handle('POST', '/notes/atomic', '{bad')).rejects.toThrow(/not valid JSON/);
  });

  it('reports unmatched endpoints and passes handler errors through', async () => {
    const r = router();
    expect(await r.handle('GET', '/nothing/here')).toEqual({ matched: false });
    await expect(r.handle('GET', '/missing/x')).rejects.toBeInstanceOf(LocalHttpError);
    await expect(r.handle('GET', '/missing/x')).rejects.toThrow('No x');
  });
});
