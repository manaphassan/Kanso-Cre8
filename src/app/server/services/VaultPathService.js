const fs = require('fs');
const path = require('path');
const config = require('../config');
const AuditService = require('./AuditService');

class VaultPathService {
  constructor() {
    this._workspaceRoot = config.WORKSPACE_ROOT;
  }

  get workspaceRoot() {
    return this._workspaceRoot || config.WORKSPACE_ROOT;
  }

  set workspaceRoot(newPath) {
    this._workspaceRoot = newPath;
    config.WORKSPACE_ROOT = newPath;
  }

  /**
   * Idempotent check-and-repair of the canonical Kanso Zen layout.
   * Only creates what is missing; never overwrites or deletes user files.
   * @param {string} root - Vault root path
   * @param {boolean} autoCreateRoot - Whether to create root if it does not exist
   * @returns {{ root: string, createdDirs: string[], createdFiles: string[], errors: string[] }}
   */
  ensureVaultStructure(root = this.workspaceRoot, autoCreateRoot = false) {
    const createdDirs = [];
    const createdFiles = [];
    const errors = [];
    const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

    const dirs = [
      '_Clients',
      '_Finance/Quotes',
      '_Finance/Invoices',
      `_Projects/${new Date().getFullYear()}`,
      '_Journal/Daily',
      '_Journal/Monthly',
      '_Journal/Yearly',
      '_Notes/01_Fleeting',
      '_Notes/02_Literature',
      '_Notes/03_Permanent',
      '_Team/_Config'
    ];
    const files = [
      {
        rel: '_Notes/Scratchpad.md',
        content: '# Atelier Scratchpad\n\nTransient capture buffer for clipboard snippets and scratch ideas.\n'
      }
    ];

    try {
      if (!fs.existsSync(root)) {
        if (!autoCreateRoot) {
          return { root, createdDirs, createdFiles, errors: [`Vault root folder does not exist: ${root}`] };
        }
        fs.mkdirSync(root, { recursive: true });
      }
    } catch (err) {
      return { root, createdDirs, createdFiles, errors: [`Cannot create vault root: ${err.message}`] };
    }

    for (const d of dirs) {
      const full = path.join(root, d);
      try {
        if (!fs.existsSync(full)) {
          fs.mkdirSync(full, { recursive: true });
          createdDirs.push(rel(full));
        }
      } catch (err) {
        errors.push(`${d}: ${err.message}`);
      }
    }

    for (const f of files) {
      const full = path.join(root, f.rel);
      try {
        if (!fs.existsSync(full)) {
          fs.writeFileSync(full, f.content, 'utf8');
          createdFiles.push(rel(full));
        }
      } catch (err) {
        errors.push(`${f.rel}: ${err.message}`);
      }
    }

    if (createdDirs.length || createdFiles.length) {
      console.log(`[VaultPathService] Repaired vault structure at ${root}: +${createdDirs.length} dirs, +${createdFiles.length} files`);
    }
    return { root, createdDirs, createdFiles, errors };
  }

  /**
   * Startup/boot check: is the mounted vault reachable, writable and structurally complete?
   * Repairs missing canonical folders as a side effect.
   * @param {string} root
   * @returns {{ ok: boolean, status: 'ok'|'missing_root'|'not_writable'|'repair_failed', reason?: string, message?: string, root: string, repaired: string[], errors: string[] }}
   */
  getVaultStatus(root = this.workspaceRoot) {
    if (!root || !fs.existsSync(root)) {
      return { ok: false, status: 'missing_root', reason: 'missing_root', message: `Vault folder not found: ${root}`, root: root || '', repaired: [], errors: ['Vault root folder not found on disk.'] };
    }
    try {
      const probe = path.join(root, `.kanso-probe-${Date.now()}`);
      fs.writeFileSync(probe, 'ok', 'utf8');
      fs.unlinkSync(probe);
    } catch (err) {
      return { ok: false, status: 'not_writable', reason: 'not_writable', message: `Vault folder is not readable/writable: ${err.message}`, root, repaired: [], errors: [`Vault folder is not writable: ${err.message}`] };
    }
    const repair = this.ensureVaultStructure(root, false);
    const repaired = [...repair.createdDirs, ...repair.createdFiles];
    if (repair.errors.length) {
      return { ok: false, status: 'repair_failed', reason: 'repair_failed', message: repair.errors[0], root, repaired, errors: repair.errors };
    }
    return { ok: true, status: 'ok', root, repaired, errors: [] };
  }

