const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const FrontmatterService = require('./FrontmatterService');
const AuditService = require('./AuditService');

class ExportService {
  /**
   * Generates a ZIP stream for an entire creative handover package.
   * @param {string} projectFullPath 
   * @param {string} projectId 
   * @param {object} res Express response stream
   * @param {object} options 
   */
  static streamProjectHandover(projectFullPath, projectId, res, options = {}) {
    if (!fs.existsSync(projectFullPath)) {
      return res.status(404).json({ error: 'Project folder not found.' });
    }

    const folderName = path.basename(projectFullPath);
    const zipFileName = `${folderName}_Handover.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    const archive = typeof archiver === 'function'
      ? archiver('zip', { zlib: { level: 9 } })
      : (archiver.ZipArchive ? new archiver.ZipArchive({ zlib: { level: 9 } }) : new archiver.Archiver('zip', { zlib: { level: 9 } }));

    archive.on('error', (err) => {
      console.error('[ExportService] Archiver error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    archive.pipe(res);

    const { frontmatter } = FrontmatterService.readProjectReadme(projectFullPath);
    const addedFiles = [];

    // 1. Deliverables
    const delivDirs = ['05_DELIVERABLES', '05_Deliverables', '04_Production', 'Production', '04_Final_Exports'];
    for (const dir of delivDirs) {
      const p = path.join(projectFullPath, dir);
      if (fs.existsSync(p)) {
        this.addDirectoryToArchive(archive, p, 'Deliverables', addedFiles);
        break;
      }
    }

    // 2. Mockups (optional)
    if (options.includeWip) {
      const wipDirs = ['04_WORK_IN_PROGRESS', '04_WIP', '02_Artwork_Mockup', 'Artwork Mockup', 'Mockup'];
      for (const dir of wipDirs) {
        const p = path.join(projectFullPath, dir);
        if (fs.existsSync(p)) {
          this.addDirectoryToArchive(archive, p, 'Mockups', addedFiles);
          break;
        }
      }
    }

    // 3. Copywriting
    const copyFile = path.join(projectFullPath, '03_COPYWRITING', 'COPY.md');
    if (fs.existsSync(copyFile)) {
      archive.file(copyFile, { name: 'Copywriting/COPY.md' });
      addedFiles.push('Copywriting/COPY.md');
    }

    // 4. Project Brief
    const readmeFile = path.join(projectFullPath, 'README.md');
    if (fs.existsSync(readmeFile)) {
      archive.file(readmeFile, { name: 'Project_Brief_README.md' });
      addedFiles.push('Project_Brief_README.md');
    }

    // 5. HTML Handover Summary Sheet
    const htmlSummary = this.generateHtmlSummary(folderName, frontmatter, addedFiles);
    archive.append(htmlSummary, { name: 'HANDOVER_SUMMARY.html' });

    archive.finalize();
  }

  static addDirectoryToArchive(archive, dirPath, prefix, addedFiles) {
    const walk = (current, relPrefix) => {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name.startsWith('~lock~') || entry.name.toLowerCase() === 'thumbs.db') continue;

        const full = path.join(current, entry.name);
        const rel = path.join(relPrefix, entry.name).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          walk(full, rel);
        } else {
          archive.file(full, { name: rel });
          addedFiles.push(rel);
        }
      }
    };

    walk(dirPath, prefix);
  }

  static generateHtmlSummary(projectName, frontmatter, files) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SuamiSihat Creative Handover - ${projectName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0F1D; color: #E2E8F0; margin: 0; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #131B2E; border: 1px solid #1E293B; border-radius: 12px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    .header { border-bottom: 1px solid #1E293B; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #043388; color: #FFFFFF; }
    h1 { color: #FFFFFF; font-size: 24px; margin: 12px 0 6px 0; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0; background: #0A0F1D; padding: 16px; border-radius: 8px; border: 1px solid #1E293B; }
    .meta-item span { color: #94A3B8; font-size: 13px; display: block; }
    .meta-item strong { color: #F8FAFC; font-size: 15px; }
    .files-list { list-style: none; padding: 0; margin: 20px 0; }
    .files-list li { padding: 10px 14px; border-bottom: 1px solid #1E293B; font-family: monospace; font-size: 13px; color: #CBD5E1; }
    .files-list li:last-child { border-bottom: none; }
    .footer { text-align: center; color: #64748B; font-size: 12px; margin-top: 32px; border-top: 1px solid #1E293B; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">SuamiSihat Creative Handover</span>
      <h1>${projectName}</h1>
      <p style="color: #94A3B8; margin: 0;">Package Generated: ${new Date().toISOString()}</p>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span>Status</span><strong>${(frontmatter.status || 'UNKNOWN').toUpperCase()}</strong></div>
      <div class="meta-item"><span>Priority</span><strong>${(frontmatter.priority || 'NORMAL').toUpperCase()}</strong></div>
      <div class="meta-item"><span>Designer</span><strong>${frontmatter.designer || 'Unassigned'}</strong></div>
      <div class="meta-item"><span>Revision Round</span><strong>Rev ${frontmatter.revision || 0}</strong></div>
    </div>

    <h3 style="color: #FFFFFF; font-size: 16px; margin-top: 24px;">Included Asset Manifest (${files.length} items)</h3>
    <ul class="files-list">
      ${files.map(f => `<li>📁 ${f}</li>`).join('\n      ')}
    </ul>

    <div class="footer">
      SuamiSihat Creative Assets Management (SS-CAM) • Web Portal Export Service
    </div>
  </div>
</body>
</html>`;
  }
}

module.exports = ExportService;
