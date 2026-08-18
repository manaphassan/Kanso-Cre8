const fs = require('fs');
const path = require('path');
const config = require('../config');

class DeliverableService {
  /**
   * Retrieves all deliverables and design assets for a project folder.
   * @param {string} projectFullPath 
   */
  static getProjectDeliverables(projectFullPath) {
    if (!fs.existsSync(projectFullPath)) {
      return [];
    }

    const categories = [
      { names: ['05_DELIVERABLES', '05_Deliverables', '04_Production', 'Production', '4_Production', '04. Production', '04_Final_Exports'], label: 'Final Deliverables & Master Exports', isDeliverable: true },
      { names: ['04_WORK_IN_PROGRESS', '04_WIP', '02_Artwork_Mockup', 'Artwork Mockup', '2_Artwork_Mockup', '02. Artwork Mockup', 'Mockup', '02_Mockup'], label: 'Work In Progress & Mockups', isDeliverable: true },
      { names: ['03_COPYWRITING', '03_Copywriting', 'Copywriting'], label: 'Copywriting & Script Documents', isDeliverable: true },
      { names: ['02_SOURCE_FILES', '02_Source_Files', '01_Artwork_Design', 'Artwork Design', '1_Artwork_Design', '01. Artwork Design', '01_Working_Files'], label: 'Source Working Files', isDeliverable: false },
      { names: ['01_BRIEF_ASSETS', '01_Brief_Assets', '03_Assets', 'Assets', '3_Assets', '03. Assets', '02_Source_Assets'], label: 'Brief & Supporting Assets', isDeliverable: false },
      { names: ['Client_Revisions', 'Revisions', '05_Revisions'], label: 'Revision Files', isDeliverable: true }
    ];

    const results = [];

    for (const cat of categories) {
      let foundDir = null;
      let matchedName = cat.names[0];
      for (const n of cat.names) {
        const testDir = path.join(projectFullPath, n);
        if (fs.existsSync(testDir)) {
          foundDir = testDir;
          matchedName = n;
          break;
        }
      }
      if (!foundDir) continue;

      try {
        const files = fs.readdirSync(foundDir, { withFileTypes: true });
        for (const file of files) {
          if (file.isDirectory() || file.name.startsWith('.') || file.name.includes('~lock~') || file.name.toLowerCase() === 'thumbs.db') continue;

          const filePath = path.join(foundDir, file.name);
          const stats = fs.statSync(filePath);
          const ext = path.extname(file.name).toLowerCase();

          // Infer version from filename (e.g., _v2, _V3, _Final)
          let version = 1;
          const vMatch = /_v(\d+)/i.exec(file.name);
          if (vMatch) {
            version = parseInt(vMatch[1], 10);
          } else if (/final/i.test(file.name)) {
            version = 99; // Represents final approved export
          }

          // Classify preview type
          let previewType = 'generic';
          if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) previewType = 'image';
          else if (['.mp4', '.webm', '.mov'].includes(ext)) previewType = 'video';
          else if (['.pdf'].includes(ext)) previewType = 'pdf';
          else if (['.ogg', '.wav', '.mp3', '.m4a'].includes(ext)) previewType = 'audio';
          else if (['.afdesign', '.afphoto', '.af', '.psd', '.ai', '.indd'].includes(ext)) previewType = 'design-source';

          // Safe relative path from workspace root
          const relativePath = path.relative(config.WORKSPACE_ROOT, filePath).replace(/\\/g, '/');

          results.push({
            id: Buffer.from(relativePath).toString('base64url'),
            filename: file.name,
            folder: matchedName,
            folderLabel: cat.label,
            isDeliverable: cat.isDeliverable,
            extension: ext,
            previewType,
            sizeBytes: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            modified: stats.mtime.toISOString(),
            version,
            relativePath,
            downloadUrl: `/api/deliverables/download?id=${Buffer.from(relativePath).toString('base64url')}`,
            previewUrl: previewType === 'image' || previewType === 'video' || previewType === 'pdf'
              ? `/api/deliverables/preview?id=${Buffer.from(relativePath).toString('base64url')}`
              : null
          });
        }
      } catch (err) {
        console.error(`[DeliverableService] Failed to read ${catDir}:`, err.message);
      }
    }

    return results;
  }

  /**
   * Resolves a safe file path from encoded ID, ensuring no path traversal outside workspace.
   */
  static resolveSafePath(encodedId) {
    if (!encodedId) return null;
    try {
      const relativePath = Buffer.from(encodedId, 'base64url').toString('utf8');
      const normalizedPath = path.normalize(path.join(config.WORKSPACE_ROOT, relativePath));

      // Security check: Must start with WORKSPACE_ROOT
      if (!normalizedPath.startsWith(config.WORKSPACE_ROOT)) {
        console.warn(`[DeliverableService] Path traversal attempt blocked: ${normalizedPath}`);
        return null;
      }

      if (!fs.existsSync(normalizedPath)) {
        return null;
      }

      return normalizedPath;
    } catch (e) {
      return null;
    }
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

module.exports = DeliverableService;
