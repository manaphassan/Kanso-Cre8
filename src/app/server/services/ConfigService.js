const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');

/**
 * ConfigService — Kanso Cre8 Unified Configuration Service
 *
 * Source of truth for reading and writing config across the two persistent storage tiers:
 *
 * 1. Machine Tier:
 *    - Windows: %APPDATA%/KansoCre8/app.json
 *    - Linux: ~/.config/kansocre8/app.json (or XDG_CONFIG_HOME)
 *    - Mac: ~/Library/Application Support/KansoCre8/app.json
 *    Holds machine-specific settings: active vault, recent vaults, AI key, server secret, running timer.
 *    Written with user-only permissions (0o600). Never synced to cloud vaults.
 *
 * 2. Vault Tier:
 *    - Location: <vault>/_Team/_Config/
 *    - Documents:
 *      * studio_profile.json ('studio' | 'studio_profile')
 *      * preferences.json ('preferences')
 *      * license.json ('license')
 *    Plain UTF-8 JSON, safe for universal cloud sync.
 *
 * Law: All config reads and writes in the server pass through ConfigService.
 */

// Canonical default seeds for vault config files
const DEFAULT_STUDIO_PROFILE = {
  studioName: 'Acme Design Studio',
  principalName: 'Alex Mercer',
  freelancerName: 'Alex Mercer',
  professionalTitle: 'Principal Art Director & Brand Architect',
  tagline: 'Mindful Brand Systems & Digital Craft',
  registration_no: '2026-ACME-0001',
  businessRegNo: '2026-ACME-0001',
  billingEmail: 'billing@example.com',
  email: 'billing@example.com',
  studioAddress: '100 Creative Way, Suite 400, Metropolis',
  address: '100 Creative Way, Suite 400, Metropolis',
  website: 'https://example.com',
  phone: '+1-555-0100',
  paymentBank: 'Acme Federal Bank',
  bankName: 'Acme Federal Bank',
  paymentAccountNo: '0000-0000-0000',
  accountNumber: '0000-0000-0000',
  paymentAccountName: 'Acme Design Studio',
  accountHolder: 'Acme Design Studio',
  paymentSwiftOrQr: 'SWIFT: ACMEUS33 / DuitNow: 00000000',
  swift_bic: 'ACMEUS33',
  duitnow_id: '00000000',
  defaultPaymentTerms: '50% Upfront Deposit • Net 14 Days • 2 Revision Rounds',
  defaultCurrency: 'USD',
  brandColor: '#0284C7',
  logo: '',
  logo_url: '',
  digitalSignature: '',
  signature_text: 'Alex Mercer',
  signature_url: '',
  footerNotice: 'Crafted with mindful focus & precision in Kanso Cre8.'
};

const DEFAULT_PREFERENCES = {
  theme: 'dark',
  default_project_view: 'kanban',
  density: 'comfortable',
  hourly_rate: 150,
  currency: 'USD',
  radio_favorites: [],
  pomodoro_minutes: 25
};

const DEFAULT_LICENSE = {
  active: true,
  tier: 'free',
  licenseKey: null,
  issuedTo: 'Studio User'
};

