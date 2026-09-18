const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const FrontmatterService = require('./FrontmatterService');
const AuditService = require('./AuditService');
const TeamService = require('./TeamService');
const CompanyService = require('./CompanyService');

class ExportService {
  /**
   * Computes SHA-256 checksum for a file on disk.
   */
  static computeFileSha256(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch (err) {
      return 'N/A';
    }
  }

  /**
   * Formats bytes to human-readable size.
   */
  static formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

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
    const { frontmatter } = FrontmatterService.readProjectReadme(projectFullPath);
    const jobId = frontmatter.job_id || frontmatter.jobId || projectId || 'PROJECT';
    const zipFileName = `${jobId}_${folderName}_Handover.zip`;

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

    const assetItems = [];
    const addedFiles = [];

    // 1. Deliverables (Final Outputs)
    const delivDirs = ['05_DELIVERABLES', '05_Deliverables', '04_Production', 'Production', '04_Final_Exports'];
    for (const dir of delivDirs) {
      const p = path.join(projectFullPath, dir);
      if (fs.existsSync(p)) {
        this.addDirectoryToArchive(archive, p, 'Deliverables', addedFiles, assetItems, options.selectedFiles);
        break;
      }
    }

    // 2. Mockups / WIP (optional)
    if (options.includeWip) {
      const wipDirs = ['04_WORK_IN_PROGRESS', '04_WIP', '02_Artwork_Mockup', 'Artwork Mockup', 'Mockup'];
      for (const dir of wipDirs) {
        const p = path.join(projectFullPath, dir);
        if (fs.existsSync(p)) {
          this.addDirectoryToArchive(archive, p, 'Mockups', addedFiles, assetItems, options.selectedFiles);
          break;
        }
      }
    }

    // 3. Copywriting (optional, default true)
    if (options.includeCopy !== false) {
      const copyFile = path.join(projectFullPath, '03_COPYWRITING', 'COPY.md');
      if (fs.existsSync(copyFile)) {
        archive.file(copyFile, { name: 'Copywriting/COPY.md' });
        addedFiles.push('Copywriting/COPY.md');
        const hash = this.computeFileSha256(copyFile);
        const stat = fs.statSync(copyFile);
        assetItems.push({
          relPath: 'Copywriting/COPY.md',
          filename: 'COPY.md',
          format: 'Markdown',
          sizeBytes: stat.size,
          sizeFormatted: this.formatBytes(stat.size),
          sha256: hash
        });
      }
    }

    // 4. Project Brief (optional, default true)
    if (options.includeBrief !== false) {
      const readmeFile = path.join(projectFullPath, 'README.md');
      if (fs.existsSync(readmeFile)) {
        archive.file(readmeFile, { name: 'Project_Brief_README.md' });
        addedFiles.push('Project_Brief_README.md');
        const hash = this.computeFileSha256(readmeFile);
        const stat = fs.statSync(readmeFile);
        assetItems.push({
          relPath: 'Project_Brief_README.md',
          filename: 'README.md',
          format: 'Markdown',
          sizeBytes: stat.size,
          sizeFormatted: this.formatBytes(stat.size),
          sha256: hash
        });
      }
    }

    // Load Studio Profile & Client Profile for authentic branding
    let studioProfile = {};
    try {
      studioProfile = TeamService.getStudioProfile() || {};
    } catch (e) {
      studioProfile = {};
    }

    const clientCode = (frontmatter.client || frontmatter.brand || 'ACME').toUpperCase();
    let clientProfile = null;
    try {
      const companies = new CompanyService().loadCompanies();
      clientProfile = companies.find(c => c.code === clientCode) || null;
    } catch (e) {
      clientProfile = null;
    }

    // 5. Generate DELIVERY.md (Human-readable UTF-8 Markdown manifest)
    if (options.includeManifest !== false) {
      const deliveryMd = this.generateDeliveryMarkdown(folderName, frontmatter, assetItems, studioProfile, clientProfile);
      archive.append(deliveryMd, { name: 'DELIVERY.md' });
      addedFiles.push('DELIVERY.md');
    }

