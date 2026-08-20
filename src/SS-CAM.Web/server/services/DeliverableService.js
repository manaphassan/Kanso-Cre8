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
            streamUrl: (previewType === 'video' || previewType === 'audio')
              ? `/api/deliverables/stream?id=${Buffer.from(relativePath).toString('base64url')}`
              : null,
            previewUrl: (previewType === 'video' || previewType === 'audio')
              ? `/api/deliverables/stream?id=${Buffer.from(relativePath).toString('base64url')}`
              : (previewType === 'image' || previewType === 'pdf')
                ? `/api/deliverables/preview?id=${Buffer.from(relativePath).toString('base64url')}`
                : null
          });
        }
      } catch (err) {
        console.error(`[DeliverableService] Failed to read ${foundDir}:`, err.message);
      }
    }

    return results;
  }

  /**
   * Streams a media file with HTTP 206 Partial Content support for video scrubbing.
   */
  static streamMedia(filePath, req, res) {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
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
