import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { ownerRoutes } from './owner';

describe('owner routes', () => {
  it('answers the roster and current user with the studio owner', async () => {
    const { call } = routeHarness([ownerRoutes], { sample: true });
    const me = await call('GET', '/auth/me');
    expect(me.user).toMatchObject({ name: 'Alex Mercer', username: 'alex.mercer', roles: ['Owner'] });
    const team = await call('GET', '/team');
    expect(team.team).toHaveLength(1);
    expect((await call('GET', '/users')).users[0].name).toBe('Alex Mercer');
  });
});
