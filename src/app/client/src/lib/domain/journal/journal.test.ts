import { describe, expect, it } from 'vitest';
import { addDays, assertDate, isoWeek, isoWeekMonday, localDate, longDate, mondayOf, weekDates } from './dates';
import { parseDailyNote, serializeDailyNote } from './daily';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { readInvoiceSummaries } from '../finance/summaries';

const NOW = new Date(2026, 8, 15, 9, 0, 0);

describe('journal dates', () => {
  it('uses the local calendar date of now', () => {
    expect(localDate(new Date(2026, 0, 3, 23, 59))).toBe('2026-01-03');
  });

  it('does calendar arithmetic independent of the time zone', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(mondayOf('2026-09-20')).toBe('2026-09-14');
    expect(mondayOf('2026-09-14')).toBe('2026-09-14');
    expect(weekDates('2026-09-16')[6]).toBe('2026-09-20');
    expect(longDate('2026-09-15')).toBe('Tuesday, September 15, 2026');
  });

  it('computes ISO weeks both ways', () => {
    expect(isoWeek('2026-09-15')).toBe('2026-W38');
    expect(isoWeek('2027-01-01')).toBe('2026-W53');
    expect(isoWeekMonday('2026-W42')).toBe('2026-10-12');
    expect(isoWeekMonday('2026-W01')).toBe('2025-12-29');
  });

  it('rejects non-dates', () => {
    expect(() => assertDate('2026-13-01')).toThrow(/Invalid date/);
    expect(() => assertDate('../2026-09-01')).toThrow(/Invalid date/);
  });
});

describe('daily note format', () => {
  it('round-trips every BuJo symbol', () => {
    const md = serializeDailyNote({
      date: '2026-09-15',
      title: 'Log',
      focusIntentions: ['Focus'],
      entries: [
        { type: 'task', text: 'A' },
        { type: 'done', text: 'B' },
        { type: 'migrated', text: 'C' },
        { type: 'event', text: 'D' },
        { type: 'note', text: 'E' },
        { type: 'priority', text: 'F' }
      ]
    });
    const note = parseDailyNote(md, '2026-09-15', NOW);
    expect(note.entries.map((e) => `${e.type}:${e.text}`)).toEqual(['task:A', 'done:B', 'migrated:C', 'event:D', 'note:E', 'priority:F']);
    expect(note.focusIntentions).toEqual(['Focus']);
    expect(note.habits).toEqual([]);
  });

  it('keeps defaults when the YAML is broken and parses entries before any heading', () => {
    const note = parseDailyNote('---\ntitle: [oops\n---\n- [x] Done early\n- [ ] Open\n', '2026-09-15', NOW);
    expect(note.title).toBe('Daily Creative Log');
    expect(note.entries.map((e) => e.type)).toEqual(['done', 'task']);
  });
});

describe('invoice summaries', () => {
  it('reads totals, hours and dates like FinanceVaultService', async () => {
    const fs = new MemoryVaultFs({
      '_Finance/Invoices/INV-2026-009_NEX.md':
        '---\ndocumentNumber: INV-2026-009\ndate: 2026-09-05\nclient_code: NEX\nitems:\n  - hours: 4\n    amount: 400\n  - amount: 100\ntax_percent: 10\n---\n',
      '_Finance/Invoices/X.md': '---\ntotal: 10\n---\n'
    });
    const [inv, bare] = await readInvoiceSummaries(fs, NOW);
    expect(inv).toMatchObject({ date: '2026-09-15', total: 10 });
    expect(bare).toMatchObject({ date: '2026-09-05', status: 'draft', clientCode: 'NEX', total: 550, id: 'inv-2026-009__INV-2026-009_NEX' });
    expect(bare.items).toEqual([{ quantity: 4 }, { quantity: 1 }]);
  });
});
