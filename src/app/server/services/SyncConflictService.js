const fs = require('fs');
const path = require('path');
const AuditService = require('./AuditService');

class SyncConflictService {
  /**
   * Derive the base clean filename by removing conflict markers from cloud sync engines.
   * @param {string} filename 
   * @returns {string}
   */
  deriveBaseFilename(filename) {
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
  }

  /**
   * Scan the vault for Dropbox, OneDrive, Google Drive, or Synology conflicted copies.
   * @param {string} root - Vault root path
   * @returns {Array<object>}
   */
  scanSyncConflicts(root) {
    const conflicts = [];
    if (!root || !fs.existsSync(root)) return conflicts;

    const conflictPatterns = [
      /conflicted copy/i,
      /\(Case Conflict\)/i,
      /\.sync-conflict-/i,
      /\.sync-temp-/i,
      /\(conflict\)/i
    ];

    const isConflictFilename = (name) => conflictPatterns.some(p => p.test(name));

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
                const baseName = this.deriveBaseFilename(entry.name);
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
                console.warn('[SyncConflictService] Error analyzing conflict file:', err.message);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[SyncConflictService] Error crawling for conflicts:', err.message);
      }
    };

    crawl(root);
    return conflicts;
  }

  /**
   * Resolve a sync conflict with chosen strategy.
   * @param {string} conflictPath
   * @param {'keep_local'|'keep_conflict'|'keep_cloud'|'archive'} resolution
   * @param {string} actor
   * @param {string} root
   */
  resolveSyncConflict(conflictPath, resolution = 'keep_local', actor = 'Designer', root) {
    if (!conflictPath || !fs.existsSync(conflictPath)) {
      throw new Error(`Conflict file not found on disk: ${conflictPath}`);
    }

    const resolvedPath = path.resolve(conflictPath);
    if (root && !resolvedPath.startsWith(path.resolve(root))) {
      throw new Error('Access denied: target path is outside workspace root.');
    }

    const dir = path.dirname(resolvedPath);
    const filename = path.basename(resolvedPath);
    const baseName = this.deriveBaseFilename(filename);
    const baseFullPath = path.join(dir, baseName);

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

    try {
      const ProjectService = require('./ProjectService');
      ProjectService.scan();
    } catch (_) {}

    return {
      success: true,
      message: `Sync conflict resolved via ${resolution}`,
      conflictPath: resolvedPath,
      resolution
    };
  }
}

module.exports = new SyncConflictService();
