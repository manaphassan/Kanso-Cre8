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

    // Only scan folders dedicated to output deliverables, production exports, and visual mockups
    const categories = [
      { names: ['05_DELIVERABLES', '05_Deliverables', 'Deliverables', '05. Deliverables', '5_Deliverables', '05_Final_Exports', 'Final_Exports'], label: 'Final Deliverables & Master Exports', isDeliverable: true },
      { names: ['04_Production', 'Production', '4_Production', '04. Production', '04_Final_Exports', 'Export', 'Exports', 'Final_Exports', '04_Exports', '04_Final'], label: 'Production & Master Exports', isDeliverable: true },
      { names: ['04_WORK_IN_PROGRESS', '04_WIP', '04. Work In Progress', '02_Artwork_Mockup', 'Artwork Mockup', '2_Artwork_Mockup', '02. Artwork Mockup', 'Mockup', '02_Mockup', '04_Mockup', 'WIP'], label: 'Work In Progress & Visual Mockups', isDeliverable: true },
      { names: ['Client_Revisions', 'Revisions', '05_Revisions', '04_Revisions'], label: 'Revision Files', isDeliverable: true }
    ];

    // Supported deliverable media formats
    const mediaExtensions = [
      '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tiff',
      '.mp4', '.webm', '.mov', '.mkv', '.avi',
      '.pdf',
      '.mp3', '.wav', '.ogg', '.m4a'
    ];

    const results = [];
    const WorkspaceService = require('./WorkspaceService');
    const rootPath = (WorkspaceService && WorkspaceService.workspaceRoot) || config.WORKSPACE_ROOT;

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
          if (file.isDirectory() || file.name.startsWith('.') || file.name.startsWith('~') || file.name.toLowerCase() === 'thumbs.db') continue;

          const ext = path.extname(file.name).toLowerCase();
          if (!mediaExtensions.includes(ext)) continue;

          const filePath = path.join(foundDir, file.name);
          const stats = fs.statSync(filePath);

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
          if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tiff'].includes(ext)) previewType = 'image';
          else if (['.mp4', '.webm', '.mov', '.mkv', '.avi'].includes(ext)) previewType = 'video';
          else if (['.pdf'].includes(ext)) previewType = 'pdf';
          else if (['.ogg', '.wav', '.mp3', '.m4a'].includes(ext)) previewType = 'audio';

          let format = ext.replace('.', '').toUpperCase();
          if (['.jpg', '.jpeg'].includes(ext)) format = 'JPEG';
          else if (ext === '.png') format = 'PNG';
          else if (ext === '.webp') format = 'WEBP';
          else if (ext === '.svg') format = 'SVG';
          else if (ext === '.mp4') format = 'MP4';
          else if (ext === '.pdf') format = 'PDF';

          // Safe relative path from workspace root
          const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/');
          const encodedId = Buffer.from(relativePath).toString('base64url');

          // Classify media class and aspect ratio hints for DAM filtering
          let mediaClass = 'raster_image';
          if (['.mp4', '.webm', '.mov', '.mkv', '.avi'].includes(ext)) mediaClass = 'video_master';
          else if (['.pdf'].includes(ext)) mediaClass = 'print_pdf';
          else if (['.svg', '.ai', '.eps'].includes(ext)) mediaClass = 'vector_graphics';
          else if (['.ogg', '.wav', '.mp3', '.m4a'].includes(ext)) mediaClass = 'audio_track';

          // Aspect ratio estimate from filename hints
          let aspectRatioEstimate = 'standard';
          const lowerName = file.name.toLowerCase();
          if (/1x1|square|feed|box/i.test(lowerName)) aspectRatioEstimate = '1:1';
          else if (/9x16|story|reel|tiktok|vertical|status/i.test(lowerName)) aspectRatioEstimate = '9:16';
          else if (/16x9|landscape|youtube|display|banner|wide/i.test(lowerName)) aspectRatioEstimate = '16:9';
          else if (/4x5|portrait/i.test(lowerName)) aspectRatioEstimate = '4:5';

          // File size tier
          let sizeTier = 'small';
          if (stats.size > 100 * 1024 * 1024) sizeTier = 'master';
          else if (stats.size > 25 * 1024 * 1024) sizeTier = 'large';
          else if (stats.size > 2 * 1024 * 1024) sizeTier = 'medium';

          results.push({
            id: encodedId,
            filename: file.name,
            folder: matchedName,
            folderLabel: cat.label,
            isDeliverable: cat.isDeliverable,
            extension: ext,
            ext: ext.replace('.', ''),
            format,
            previewType,
            mediaClass,
            aspectRatioEstimate,
            sizeTier,
            isImage: previewType === 'image',
            isVideo: previewType === 'video',
            isPdf: previewType === 'pdf',
            isAudio: previewType === 'audio',
            sizeBytes: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            modified: stats.mtime.toISOString(),
            version,
            relativePath,
            downloadUrl: `/api/deliverables/download?id=${encodedId}`,
            streamUrl: (previewType === 'video' || previewType === 'audio')
              ? `/api/deliverables/stream?id=${encodedId}`
              : null,
            previewUrl: (previewType === 'video' || previewType === 'audio')
              ? `/api/deliverables/stream?id=${encodedId}`
              : (previewType === 'image' || previewType === 'pdf')
                ? `/api/deliverables/preview?id=${encodedId}`
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
      const WorkspaceService = require('./WorkspaceService');
      const root = (WorkspaceService && WorkspaceService.workspaceRoot) || config.WORKSPACE_ROOT;
      const normalizedPath = path.normalize(path.join(root, relativePath));

      // Security check: Must start with active root or WORKSPACE_ROOT
      if (!normalizedPath.startsWith(root) && !normalizedPath.startsWith(config.WORKSPACE_ROOT)) {
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
