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
        const canonicalDirs = [
          '_Clients',
          '_Finance/Quotes',
          '_Finance/Invoices',
          `_Projects/${new Date().getFullYear()}`,
          '_Journal/Daily',
          '_Journal/Monthly',
          '_Journal/Yearly',
          '_Notes/01_Fleeting',
          '_Notes/02_Literature',
          '_Notes/03_Permanent'
        ];
        canonicalDirs.forEach(dir => {
          fs.mkdirSync(path.join(targetPath, dir), { recursive: true });
        });
        const scratchpadPath = path.join(targetPath, '_Notes', 'Scratchpad.md');
        if (!fs.existsSync(scratchpadPath)) {
          fs.writeFileSync(scratchpadPath, '# Atelier Scratchpad\n\nTransient capture buffer for clipboard snippets and scratch ideas.\n', 'utf8');
        }
      } catch (err) {
        throw new Error(`Path does not exist and could not be created at ${targetPath}: ${err.message}`);
      }
    }

    try {
      fs.readdirSync(targetPath);
    } catch (err) {
      throw new Error(`Path is not accessible or permission denied: ${err.message}`);
    }

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
