/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import kansoPermissions from '../../../../src-tauri/permissions/kanso.toml?raw';
import { TauriVaultFs, VAULT_CHANGED_EVENT } from './tauriVaultFs';

type Call = { cmd: string; args?: Record<string, unknown> };

function fake(reply: (call: Call) => unknown = () => null) {
  const calls: Call[] = [];
  let handler: ((e: { payload: unknown }) => void) | null = null;
  let event = '';
  const fs = new TauriVaultFs(
    async () => async <T>(cmd: string, args?: Record<string, unknown>) => {
      calls.push({ cmd, args });
      const value = reply({ cmd, args });
      if (value instanceof Error) throw value.message; // Tauri rejects with a string
      return value as T;
    },
    async () => async (name, h) => {
      event = name;
      handler = h as (e: { payload: unknown }) => void;
      return () => {
        handler = null;
      };
    }
  );
  return { fs, calls, emit: (payload: unknown) => handler?.({ payload }), event: () => event };
}

/** Command names granted in src-tauri/permissions/kanso.toml. */
function grantedCommands(): Set<string> {
  return new Set(
    [...kansoPermissions.matchAll(/"allow-([a-z0-9-]+)"/g)].map((m) => m[1].replace(/-/g, '_'))
  );
}

describe('TauriVaultFs', () => {
  it('maps every method to a granted Rust command with matching argument names', async () => {
    const { fs, calls } = fake();
    await fs.open('D:/Vault');
    await fs.root();
    await fs.scan();
    await fs.listDir('_Notes');
    await fs.readText('_Notes/a.md');
    await fs.writeText('_Notes/a.md', 'x');
    await fs.ensureDirs(['_Finance/Quotes']);
    await fs.moveToArchive('_Notes/a.md');
    await fs.copyIn('C:/pick.png', '_P/pick.png');
    await fs.sha256('_P/pick.png');
    await fs.exportZip(['_P'], 'D:/out.zip');

    expect(calls).toEqual([
      { cmd: 'vault_open', args: { path: 'D:/Vault' } },
      { cmd: 'vault_root', args: undefined },
      { cmd: 'vault_scan', args: { prefix: '' } },
      { cmd: 'list_dir', args: { path: '_Notes' } },
      { cmd: 'read_text', args: { path: '_Notes/a.md' } },
      { cmd: 'write_text_atomic', args: { path: '_Notes/a.md', content: 'x' } },
      { cmd: 'ensure_dirs', args: { paths: ['_Finance/Quotes'] } },
      { cmd: 'move_to_archive', args: { path: '_Notes/a.md' } },
      { cmd: 'copy_into_vault', args: { source: 'C:/pick.png', dest: '_P/pick.png', overwrite: false } },
      { cmd: 'sha256_file', args: { path: '_P/pick.png' } },
      { cmd: 'export_zip', args: { paths: ['_P'], dest: 'D:/out.zip' } }
    ]);

    const granted = grantedCommands();
    for (const { cmd } of calls) expect(granted, cmd).toContain(cmd);
  });

  it('turns Rust error strings into Error objects', async () => {
    const { fs } = fake(() => new Error('This path is outside the vault: ../x'));
    await expect(fs.readText('../x')).rejects.toThrow('This path is outside the vault: ../x');
  });

  it('forwards vault:changed payloads and unsubscribes', async () => {
    const { fs, emit, event } = fake();
    const seen: string[][] = [];
    const stop = await fs.onChange((paths) => seen.push(paths));
    expect(event()).toBe(VAULT_CHANGED_EVENT);
    emit({ paths: ['_Notes/a.md'] });
    stop();
    emit({ paths: ['_Notes/b.md'] });
    expect(seen).toEqual([['_Notes/a.md']]);
  });
});