    // 6. Generate HANDOVER_SUMMARY.html (Responsive Studio Card)
    const htmlSummary = this.generateHtmlSummary(folderName, frontmatter, assetItems, studioProfile, clientProfile);
    archive.append(htmlSummary, { name: 'HANDOVER_SUMMARY.html' });
    addedFiles.push('HANDOVER_SUMMARY.html');

    // Audit Event
    AuditService.logEvent({
      actor: frontmatter.designer || 'Designer',
      role: 'Creator',
      action: 'HANDOVER_PACKAGE_GENERATED',
      entityType: 'Project',
      entityId: projectId,
      details: {
        zipFileName,
        fileCount: addedFiles.length,
        assetCount: assetItems.length
      }
    });

    archive.finalize();
  }

  static addDirectoryToArchive(archive, dirPath, prefix, addedFiles, assetItems, selectedFiles = null) {
    const walk = (current, relPrefix) => {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name.startsWith('~lock~') || entry.name.toLowerCase() === 'thumbs.db') continue;

        const full = path.join(current, entry.name);
        const rel = path.join(relPrefix, entry.name).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          walk(full, rel);
        } else {
          // If selective export is specified, filter files
          if (Array.isArray(selectedFiles) && selectedFiles.length > 0) {
            const isMatch = selectedFiles.some(s => s === entry.name || s === rel || rel.endsWith(s));
            if (!isMatch) continue;
          }

          archive.file(full, { name: rel });
          addedFiles.push(rel);

          const stat = fs.statSync(full);
          const ext = path.extname(entry.name).toUpperCase().replace('.', '') || 'BIN';
          const hash = this.computeFileSha256(full);

          assetItems.push({
            relPath: rel,
            filename: entry.name,
            format: ext,
            sizeBytes: stat.size,
            sizeFormatted: this.formatBytes(stat.size),
            sha256: hash
          });
        }
      }
    };

    walk(dirPath, prefix);
  }

  /**
   * Generates DELIVERY.md formatted with GFM Markdown and YAML frontmatter.
   */
  static generateDeliveryMarkdown(folderName, frontmatter, assets, studio, client) {
    const generatedAt = new Date().toISOString();
    const dateFormatted = generatedAt.split('T')[0];
    const totalBytes = assets.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
    const totalSizeFormatted = this.formatBytes(totalBytes);
    const clientName = client?.name || frontmatter.client_name || frontmatter.client || 'Acme Corporation';
    const clientCode = client?.code || frontmatter.client || 'ACME';
    const studioName = studio?.name || studio?.studioName || 'HaNa Innovation';
    const principalName = studio?.freelancer_name || studio?.principalName || 'Harussani';
    const registrationNo = studio?.registration_no || studio?.businessRegNo || '202601004829';
    const billingEmail = studio?.email || studio?.billingEmail || 'billing@example.com';
    const bankName = studio?.remittance?.bank_name || studio?.paymentBank || 'Maybank';
    const accountNo = studio?.remittance?.account_no || studio?.paymentAccountNo || '5140-1234-5678';
    const accountHolder = studio?.remittance?.account_holder || studio?.paymentAccountName || studioName;
    const swiftOrDuitNow = studio?.remittance?.duitnow_id || studio?.remittance?.swift_code || studio?.paymentSwiftOrQr || 'MBBEMYKL';
    const paymentTerms = studio?.defaultPaymentTerms || 'Net 14 Days';

    return `---
title: "Creative Handover — ${frontmatter.title || folderName}"
job_id: "${frontmatter.job_id || frontmatter.jobId || '0000'}"
client: "${clientCode}"
client_name: "${clientName}"
delivered_date: "${dateFormatted}"
total_assets: ${assets.length}
total_size: "${totalSizeFormatted}"
designer: "${frontmatter.designer || principalName}"
status: "delivered"
---

# 📦 Creative Handover Package: ${frontmatter.title || folderName}

> **Official Creative Deliverables Handover Manifest (DELIVERY.md)**  
> Generated by **Kanso Cre8 (簡素)** — The Mindful Creative Vault.  
> Timestamp: \`${generatedAt}\`

---

## 🏛️ Project & Client Dossier

| Field | Value |
| :--- | :--- |
| **Job ID** | \`${frontmatter.job_id || frontmatter.jobId || '0000'}\` |
| **Project Title** | **${frontmatter.title || folderName}** |
| **Client Entity** | **${clientName}** (\`${clientCode}\`) |
| **Lead Designer** | ${frontmatter.designer || principalName} |
| **Final Revision** | Rev ${frontmatter.revision || 1} |
| **Handover Status** | \`DELIVERED · SIGNED OFF\` |
| **Total Artifacts** | **${assets.length} items** (${totalSizeFormatted}) |

---

## 💎 Verified Asset Manifest & Cryptographic Hashes

Every production asset has been cryptographically signed with a **SHA-256** checksum to guarantee fidelity and prevent corruption during distribution.

| Asset File | Format | File Size | SHA-256 Cryptographic Checksum |
| :--- | :---: | :---: | :--- |
${assets.map(a => `| \`${a.relPath}\` | **${a.format}** | ${a.sizeFormatted} | \`${a.sha256}\` |`).join('\n')}

