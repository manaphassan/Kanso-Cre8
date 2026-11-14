import { describe, expect, it } from 'vitest';
import { normalizePath, parseRelative, utcStamp, validateNewName, VaultPathError } from './paths';

// Same cases as src-tauri/src/vault/guard.rs and src-tauri/src/names.rs.
describe('parseRelative', () => {
  it('accepts vault-relative paths', () => {
    expect(parseRelative('_Notes/Scratchpad.md')).toEqual(['_Notes', 'Scratchpad.md']);
    expect(parseRelative('./_Notes/')).toEqual(['_Notes']);
    expect(parseRelative('')).toEqual([]);
    expect(normalizePath('a//b/./c/')).toBe('a/b/c');
  });

  it.each(['..', '../x', '_Notes/../../x', '_Notes/..'])('rejects parent segment %s', (rel) => {
    expect(() => parseRelative(rel)).toThrow(/'\.\.'/);
  });

  it.each(['/etc/passwd', 'C:/Windows', 'c:relative', '//server/share/x'])(
    'rejects absolute or drive path %s',
    (rel) => {
      expect(() => parseRelative(rel)).toThrow(/relative to the vault/);
    }
  );

  it.each(['\\\\server\\share', '_Notes\\x.md', 'a\0b'])('rejects backslash or NUL in %j', (rel) => {
    expect(() => parseRelative(rel)).toThrow(VaultPathError);
  });
});

describe('validateNewName', () => {
  it.each([
    'README.md',
    'INV-2026-001_ACME.md',
    '02_Literature',
    'Kanso notes',
    'Brief v2 (final).pdf',
    '.kanso-open.json',
    'console.md',
    'COM10.txt'
  ])('accepts %s', (name) => {
    expect(() => validateNewName(name)).not.toThrow();
  });

  it.each([
    '', '.', '..', 'a<b', 'a>b', 'a:b', 'a"b', 'a/b', 'a\\b', 'a|b', 'a?b', 'a*b',
    'tab\tname', 'trailing.', 'trailing ', 'CON', 'con.md', 'Nul.txt', 'AUX',
    'com1', 'LPT9.log', 'prn .md'
  ])('rejects %j', (name) => {
    expect(() => validateNewName(name)).toThrow(VaultPathError);
  });

  it('rejects names over 255 bytes', () => {
    expect(() => validateNewName('a'.repeat(256))).toThrow(/255 bytes/);
  });
});

describe('utcStamp', () => {
  it('matches the Rust archive stamp', () => {
    expect(utcStamp(new Date(0))).toBe('19700101-000000');
    expect(utcStamp(new Date(951_782_400_000))).toBe('20000229-000000');
    expect(utcStamp(new Date(1_794_617_045_000))).toBe('20261114-004405');
  });
});
