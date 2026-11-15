import { describe, expect, it } from 'vitest';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import {
  STUDIO_FILE,
  canonicalStudio,
  getStudioProfile,
  migrateVaultConfig,
  parseSwiftOrQr,
  saveStudioProfile,
  toStudioView
} from './config';
import { parseFrontmatter, serializeFrontmatter, validateFrontmatter } from './frontmatter';

// The v0.8 sample file stored every field twice.
const DUPLICATED = {
  studioName: 'Acme Design Studio',
  principalName: 'Alex Mercer',
  freelancerName: 'Alex Mercer',
  registration_no: '2026-ACME-0001',
  businessRegNo: '2026-ACME-0001',
  billingEmail: 'billing@example.com',
  email: 'billing@example.com',
  paymentBank: 'Acme Federal Bank',
  bankName: 'Acme Federal Bank',
  paymentSwiftOrQr: 'SWIFT: ACMEUS33 / DuitNow: 00000000',
  swift_bic: 'ACMEUS33',
  duitnow_id: '00000000',
  logo: '',
  logo_url: '',
  digitalSignature: 'Alex Mercer',
  signature_text: 'Alex Mercer',
  customKey: 'kept'
};

describe('studio profile keys', () => {
  it('collapses duplicated and legacy keys into canonical ones', () => {
    const c = canonicalStudio(DUPLICATED);
    for (const legacy of ['principalName', 'businessRegNo', 'billingEmail', 'paymentBank', 'paymentSwiftOrQr', 'logo', 'digitalSignature']) {
      expect(c, legacy).not.toHaveProperty(legacy);
    }
    expect(c).toMatchObject({ freelancerName: 'Alex Mercer', registration_no: '2026-ACME-0001', swift_bic: 'ACMEUS33', customKey: 'kept' });
    expect(canonicalStudio({ businessRegNo: 'R-1', paymentSwiftOrQr: 'SWIFT: X1 / DuitNow: 9' })).toEqual({
      registration_no: 'R-1',
      swift_bic: 'X1',
      duitnow_id: '9'
    });
  });

  it('gives the UI its legacy names as aliases', () => {
    const view = toStudioView({ freelancerName: 'Alex', registration_no: 'R-1', swift_bic: 'S1', duitnow_id: 'D1' });
    expect(view).toMatchObject({ principalName: 'Alex', businessRegNo: 'R-1', paymentSwiftOrQr: 'SWIFT: S1 / DuitNow: D1' });
  });

  it('parses free text that is not SWIFT or DuitNow', () => {
    expect(parseSwiftOrQr('SWIFT: ABC / scan QR on invoice')).toEqual({ swift_bic: 'ABC', payment_note: 'scan QR on invoice' });
  });

  it('writes only canonical keys and keeps edits made under either name', async () => {
    const fs = new MemoryVaultFs({ [STUDIO_FILE]: JSON.stringify(DUPLICATED) });
    const current = await getStudioProfile(fs);
    await saveStudioProfile(fs, { ...current, principalName: 'Alex M.', tagline: 'New', paymentSwiftOrQr: 'SWIFT: NEW1 / DuitNow: 111' });
    const onDisk = JSON.parse(await fs.readText(STUDIO_FILE));
    expect(onDisk).not.toHaveProperty('principalName');
    expect(onDisk).not.toHaveProperty('paymentSwiftOrQr');
    expect(onDisk).toMatchObject({ freelancerName: 'Alex M.', tagline: 'New', swift_bic: 'NEW1', duitnow_id: '111', customKey: 'kept' });

    await saveStudioProfile(fs, { freelancerName: 'Canonical edit' });
    expect((await getStudioProfile(fs)).principalName).toBe('Canonical edit');
  });
});

describe('migrateVaultConfig', () => {
  it('folds legacy files in, normalizes the studio file and lists files to retire', async () => {
    const fs = new MemoryVaultFs({
      '_Team/_Config/theme.txt': 'Neumorphic\n',
      '_Team/_Config/license.key': 'KANSO-PRO-TEST\n',
      [STUDIO_FILE]: JSON.stringify(DUPLICATED),
      '_Team/_Config/user_passwords.json': '{}',
      '_Team/audit-log.jsonl': '{}\n',
      '_Team/comments/P1.jsonl': '{}\n',
      '_Notes/keep.md': '# user content'
    });
    const result = await migrateVaultConfig(fs);
    expect(result.errors).toEqual([]);
    expect(JSON.parse(await fs.readText('_Team/_Config/preferences.json')).theme).toBe('neumorphic');
    expect(JSON.parse(await fs.readText('_Team/_Config/license.json'))).toMatchObject({ tier: 'pro', licenseKey: 'KANSO-PRO-TEST' });
    expect(JSON.parse(await fs.readText(STUDIO_FILE))).not.toHaveProperty('businessRegNo');
    expect(result.retire).toEqual(['user_passwords.json', 'theme.txt', 'license.key', 'audit-log.jsonl', '_Team/comments']);
    expect(await fs.readText('_Notes/keep.md')).toBe('# user content');

    const again = await migrateVaultConfig(fs);
    expect(again.actions.filter((a) => a.startsWith('Normalized'))).toEqual([]);
  });
});

describe('frontmatter', () => {
  it('round-trips YAML frontmatter and keeps unknown keys', () => {
    const text = serializeFrontmatter({ status: 'review', tags: ['a'], custom: 1 }, '# Body\n');
    expect(text.startsWith('---\nstatus: review\n')).toBe(true);
    const parsed = parseFrontmatter(text);
    expect(parsed.frontmatter).toEqual({ status: 'review', tags: ['a'], custom: 1 });
    expect(parsed.body).toBe('# Body\n');
  });

  it('handles CRLF, missing frontmatter and invalid YAML', () => {
    expect(parseFrontmatter('---\r\ntitle: A\r\n---\r\nBody').frontmatter).toMatchObject({ title: 'A' });
    expect(parseFrontmatter('# Only body')).toEqual({ frontmatter: {}, body: '# Only body' });
    expect(parseFrontmatter('---\ntitle: [unclosed\nrevision: 3\n---\nB').frontmatter).toMatchObject({ revision: 3 });
    expect(parseFrontmatter('---\ntags: a, b\n---\n').frontmatter.tags).toEqual(['a', 'b']);
  });

  it('validates per document type without dropping keys', () => {
    expect(validateFrontmatter('project', { status: 'nope', deadline: '14/09/2026', x: 1 })).toMatchObject({ valid: false, data: { x: 1 } });
    expect(validateFrontmatter('client', { code: 'ACME', name: 'Acme Corp' }).valid).toBe(true);
    expect(validateFrontmatter('invoice', { documentNumber: 'INV-2026-001', due_date: '2026-10-01' }).valid).toBe(true);
    expect(validateFrontmatter('note', { category: 'random' }).errors).toHaveLength(2);
  });
});
