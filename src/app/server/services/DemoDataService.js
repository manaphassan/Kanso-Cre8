const fs = require('fs');
const path = require('path');
const config = require('../config');
const ConfigService = require('./ConfigService');

/**
 * DemoDataService — Kanso Cre8
 *
 * Owns the canonical sample data (Acme Corp, Nexus Studio, Lumina Labs) and the
 * `demo_data` flag in <vault>/_Team/_Config/preferences.json.
 * Every seeder in the server must ask `isEnabled()` before writing or returning samples,
 * so a reset vault stays empty until the designer explicitly loads demo data.
 */

const DEMO_CLIENT_FOLDERS = ['ACME_AcmeCorp', 'NEX_NexusStudio', 'LUM_LuminaLabs'];
const DEMO_PROJECT_FOLDERS = [
  '202609_0001D_ACME_MobileAppIllustration',
  '202609_0002S_NEX_GameKeyVisual',
  '202609_0003P_LUM_BrandIdentity'
];
const DEMO_QUOTE_PREFIX = 'QTE-2026-001_';

function root() {
  return config.WORKSPACE_ROOT;
}

function listFilesRecursive(dir) {
  let count = 0;
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      count += e.isDirectory() ? listFilesRecursive(full) : 1;
    }
  } catch (_) {}
  return count;
}

class DemoDataService {
  static isEnabled() {
    try {
      return ConfigService.vault.get('preferences').demo_data === true;
    } catch (_) {
      return false;
    }
  }

  static setEnabled(enabled) {
    ConfigService.vault.set('preferences', { demo_data: Boolean(enabled) });
  }

  /** Locates every demo item currently on disk. Each entry: { kind, label, abs, files }. */
  static inspect() {
    const items = [];
    const r = root();

    for (const folder of DEMO_CLIENT_FOLDERS) {
      const abs = path.join(r, '_Clients', folder);
      if (fs.existsSync(abs)) items.push({ kind: 'client', label: folder, abs, files: listFilesRecursive(abs) });
    }

    const projectsRoot = path.join(r, '_Projects');
    if (fs.existsSync(projectsRoot)) {
      for (const year of safeDirs(projectsRoot)) {
        for (const folder of DEMO_PROJECT_FOLDERS) {
          const abs = path.join(projectsRoot, year, folder);
          if (fs.existsSync(abs)) items.push({ kind: 'project', label: folder, abs, files: listFilesRecursive(abs) });
        }
      }
    }

    const quotesDir = path.join(r, '_Finance', 'Quotes');
    for (const f of safeFiles(quotesDir)) {
      if (f.startsWith(DEMO_QUOTE_PREFIX)) items.push({ kind: 'quote', label: f, abs: path.join(quotesDir, f), files: 1 });
    }

    const notesDir = path.join(r, '_Notes');
    const demoNoteIds = require('./NotesVaultService').DEMO_NOTE_IDS;
    for (const cat of safeDirs(notesDir)) {
      for (const f of safeFiles(path.join(notesDir, cat))) {
        const abs = path.join(notesDir, cat, f);
        let raw = '';
        try { raw = fs.readFileSync(abs, 'utf8'); } catch (_) {}
        if (demoNoteIds.some(id => new RegExp(`^id:\\s*['"]?${id}['"]?\\s*$`, 'm').test(raw))) {
          items.push({ kind: 'note', label: f, abs, files: 1 });
        }
      }
    }

    return items;
  }

  static getStatus() {
    const items = this.inspect();
    const counts = items.reduce((acc, i) => { acc[i.kind] = (acc[i.kind] || 0) + 1; return acc; }, {});
    return {
      enabled: this.isEnabled(),
      present: items.length > 0,
      counts,
      totalFiles: items.reduce((n, i) => n + i.files, 0),
      items: items.map(({ kind, label, files }) => ({ kind, label, files }))
    };
  }

  /** Turns the flag on and writes the sample clients, projects, quote and notes (never overwrites). */
  static load() {
    this.setEnabled(true);
    const CompanyService = require('./CompanyService');
    const NotesVaultService = require('./NotesVaultService');
    const FinanceVaultService = require('./FinanceVaultService');
    const ScaffoldService = require('./ScaffoldService');
    const ProjectService = require('./ProjectService');

    CompanyService.ensureCanonicalSeeds();
    NotesVaultService.ensureSeeded();
    FinanceVaultService.ensureQuotesSeeded();
    ScaffoldService.seedSampleProjects();
    ProjectService.scan(true);
    return this.getStatus();
  }

  /**
   * Removes only the known demo items and turns the flag off.
   * Client folders holding anything besides client.md are skipped so user additions survive.
   */
  static clear() {
    const removed = [];
    const skipped = [];
    for (const item of this.inspect()) {
      try {
        if (item.kind === 'client') {
          const extras = fs.readdirSync(item.abs).filter(n => n !== 'client.md');
          if (extras.length) { skipped.push({ label: item.label, reason: 'contains your own files' }); continue; }
        }
        fs.rmSync(item.abs, { recursive: true, force: true });
        removed.push({ kind: item.kind, label: item.label });
      } catch (err) {
        skipped.push({ label: item.label, reason: err.message });
      }
    }
    this.setEnabled(false);

    try { require('./ProjectService').scan(true); } catch (_) {}
    try { require('./CompanyService').memoryCompanies = null; } catch (_) {}
    return { removed, skipped };
  }
}

function safeDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  } catch (_) { return []; }
}

function safeFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name);
  } catch (_) { return []; }
}

module.exports = DemoDataService;