class ConfigService {
  /**
   * Helper to write a JSON file atomically with optional file mode.
   */
  static _writeAtomicJson(filePath, data, mode = null) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: mode ? 0o700 : undefined });
    }

    const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const content = JSON.stringify(data, null, 2);

    try {
      if (mode) {
        fs.writeFileSync(tempPath, content, { encoding: 'utf8', mode });
        try { fs.chmodSync(tempPath, mode); } catch (_) {}
      } else {
        fs.writeFileSync(tempPath, content, 'utf8');
      }

      try {
        fs.renameSync(tempPath, filePath);
      } catch (renameErr) {
        fs.writeFileSync(filePath, content, 'utf8');
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
      return true;
    } catch (err) {
      console.error(`[ConfigService] Failed to write atomically to ${filePath}:`, err.message);
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
      return false;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 1. MACHINE TIER (%APPDATA%/KansoCre8/app.json)
  // ═════════════════════════════════════════════════════════════════════════
  static machine = {
    /**
     * Resolves canonical OS application data path for machine config.
     */
    getPath() {
      if (typeof config.getMachineConfigPath === 'function') {
        return config.getMachineConfigPath();
      }
      if (process.platform === 'win32') {
        const appData = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
        return path.join(appData, 'KansoCre8', 'app.json');
      } else if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'KansoCre8', 'app.json');
      } else {
        const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        return path.join(configHome, 'kansocre8', 'app.json');
      }
    },

    /**
     * Loads the complete machine configuration object.
     */
    getAll() {
      const p = this.getPath();
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          return JSON.parse(raw);
        }
      } catch (err) {
        console.warn('[ConfigService] Failed to parse machine config:', err.message);
      }
      return {};
    },

    /**
     * Retrieves a single key from machine config.
     */
    get(key, defaultValue = null) {
      const cfg = this.getAll();
      return (cfg && cfg[key] !== undefined) ? cfg[key] : defaultValue;
    },

    /**
     * Atomically sets a single key in machine config.
     */
    set(key, value) {
      const cfg = this.getAll();
      cfg[key] = value;
      cfg.updatedAt = new Date().toISOString();
      return ConfigService._writeAtomicJson(this.getPath(), cfg, 0o600);
    },

    /**
     * Atomically merges multiple keys into machine config.
     */
    setMultiple(entries) {
      const cfg = this.getAll();
      Object.assign(cfg, entries);
      cfg.updatedAt = new Date().toISOString();
      return ConfigService._writeAtomicJson(this.getPath(), cfg, 0o600);
    },

    /**
     * Deletes a key from machine config.
     */
    delete(key) {
      const cfg = this.getAll();
      if (key in cfg) {
        delete cfg[key];
        cfg.updatedAt = new Date().toISOString();
        return ConfigService._writeAtomicJson(this.getPath(), cfg, 0o600);
      }
      return true;
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // 2. VAULT TIER (<vault>/_Team/_Config/)
  // ═════════════════════════════════════════════════════════════════════════
  static vault = {
    /**
     * Dynamic workspace root accessor.
     */
    getRoot() {
      return config.WORKSPACE_ROOT;
    },

    /**
     * Directory path for vault configuration: <vault>/_Team/_Config/
     */
    getConfigDir() {
      const dir = path.join(this.getRoot(), '_Team', '_Config');
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (err) {
          console.warn('[ConfigService] Failed to create _Team/_Config dir:', err.message);
        }
      }
      return dir;
    },

    /**
     * Maps document name to canonical JSON filename.
     */
    resolveFilename(name) {
      const lower = String(name || '').toLowerCase().trim();
      if (lower === 'studio' || lower === 'studio_profile' || lower === 'studio-profile') {
        return 'studio_profile.json';
      }
      if (lower === 'preferences' || lower === 'prefs') {
        return 'preferences.json';
      }
      if (lower === 'license') {
        return 'license.json';
      }
      return `${lower}.json`;
    },

    /**
     * Returns absolute path to a vault config file.
     */
    getPath(name) {
      return path.join(this.getConfigDir(), this.resolveFilename(name));
    },

    /**
     * Returns default seed object for a given config document.
     */
    getDefault(name) {
      const lower = String(name || '').toLowerCase().trim();
      if (lower === 'studio' || lower === 'studio_profile' || lower === 'studio-profile') {
        return { ...DEFAULT_STUDIO_PROFILE };
      }
      if (lower === 'preferences' || lower === 'prefs') {
        return { ...DEFAULT_PREFERENCES };
      }
      if (lower === 'license') {
        return { ...DEFAULT_LICENSE };
      }
      return {};
    },

    /**
     * Reads a vault config document, automatically seeding and returning defaults if missing.
     */
    get(name) {
      const filePath = this.getPath(name);
      const defaults = this.getDefault(name);

      if (!fs.existsSync(filePath)) {
        return { ...defaults };
      }

      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...defaults, ...parsed };
      } catch (err) {
        console.warn(`[ConfigService] Error reading vault config '${name}':`, err.message);
        return defaults;
      }
    },

    /**
     * Atomically updates a vault config document by merging provided data.
     */
    set(name, data) {
      const filePath = this.getPath(name);
      const current = this.get(name);
      const updated = { ...current, ...data };
      ConfigService._writeAtomicJson(filePath, updated);
      return updated;
    },

    /**
     * Checks if a vault config file exists on disk.
     */
    exists(name) {
      const filePath = this.getPath(name);
      return fs.existsSync(filePath);
    },

    /**
     * Safely deletes a vault config file.
     */
    delete(name) {
      const filePath = this.getPath(name);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return true;
      } catch (err) {
        console.error(`[ConfigService] Failed to delete vault config '${name}':`, err.message);
        return false;
      }
    },

    /**
     * Executes vault migration on target root.
     */
    migrate(vaultRoot = null) {
      return ConfigService.migrateVault(vaultRoot);
    }
  };

  /**
   * Idempotent migration of an old or legacy vault to canonical Kanso Zen structure.
   * Consolidates _Team/_Config/ into 3 canonical files:
   *   1. studio_profile.json
   *   2. preferences.json
   *   3. license.json
   *
   * Backs up retired files to the Machine tier (<appData>/backups/<name>.migrated.bak)
   * before deleting them from the vault. Never deletes or touches user .md files.
   *
   * @param {string} [targetVaultRoot] - Directory of the vault to migrate. Defaults to active root.
   * @returns {{ success: boolean, actions: string[], backups: string[], errors: string[] }}
   */
  static migrateVault(targetVaultRoot = null) {
    const vaultRoot = targetVaultRoot || this.vault.getRoot();
    const configDir = path.join(vaultRoot, '_Team', '_Config');
    const actions = [];
    const backups = [];
    const errors = [];

    if (!fs.existsSync(configDir)) {
      return { success: true, actions: ['Config directory does not exist, nothing to migrate.'], backups, errors };
    }

    const machineConfigDir = path.dirname(this.machine.getPath());
    const backupDir = path.join(machineConfigDir, 'backups');
    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
      }
    } catch (err) {
      console.warn('[ConfigService] Could not create machine backups dir:', err.message);
    }

    const backupFile = (filename) => {
      const src = path.join(configDir, filename);
      if (fs.existsSync(src)) {
        try {
          const dest = path.join(backupDir, `${filename}.migrated.bak`);
          fs.copyFileSync(src, dest);
          backups.push(dest);
          return true;
        } catch (err) {
          errors.push(`Failed to backup ${filename}: ${err.message}`);
          return false;
        }
      }
      return false;
    };

    // 1. theme.txt -> preferences.json
    const themeTxtPath = path.join(configDir, 'theme.txt');
    if (fs.existsSync(themeTxtPath)) {
      try {
        const themeContent = fs.readFileSync(themeTxtPath, 'utf8').trim().toLowerCase();
        if (themeContent) {
          const prefsPath = path.join(configDir, 'preferences.json');
          let currentPrefs = { ...DEFAULT_PREFERENCES };
          if (fs.existsSync(prefsPath)) {
            try {
              currentPrefs = { ...currentPrefs, ...JSON.parse(fs.readFileSync(prefsPath, 'utf8')) };
            } catch (_) {}
          }
          currentPrefs.theme = themeContent;
          this._writeAtomicJson(prefsPath, currentPrefs);
          actions.push(`Migrated theme.txt ('${themeContent}') into preferences.json`);
        }
        if (backupFile('theme.txt')) {
          fs.unlinkSync(themeTxtPath);
          actions.push('Backed up and removed legacy theme.txt from vault');
        }
      } catch (err) {
        errors.push(`Failed to migrate theme.txt: ${err.message}`);
      }
    }

    // 2. license.key -> license.json
    const licenseKeyPath = path.join(configDir, 'license.key');
    if (fs.existsSync(licenseKeyPath)) {
      try {
        const keyContent = fs.readFileSync(licenseKeyPath, 'utf8').trim();
        if (keyContent) {
          const licPath = path.join(configDir, 'license.json');
          let currentLic = { ...DEFAULT_LICENSE };
          if (fs.existsSync(licPath)) {
            try {
              currentLic = { ...currentLic, ...JSON.parse(fs.readFileSync(licPath, 'utf8')) };
            } catch (_) {}
          }
          currentLic.active = true;
          currentLic.tier = 'pro';
          currentLic.licenseKey = keyContent;
          this._writeAtomicJson(licPath, currentLic);
          actions.push('Migrated license.key into license.json');
        }
        if (backupFile('license.key')) {
          fs.unlinkSync(licenseKeyPath);
          actions.push('Backed up and removed legacy license.key from vault');
        }
      } catch (err) {
        errors.push(`Failed to migrate license.key: ${err.message}`);
      }
    }

    // 3. Normalize studio_profile.json keys to canonical AGENTS.md spec
    const studioPath = path.join(configDir, 'studio_profile.json');
    if (fs.existsSync(studioPath)) {
      try {
        const raw = fs.readFileSync(studioPath, 'utf8');
        const parsed = JSON.parse(raw);
        let changed = false;

        const normalized = { ...DEFAULT_STUDIO_PROFILE, ...parsed };

        if (parsed.businessRegNo && !parsed.registration_no) {
          normalized.registration_no = parsed.businessRegNo;
          changed = true;
        }
        if (parsed.digitalSignature && !parsed.signature_text) {
          normalized.signature_text = parsed.digitalSignature;
          changed = true;
        }
        if (parsed.logo && !parsed.logo_url) {
          normalized.logo_url = parsed.logo;
          changed = true;
        }
        if (parsed.paymentSwiftOrQr && (!parsed.swift_bic || !parsed.duitnow_id)) {
          if (parsed.paymentSwiftOrQr.includes('SWIFT:')) {
            const parts = parsed.paymentSwiftOrQr.split('/');
            const swiftPart = parts.find(p => p.includes('SWIFT:'));
            const duitPart = parts.find(p => p.includes('DuitNow:'));
            if (swiftPart && !parsed.swift_bic) {
              normalized.swift_bic = swiftPart.replace('SWIFT:', '').trim();
              changed = true;
            }
            if (duitPart && !parsed.duitnow_id) {
              normalized.duitnow_id = duitPart.replace('DuitNow:', '').trim();
              changed = true;
            }
          }
        }

        if (changed || !fs.existsSync(studioPath)) {
          this._writeAtomicJson(studioPath, normalized);
          actions.push('Normalized studio_profile.json keys (registration_no, signature_text, logo_url, swift_bic, duitnow_id)');
        }
      } catch (err) {
        errors.push(`Failed to normalize studio_profile.json: ${err.message}`);
      }
    }

    // 4. Retire old JSON files: user_passwords.json, staff_directory.json, team-notes.json
    const retiredFiles = ['user_passwords.json', 'staff_directory.json', 'team-notes.json'];
    for (const filename of retiredFiles) {
      const fullPath = path.join(configDir, filename);
      if (fs.existsSync(fullPath)) {
        try {
          if (backupFile(filename)) {
            fs.unlinkSync(fullPath);
            actions.push(`Backed up and retired ${filename}`);
          }
        } catch (err) {
          errors.push(`Failed to retire ${filename}: ${err.message}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      actions,
      backups,
      errors
    };
  }

  // Top-level convenience accessors
  static getMachine(key, defaultValue) {
    return this.machine.get(key, defaultValue);
  }

  static setMachine(key, value) {
    return this.machine.set(key, value);
  }

  static getVault(name) {
    return this.vault.get(name);
  }

  static setVault(name, data) {
    return this.vault.set(name, data);
  }
}

module.exports = ConfigService;
