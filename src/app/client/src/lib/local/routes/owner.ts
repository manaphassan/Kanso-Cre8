/**
 * Single-user stand-ins for the retired team endpoints (D1). Designer pickers
 * and the header still ask for a roster and the current user; both answer
 * with the studio owner from studio_profile.json.
 */

import { getStudioProfile } from '$lib/domain/config';
import type { LocalContext } from '../context';
import type { LocalRouter } from '../router';

export async function studioOwner(ctx: LocalContext) {
  let name = 'Studio Owner';
  let title = 'Designer';
  let email = '';
  try {
    const profile = await getStudioProfile(await ctx.vault());
    name = profile.freelancerName || profile.studioName || name;
    title = profile.professionalTitle || title;
    email = profile.email || '';
  } catch {
    // No vault yet: the generic owner is fine.
  }
  const username = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'owner';
  return {
    id: 'owner',
    staffId: 'owner',
    username,
    name,
    email,
    role: title,
    roles: ['Owner'],
    department: 'Studio',
    isActive: true
  };
}

export function ownerRoutes(router: LocalRouter): void {
  router.get('/auth/me', async ({ ctx }) => ({ user: await studioOwner(ctx) }));
  router.get(['/team', '/team/roster', '/users', '/auth/users'], async ({ ctx }) => {
    const owner = await studioOwner(ctx);
    return { success: true, team: [owner], roster: [owner], users: [owner], total: 1 };
  });
}
