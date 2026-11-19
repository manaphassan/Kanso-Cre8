/**
 * Device presence (P5.6): `_Team/_Config/.kanso-open.json` says which
 * computer has the vault open. Each computer rewrites it every 60 s; when
 * another computer's heartbeat is under 2 minutes old, the app shows a
 * banner. A warning only, never a lock. Dot file: the watcher ignores it.
 */

import type { VaultFs } from '$lib/vault/types';

export const PRESENCE_FILE = '_Team/_Config/.kanso-open.json';
export const HEARTBEAT_MS = 60_000;
export const FRESH_MS = 2 * 60_000;

export interface PresenceRecord {
  device_id: string;
  device_label: string;
  opened_at: string;
  heartbeat_at: string;
}

export interface OtherDevice {
  label: string;
  heartbeatAt: string;
}

export async function readPresence(fs: VaultFs): Promise<PresenceRecord | null> {
  try {
    const raw = JSON.parse(await fs.readText(PRESENCE_FILE));
    if (!raw || typeof raw !== 'object' || typeof raw.heartbeat_at !== 'string') return null;
    return {
      device_id: String(raw.device_id ?? ''),
      device_label: String(raw.device_label ?? 'Another computer').slice(0, 64),
      opened_at: String(raw.opened_at ?? raw.heartbeat_at),
      heartbeat_at: raw.heartbeat_at
    };
  } catch {
    return null;
  }
}

/** The other computer in `record`, if its heartbeat is fresh. Clock skew into the future counts as fresh. */
export function otherDevice(record: PresenceRecord | null, selfId: string, now: Date): OtherDevice | null {
  if (!record || record.device_id === selfId) return null;
  const at = Date.parse(record.heartbeat_at);
  if (!Number.isFinite(at) || now.getTime() - at >= FRESH_MS) return null;
  return { label: record.device_label || 'Another computer', heartbeatAt: record.heartbeat_at };
}

/**
 * Reads the file, then writes this computer's heartbeat. Returns the other
 * computer seen before the write, so two open computers keep seeing each
 * other as they take turns writing.
 */
export async function heartbeat(
  fs: VaultFs,
  self: { id: string; label: string; openedAt: string },
  now: Date
): Promise<OtherDevice | null> {
  const other = otherDevice(await readPresence(fs), self.id, now);
  const record: PresenceRecord = {
    device_id: self.id,
    device_label: self.label,
    opened_at: self.openedAt,
    heartbeat_at: now.toISOString()
  };
  await fs.writeText(PRESENCE_FILE, `${JSON.stringify(record, null, 2)}\n`);
  return other;
}