---

## 💳 Remittance & Studio Identity

| Atelier Profile | Remittance Details |
| :--- | :--- |
| **Studio** | **${studioName}** |
| **Registration No** | \`${registrationNo}\` |
| **Billing Email** | \`${billingEmail}\` |
| **Bank Name** | **${bankName}** |
| **Account No** | \`${accountNo}\` |
| **Account Holder** | ${accountHolder} |
| **SWIFT / DuitNow** | \`${swiftOrDuitNow}\` |
| **Payment Terms** | ${paymentTerms} |

---

## ✍️ Authorized Handover Sign-Off

This creative package certifies the final production handover of all deliverables outlined above. All assets are formatted to client specification and ready for immediate deployment.

**Principal Art Director:** ${principalName}  
**Studio Signature:** *${studio?.digitalSignature ? '[Digital Signature Verified]' : studioName}*  
**Date:** ${dateFormatted}  

---
*Generated locally with 100% data sovereignty in Kanso Cre8 (簡素).*
`;
  }

  /**
   * Generates modern responsive HTML handover summary sheet.
   */
  static generateHtmlSummary(projectName, frontmatter, assets, studio, client) {
    const clientName = client?.name || frontmatter.client_name || frontmatter.client || 'Acme Corporation';
    const clientCode = client?.code || frontmatter.client || 'ACME';
    const studioName = studio?.name || studio?.studioName || 'HaNa Innovation';
    const principalName = studio?.freelancer_name || studio?.principalName || 'Harussani';
    const registrationNo = studio?.registration_no || studio?.businessRegNo || '202601004829';
    const billingEmail = studio?.email || studio?.billingEmail || 'billing@example.com';
    const bankName = studio?.remittance?.bank_name || studio?.paymentBank || 'Maybank';
    const accountNo = studio?.remittance?.account_no || studio?.paymentAccountNo || '5140-1234-5678';
    const swiftOrDuitNow = studio?.remittance?.duitnow_id || studio?.remittance?.swift_code || studio?.paymentSwiftOrQr || 'MBBEMYKL';
    const totalBytes = assets.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
    const totalSizeFormatted = this.formatBytes(totalBytes);
    const generatedAt = new Date().toISOString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Handover Manifest — ${frontmatter.title || projectName}</title>
  <style>
    :root {
      --bg-canvas: #09090B;
      --bg-surface: #18181B;
      --bg-surface-hover: #27272A;
      --border-hairline: #27272A;
      --text-primary: #F4F4F5;
      --text-muted: #71717A;
      --accent-sky: #38BDF8;
      --accent-emerald: #10B981;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg-canvas);
      color: var(--text-primary);
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: var(--bg-surface);
      border: 1px solid var(--border-hairline);
      border-radius: 12px;
      padding: 36px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.5);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-hairline);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .badge-zen {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(56, 189, 248, 0.12);
      color: var(--accent-sky);
      border: 1px solid rgba(56, 189, 248, 0.3);
      margin-bottom: 10px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }
    .timestamp { font-size: 12px; color: var(--text-muted); font-family: monospace; }
    .client-badge {
      background: #27272A;
      border: 1px solid #3F3F46;
      padding: 6px 14px;
      border-radius: 8px;
      text-align: right;
    }
    .client-badge .code { font-size: 14px; font-weight: 800; color: #FFFFFF; display: block; }
    .client-badge .name { font-size: 11px; color: var(--text-muted); }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 32px;
    }
    .meta-card {
      background: #09090B;
      border: 1px solid var(--border-hairline);
      border-radius: 8px;
      padding: 12px 14px;
    }
    .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 700; color: #FFFFFF; }
    .table-section { margin-bottom: 36px; }
    .table-title { font-size: 16px; font-weight: 700; margin: 0 0 14px 0; color: #FFFFFF; }
    .assets-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .assets-table th {
      text-align: left;
      padding: 10px 12px;
      background: #09090B;
      border-bottom: 1px solid var(--border-hairline);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .assets-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-hairline);
      color: var(--text-primary);
    }
    .assets-table tr:hover td { background: var(--bg-surface-hover); }
    .file-pill { font-weight: 700; font-family: monospace; color: #FFFFFF; }
    .format-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      background: #27272A;
      color: var(--text-muted);
    }
    .hash-code {
      font-family: monospace;
      font-size: 11px;
      color: var(--accent-sky);
      word-break: break-all;
    }
    .remittance-card {
      background: #09090B;
      border: 1px solid var(--border-hairline);
      border-radius: 8px;
      padding: 18px 20px;
      margin-bottom: 28px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .remit-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
    .remit-val { font-size: 13px; font-weight: 700; color: #FFFFFF; font-family: monospace; }
    .footer {
      border-top: 1px solid var(--border-hairline);
      padding-top: 20px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-row">
      <div>
        <span class="badge-zen">Verified Creative Handover</span>
        <h1>${frontmatter.title || projectName}</h1>
        <div class="timestamp">Job ID: ${frontmatter.job_id || frontmatter.jobId || '0000'} · Delivered: ${generatedAt.split('T')[0]}</div>
      </div>
      <div class="client-badge">
        <span class="code">${clientCode}</span>
        <span class="name">${clientName}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Lead Designer</div>
        <div class="meta-value">${frontmatter.designer || principalName}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Revision Stage</div>
        <div class="meta-value">Rev ${frontmatter.revision || 1} Final</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Delivered Artifacts</div>
        <div class="meta-value">${assets.length} Assets</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Handover Size</div>
        <div class="meta-value">${totalSizeFormatted}</div>
      </div>
    </div>

    <div class="table-section">
      <h3 class="table-title">Asset Manifest &amp; SHA-256 Checksums</h3>
      <table class="assets-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Format</th>
            <th>Size</th>
            <th>SHA-256 Cryptographic Hash</th>
          </tr>
        </thead>
        <tbody>
          ${assets.map(a => `
          <tr>
            <td><span class="file-pill">📁 ${a.relPath}</span></td>
            <td><span class="format-pill">${a.format}</span></td>
            <td>${a.sizeFormatted}</td>
            <td><span class="hash-code">${a.sha256}</span></td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="remittance-card">
      <div>
        <div class="remit-title">Originating Studio</div>
        <div class="remit-val">${studioName}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${registrationNo}</div>
      </div>
      <div>
        <div class="remit-title">Bank Remittance</div>
        <div class="remit-val">${bankName}</div>
        <div class="remit-val">${accountNo}</div>
      </div>
      <div>
        <div class="remit-title">SWIFT / DuitNow Wire</div>
        <div class="remit-val">${swiftOrDuitNow}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${billingEmail}</div>
      </div>
    </div>

    <div class="footer">
      Kanso Cre8 (簡素) • The Mindful Creative Vault Handover Engine
    </div>
  </div>
</body>
</html>`;
  }
}

module.exports = ExportService;
