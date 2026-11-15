/**
 * HANDOVER_SUMMARY.html: a standalone, printable colophon for the client.
 * Port of ExportService.generateHtmlSummary. The file is opened outside the
 * app, so its colours live in its own <style> block (dark on screen, light
 * when printed, since browsers drop backgrounds when printing).
 */

import type { HandoverDoc } from './manifest';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLE = `
    :root {
      --bg-canvas: #09090B;
      --bg-surface: #18181B;
      --bg-surface-hover: #27272A;
      --border-hairline: #27272A;
      --border-strong: #3F3F46;
      --text-strong: #FFFFFF;
      --text-primary: #F4F4F5;
      --text-muted: #71717A;
      --accent-sky: #38BDF8;
      --accent-tint: rgba(56, 189, 248, 0.12);
      --accent-line: rgba(56, 189, 248, 0.3);
      --shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
    }
    @media print {
      :root {
        --bg-canvas: #FFFFFF;
        --bg-surface: #FFFFFF;
        --bg-surface-hover: #FFFFFF;
        --border-hairline: #E2E8F0;
        --border-strong: #E2E8F0;
        --text-strong: #0F172A;
        --text-primary: #0F172A;
        --text-muted: #64748B;
        --accent-sky: #0078D4;
        --accent-tint: transparent;
        --accent-line: #0078D4;
        --shadow: none;
      }
      body { padding: 0; }
      .container { border: none; padding: 0; }
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
      box-shadow: var(--shadow);
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
      background: var(--accent-tint);
      color: var(--accent-sky);
      border: 1px solid var(--accent-line);
      margin-bottom: 10px;
    }
    h1 { font-size: 24px; font-weight: 800; margin: 0 0 6px 0; color: var(--text-strong); letter-spacing: -0.02em; }
    .timestamp { font-size: 12px; color: var(--text-muted); font-family: monospace; }
    .client-badge {
      background: var(--bg-surface-hover);
      border: 1px solid var(--border-strong);
      padding: 6px 14px;
      border-radius: 8px;
      text-align: right;
    }
    .client-badge .code { font-size: 14px; font-weight: 800; color: var(--text-strong); display: block; }
    .client-badge .name { font-size: 11px; color: var(--text-muted); }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 32px; }
    .meta-card { background: var(--bg-canvas); border: 1px solid var(--border-hairline); border-radius: 8px; padding: 12px 14px; }
    .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 700; color: var(--text-strong); }
    .table-section { margin-bottom: 36px; }
    .table-title { font-size: 16px; font-weight: 700; margin: 0 0 14px 0; color: var(--text-strong); }
    .assets-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .assets-table th {
      text-align: left;
      padding: 10px 12px;
      background: var(--bg-canvas);
      border-bottom: 1px solid var(--border-hairline);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .assets-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-hairline); color: var(--text-primary); }
    .assets-table tr:hover td { background: var(--bg-surface-hover); }
    .file-pill { font-weight: 700; font-family: monospace; color: var(--text-strong); word-break: break-all; }
    .format-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      background: var(--bg-surface-hover);
      color: var(--text-muted);
    }
    .hash-code { font-family: monospace; font-size: 11px; color: var(--accent-sky); word-break: break-all; }
    .remittance-card {
      background: var(--bg-canvas);
      border: 1px solid var(--border-hairline);
      border-radius: 8px;
      padding: 18px 20px;
      margin-bottom: 28px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .remit-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
    .remit-val { font-size: 13px; font-weight: 700; color: var(--text-strong); font-family: monospace; }
    .remit-note { font-size: 11px; color: var(--text-muted); }
    .footer { border-top: 1px solid var(--border-hairline); padding-top: 20px; text-align: center; font-size: 12px; color: var(--text-muted); }
  `;

export function generateHtmlSummary(doc: HandoverDoc): string {
  const e = escapeHtml;
  const s = doc.studio;
  const rows = doc.assets
    .map(
      (a) => `
          <tr>
            <td><span class="file-pill">${e(a.relPath)}</span></td>
            <td><span class="format-pill">${e(a.format)}</span></td>
            <td>${e(a.sizeFormatted)}</td>
            <td><span class="hash-code">${e(a.sha256)}</span></td>
          </tr>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Handover Manifest - ${e(doc.title)}</title>
  <style>${STYLE}</style>
</head>
<body>
  <div class="container">
    <div class="header-row">
      <div>
        <span class="badge-zen">Verified Creative Handover</span>
        <h1>${e(doc.title)}</h1>
        <div class="timestamp">Job ID: ${e(doc.jobId)} - Delivered: ${e(doc.date)}</div>
      </div>
      <div class="client-badge">
        <span class="code">${e(doc.clientCode)}</span>
        <span class="name">${e(doc.clientName)}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-label">Lead Designer</div>
        <div class="meta-value">${e(doc.designer)}</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Revision Stage</div>
        <div class="meta-value">Rev ${e(doc.revision)} Final</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Delivered Artifacts</div>
        <div class="meta-value">${doc.assets.length} Assets</div>
      </div>
      <div class="meta-card">
        <div class="meta-label">Handover Size</div>
        <div class="meta-value">${e(doc.totalSizeFormatted)}</div>
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
        <tbody>${rows}
        </tbody>
      </table>
    </div>

    <div class="remittance-card">
      <div>
        <div class="remit-title">Originating Studio</div>
        <div class="remit-val">${e(s.studioName)}</div>
        <div class="remit-note">${e(s.registrationNo)}</div>
      </div>
      <div>
        <div class="remit-title">Bank Remittance</div>
        <div class="remit-val">${e(s.bankName)}</div>
        <div class="remit-val">${e(s.accountNo)}</div>
      </div>
      <div>
        <div class="remit-title">SWIFT / DuitNow Wire</div>
        <div class="remit-val">${e(s.swiftOrDuitNow)}</div>
        <div class="remit-note">${e(s.billingEmail)}</div>
      </div>
    </div>

    <div class="footer">
      Kanso Cre8 - The Mindful Creative Vault Handover Engine
    </div>
  </div>
</body>
</html>`;
}
