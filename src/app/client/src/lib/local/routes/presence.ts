/**
 * Device presence route (P5.6). The banner calls the heartbeat every 60 s;
 * the reply names another computer that has the same vault open, if any.
 */

import { FRESH_MS, heartbeat, type OtherDevice } from '$lib/domain/presence';
import type { LocalContext } from '../context';
import type { LocalRouter } from '../router';

const DEVICE_ID_KEY = 'deviceId';
const DEVICE_LABEL_KEY = 'deviceLabel';

/** When this app run opened the vault, per context (one per window). */
const openedAt = new WeakMap<object, string>();
/**
 * The last other computer seen. Kept while its heartbeat is fresh, because a
 * read right after our own write (an extra beat on vault events) only finds
 * our own record.
 */
const lastOther = new WeakMap<object, OtherDevice>();

async function self(ctx: LocalContext) {
  let id = await ctx.machine.get<string>(DEVICE_ID_KEY);
  if (!id) {
    id = globalThis.crypto.randomUUID();
    await ctx.machine.set(DEVICE_ID_KEY, id);
  }
  const label = (await ctx.machine.get<string>(DEVICE_LABEL_KEY))?.trim() || (await ctx.deviceName());
  if (!openedAt.has(ctx)) openedAt.set(ctx, ctx.now().toISOString());
  return { id, label, openedAt: openedAt.get(ctx)! };
}

export function presenceRoutes(router: LocalRouter): void {
  router.post('/system/presence/heartbeat', async ({ ctx }) => {
    const me = await self(ctx);
    let fs;
    try {
      fs = await ctx.vault();
    } catch {
      return { success: true, device: me.label, other: null };
    }
    const seen = await heartbeat(fs, me, ctx.now()).catch(() => null);
    if (seen) lastOther.set(ctx, seen);
    const remembered = lastOther.get(ctx);
    const fresh = remembered && ctx.now().getTime() - Date.parse(remembered.heartbeatAt) < FRESH_MS;
    return { success: true, device: me.label, other: fresh ? remembered : null };
  });
}