  /**
   * Reset the 6 canonical folders in the vault with Archive First safety.
   * Leaves non-canonical files and folders intact.
   * @param {string} confirmationName - Must match path.basename(workspaceRoot)
   * @param {string} actor - Identity for audit logging
   * @returns {{ success: boolean, message: string, root: string, archivePath: string|null, repaired: string[] }}
   */
  resetVaultStructure(confirmationName, actor = 'Administrator') {
    if (!this.workspaceRoot || !fs.existsSync(this.workspaceRoot)) {
      throw new Error(`Vault root directory does not exist: ${this.workspaceRoot}`);
    }

    const expectedName = path.basename(path.resolve(this.workspaceRoot));
    if (!confirmationName || confirmationName.trim().toLowerCase() !== expectedName.toLowerCase()) {
      throw new Error(`Confirmation failed: typed folder name "${confirmationName || ''}" does not match "${expectedName}".`);
    }

    const CANONICAL_FOLDERS = ['_Clients', '_Finance', '_Projects', '_Journal', '_Notes', '_Team'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(this.workspaceRoot, '_Archive', `reset-${timestamp}`);
    let hasArchived = false;

    for (const folder of CANONICAL_FOLDERS) {
      const src = path.join(this.workspaceRoot, folder);
      if (fs.existsSync(src)) {
        if (!hasArchived) {
          fs.mkdirSync(archiveDir, { recursive: true });
          hasArchived = true;
        }
        fs.renameSync(src, path.join(archiveDir, folder));
      }
    }

    const repair = this.ensureVaultStructure(this.workspaceRoot, true);

    AuditService.logEvent({
      actor,
      action: 'VAULT_STRUCTURE_RESET',
      entityType: 'System',
      entityId: 'VaultStructure',
      details: {
        root: this.workspaceRoot,
        archiveDir: hasArchived ? archiveDir : null,
        timestamp: new Date().toISOString()
      }
    });

    try {
      const ProjectService = require('./ProjectService');
      ProjectService.scan(true);
    } catch (_) {}

    try {
      const SseService = require('./SseService');
      SseService.broadcast('workspace:updated', { reason: 'vault_reset', root: this.workspaceRoot });
    } catch (_) {}

    return {
      success: true,
      message: 'Vault structure reset successfully with canonical items archived.',
      root: this.workspaceRoot,
      archivePath: hasArchived ? archiveDir : null,
      repaired: [...repair.createdDirs, ...repair.createdFiles]
    };
  }

  ensureWorkspace() {
    if (!fs.existsSync(this.workspaceRoot)) {
      try {
        fs.mkdirSync(this.workspaceRoot, { recursive: true });
        console.log(`[VaultPathService] Created workspace root at: ${this.workspaceRoot}`);
        if (process.env.SEED_SAMPLES === 'true') {
          const ScaffoldService = require('./ScaffoldService');
          ScaffoldService.seedSampleProjects();
        }
      } catch (err) {
        console.error(`[VaultPathService] Could not create workspace root: ${err.message}`);
      }
    } else {
      if (process.env.SEED_SAMPLES === 'true') {
        try {
          const items = fs.readdirSync(this.workspaceRoot);
          const hasProjects = items.some(item => (!item.startsWith('.') && !item.startsWith('_')) || item === '_Projects');
          if (!hasProjects) {
            const ScaffoldService = require('./ScaffoldService');
            ScaffoldService.seedSampleProjects();
          }
        } catch (e) {
          console.warn(`[VaultPathService] Check workspace items warning:`, e.message);
        }
      }
    }
  }

  migrateVault(targetPath = null) {
    try {
      const ConfigService = require('./ConfigService');
      return ConfigService.migrateVault(targetPath || this.workspaceRoot);
    } catch (err) {
      console.warn('[VaultPathService] Vault migration warning:', err.message);
      return { success: false, error: err.message };
    }
  }

  countFiles(dir) {
    if (!fs.existsSync(dir)) return 0;
    try {
      return fs.readdirSync(dir).filter(f => !f.startsWith('.')).length;
    } catch (e) {
      return 0;
    }
  }

  extractDesignerFromPath(fullPath) {
    try {
      const relative = path.relative(this.workspaceRoot, fullPath);
      const parts = relative.split(path.sep);
      if (parts.length > 0 && !parts[0].startsWith('SS-') && !/^\d{6}/.test(parts[0]) && !/^\d{4}[A-Za-z]?$/.test(parts[0])) {
        return parts[0];
      }
    } catch (e) {}
    return 'Unassigned';
  }

  inferCreatedDate(folderName, fullPath) {
    if (folderName && folderName.length >= 6) {
      const y = folderName.substring(0, 4);
      const m = folderName.substring(4, 6);
      return `${y}-${m}-01`;
    }
    return new Date().toISOString().substring(0, 10);
  }

  getWorkspaceCandidates() {
    const userDocs = path.join(process.env.USERPROFILE || '', 'Documents', 'KansoCre8');
    const userOneDriveDocs = path.join(process.env.USERPROFILE || '', 'OneDrive', 'Documents', 'KansoCre8');
    const candidates = [
      userDocs,
      userOneDriveDocs,
      'D:\\KansoCre8',
      'D:\\OneDrive\\Völundr',
      path.resolve(__dirname, '../sample-workspace')
    ];

    const currentRoot = this.workspaceRoot || config.WORKSPACE_ROOT;
    const results = candidates.map(p => {
      let accessible = false;
      let count = 0;
      try {
        if (fs.existsSync(p)) {
          const items = fs.readdirSync(p);
          accessible = true;
          count = items.length;
        }
      } catch (e) {
        accessible = false;
      }
      return {
        path: p,
        accessible,
        exists: accessible,
        itemCount: count,
        isCurrent: path.resolve(p) === path.resolve(currentRoot)
      };
    });

    return { candidates: results, current: currentRoot };
  }

  scanSyncConflicts() {
    const conflicts = [];
    const root = this.workspaceRoot;
    if (!fs.existsSync(root)) return conflicts;

    const conflictPatterns = [
      /conflicted copy/i,
      /\(Case Conflict\)/i,
      /\.sync-conflict-/i,
      /\.sync-temp-/i,
      /\(conflict\)/i
    ];

    const isConflictFilename = (name) => conflictPatterns.some(p => p.test(name));

    const deriveBaseFilename = (filename) => {
      const ext = path.extname(filename);
      let baseWithoutExt = path.basename(filename, ext);
      baseWithoutExt = baseWithoutExt
        .replace(/\s*\([^)]*conflicted copy[^)]*\)/gi, '')
        .replace(/\s*[-_.]*conflicted copy[-_.]*/gi, '')
        .replace(/\s*\(Case Conflict\)/gi, '')
        .replace(/\.sync-conflict-\d+-\w+/gi, '')
        .replace(/\.sync-temp-\d+/gi, '')
        .replace(/\s*\([^)]*conflict[^)]*\)/gi, '')
        .replace(/\s*[-_.]*conflict[-_.]*/gi, '')
        .trim();
      return `${baseWithoutExt}${ext}`;
    };

    const crawl = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
            crawl(fullPath);
          } else if (entry.isFile()) {
            if (isConflictFilename(entry.name)) {
              try {
                const stat = fs.statSync(fullPath);
                const baseName = deriveBaseFilename(entry.name);
                const baseFullPath = path.join(dir, baseName);
                const baseExists = fs.existsSync(baseFullPath);
                let baseStat = null;
                if (baseExists) {
                  try { baseStat = fs.statSync(baseFullPath); } catch (e) {}
                }

                conflicts.push({
                  conflictPath: fullPath,
                  relPath: path.relative(root, fullPath).replace(/\\/g, '/'),
                  filename: entry.name,
                  sizeBytes: stat.size,
                  mtime: stat.mtime.toISOString(),
                  baseFilename: baseName,
                  basePath: baseFullPath,
                  baseRelPath: path.relative(root, baseFullPath).replace(/\\/g, '/'),
                  baseExists,
                  baseSizeBytes: baseStat ? baseStat.size : null,
                  baseMtime: baseStat ? baseStat.mtime.toISOString() : null
                });
              } catch (err) {
                console.warn('[VaultPathService] Error analyzing conflict file:', err.message);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[VaultPathService] Error crawling for conflicts:', err.message);
      }
    };

    crawl(root);
    return conflicts;
  }

  resolveSyncConflict(conflictPath, resolution = 'keep_local', actor = 'Designer') {
    if (!conflictPath || !fs.existsSync(conflictPath)) {
      throw new Error(`Conflict file not found on disk: ${conflictPath}`);
    }

    const resolvedPath = path.resolve(conflictPath);
    if (!resolvedPath.startsWith(path.resolve(this.workspaceRoot))) {
      throw new Error('Access denied: target path is outside workspace root.');
    }

    const dir = path.dirname(resolvedPath);
    const filename = path.basename(resolvedPath);
    let base = filename;
    base = base.replace(/\s*\([^)]*conflicted copy[^)]*\)/i, '');
    base = base.replace(/\s*\(Case Conflict\)/i, '');
    base = base.replace(/\.sync-conflict-\d+-\w+/i, '');
    base = base.replace(/\s*\([^)]*conflict[^)]*\)/i, '');
    const baseFullPath = path.join(dir, base.trim());

    if (resolution === 'keep_local') {
      fs.unlinkSync(resolvedPath);
    } else if (resolution === 'keep_conflict' || resolution === 'keep_cloud') {
      const content = fs.readFileSync(resolvedPath);
      fs.writeFileSync(baseFullPath, content);
      fs.unlinkSync(resolvedPath);
    } else if (resolution === 'archive') {
      const archivePath = path.join(dir, `archived_${filename}`);
      fs.renameSync(resolvedPath, archivePath);
    } else {
      throw new Error(`Unknown resolution strategy: ${resolution}`);
    }

    AuditService.logEvent({
      actor,
      action: 'SYNC_CONFLICT_RESOLVED',
      entityType: 'System',
      entityId: filename,
      details: {
        resolution,
        conflictPath: resolvedPath,
        basePath: baseFullPath,
        timestamp: new Date().toISOString()
      }
    });

    const ProjectService = require('./ProjectService');
    ProjectService.scan();

    return {
      success: true,
      message: `Sync conflict resolved via ${resolution}`,
      conflictPath: resolvedPath,
      resolution
    };
  }

  setWorkspaceRoot(newPath, actor = 'Administrator', autoCreate = false) {
    if (!newPath || typeof newPath !== 'string' || !newPath.trim()) {
      throw new Error('A valid workspace path must be provided.');
    }

    const trimmedPath = newPath.trim();
    const targetPath = path.resolve(trimmedPath);

    if (!fs.existsSync(targetPath)) {
      if (!autoCreate) {
        throw new Error(`Path does not exist on the filesystem: ${targetPath}`);
      }
      try {
        fs.mkdirSync(targetPath, { recursive: true });
        console.log(`[VaultPathService] Provisioned new vault directory at: ${targetPath}`);
      } catch (err) {
        throw new Error(`Path does not exist and could not be created at ${targetPath}: ${err.message}`);
      }
    }

    try {
      fs.readdirSync(targetPath);
    } catch (err) {
      throw new Error(`Path is not accessible or permission denied: ${err.message}`);
    }

    // Existing-but-empty (or partial) folders get the canonical layout too.
    this.ensureVaultStructure(targetPath);

    const oldPath = this.workspaceRoot;
    this.workspaceRoot = targetPath;
    config.WORKSPACE_ROOT = targetPath;

    try {
      const ConfigService = require('./ConfigService');
      ConfigService.machine.set('workspaceRoot', targetPath);
    } catch (err) {
      console.warn('[VaultPathService] Failed to write machine config override:', err.message);
    }

    this.migrateVault(targetPath);

    const ProjectService = require('./ProjectService');
    ProjectService.startWatcher();
    ProjectService.scan(true);

    try {
      const SseService = require('./SseService');
      SseService.broadcast('workspace:updated', {
        count: ProjectService.projectsCache.length,
        workspaceRoot: this.workspaceRoot,
        timestamp: new Date().toISOString()
      });
    } catch (e) {}

    try {
      AuditService.logEvent({
        actor,
        action: 'WORKSPACE_MOUNT_CHANGED',
        entityType: 'System',
        entityId: 'StorageMount',
        details: { previous: oldPath, current: targetPath, timestamp: new Date().toISOString() }
      });
    } catch (e) {}

    return {
      success: true,
      workspaceRoot: this.workspaceRoot,
      cachedProjects: ProjectService.projectsCache.length,
      lastScan: ProjectService.lastScanTime
    };
  }
}

module.exports = new VaultPathService();
