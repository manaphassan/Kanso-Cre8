import { describe, expect, it } from 'vitest';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { ensureVaultStructure } from '$lib/domain/vaultLayout';
import { ConfirmationError, resetVaultStructure, vaultFolderName } from './reset';

const NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));

async function vault() {
  const fs = new MemoryVaultFs();
  fs.now = () => NOW;
  await ensureVaultStructure(fs, NOW);
  fs.put('_Clients/TEST_Client/client.md', '# Test Client\n');
  fs.put('my-custom-notes.txt', 'Important non-canonical notes');
  fs.put('PersonalPortfolio/art.png', 'fake-png');
  return fs;
}

describe('resetVaultStructure', () => {
  it('reads the folder name from Windows and POSIX paths', () => {
    expect(vaultFolderName('D:\\Studio\\KansoVault\\')).toBe('KansoVault');
    expect(vaultFolderName('/home/alex/KansoVault')).toBe('KansoVault');
    expect(vaultFolderName(null)).toBe('');
  });

  it('requires the matching folder name (server case)', async () => {
    const fs = await vault();
    await expect(resetVaultStructure(fs, 'D:/KansoVault', 'WrongFolderName', NOW)).rejects.toThrow(/Confirmation failed/);
    await expect(resetVaultStructure(fs, 'D:/KansoVault', '', NOW)).rejects.toBeInstanceOf(ConfirmationError);
    expect(fs.paths()).toContain('_Clients/TEST_Client/client.md');
  });

  it('archives canonical folders and leaves non-canonical files intact (server case)', async () => {
    const fs = await vault();
    const res = await resetVaultStructure(fs, 'D:/KansoVault', ' kansovault ', NOW);
    expect(res.success).toBe(true);
    expect(res.archivePath).toBe('_Archive/20260915-090000');
    expect(res.archived).toEqual(['_Clients', '_Finance', '_Projects', '_Journal', '_Notes', '_Team'].map((f) => `_Archive/20260915-090000/${f}`));
    expect(fs.paths()).toContain('_Archive/20260915-090000/_Clients/TEST_Client/client.md');
    expect(fs.paths()).not.toContain('_Clients/TEST_Client');
    expect(fs.paths()).toEqual(expect.arrayContaining(['_Clients', '_Finance/Quotes', '_Notes/Scratchpad.md', '_Team/_Config']));
    expect(res.repaired).toContain('_Notes/Scratchpad.md');
    expect(await fs.readText('my-custom-notes.txt')).toBe('Important non-canonical notes');
    expect(fs.paths()).toContain('PersonalPortfolio/art.png');
  });

  it('returns a null archive path when no compartment existed', async () => {
    const fs = new MemoryVaultFs({ 'loose.md': 'x' });
    fs.now = () => NOW;
    const res = await resetVaultStructure(fs, 'D:/Empty', 'Empty', NOW);
    expect(res.archivePath).toBeNull();
    expect(res.archived).toEqual([]);
    expect(res.repaired).toContain('_Clients');
  });
});
