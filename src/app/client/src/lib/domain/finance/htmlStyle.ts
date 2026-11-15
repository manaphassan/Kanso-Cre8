/**
 * Stylesheet of the standalone printable quote/invoice (html.ts). The file is
 * opened outside the app (browser, print to PDF), so it carries its own
 * colours instead of the app's `--kanso-*` tokens. Every colour is declared
 * once in `:root`; `accent` is the client's palette colour (data).
 */

export function documentCss(accent: string): string {
  return `
    :root {
      --client-accent: ${accent};
      --bg-page: #F4F4F5;
      --paper-bg: #FFFFFF;
      --text-main: #18181B;
      --text-muted: #71717A;
      --text-status: #3F3F46;
      --border-color: #E4E4E7;
      --soft-bg: #FAFAFA;
      --btn-hover: #27272A;
      --stamp-paid: #DC2626;
      --stamp-approved: #059669;
      --stamp-draft: #6B7280;
      --stamp-seal: #D97706;
      --swiss-ink: #000000;
      --letter-paper: #FDFBF7;
      --letter-border: #D6D3CD;
      --letter-rule: #8C827A;
      --letter-muted: #52525B;
      --shadow: rgba(0, 0, 0, 0.05);
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-serif: Georgia, Cambria, 'Times New Roman', Times, serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg-page); color: var(--text-main); font-family: var(--font-sans); line-height: 1.5; padding: 40px 20px; -webkit-font-smoothing: antialiased; }
    .doc-container { max-width: 820px; margin: 0 auto; position: relative; }
    .paper-card { background: var(--paper-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 48px; box-shadow: 0 4px 20px var(--shadow); position: relative; overflow: hidden; }

    .tactile-stamp { position: absolute; top: 140px; right: 48px; z-index: 20; pointer-events: none; user-select: none; font-family: var(--font-mono); font-weight: 900; text-transform: uppercase; text-align: center; mix-blend-mode: multiply; opacity: 0.88; }
    .stamp-paid { color: var(--stamp-paid); border: 4px double var(--stamp-paid); padding: 6px 18px; font-size: 26px; letter-spacing: 0.25em; border-radius: 6px; transform: rotate(-12deg); }
    .stamp-approved { color: var(--stamp-approved); border: 4px double var(--stamp-approved); padding: 6px 18px; font-size: 24px; letter-spacing: 0.22em; border-radius: 6px; transform: rotate(-10deg); }
    .stamp-draft { color: var(--stamp-draft); border: 3px dashed var(--stamp-draft); padding: 6px 20px; font-size: 22px; letter-spacing: 0.28em; border-radius: 4px; transform: rotate(-15deg); }
    .stamp-seal { color: var(--stamp-seal); border: 3px solid var(--stamp-seal); border-radius: 50%; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; transform: rotate(8deg); }
    .seal-ring { display: flex; flex-direction: column; align-items: center; font-size: 10px; letter-spacing: 0.1em; line-height: 1.2; }
    .seal-word { font-size: 13px; font-weight: bold; }

    .swatch-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed var(--border-color); font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); }
    .swatch-pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 9999px; border: 1px solid var(--border-color); background: var(--soft-bg); }
    .swatch-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; background: var(--client-accent); }

    .header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-color); padding-bottom: 24px; margin-bottom: 28px; }
    .studio-brand { display: flex; gap: 16px; align-items: flex-start; }
    .studio-logo { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-color); padding: 4px; }
    .studio-title { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
    .studio-tagline { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .studio-contact { font-size: 13px; color: var(--text-muted); margin-top: 6px; line-height: 1.4; }
    .doc-meta-right { text-align: right; }
    .doc-type-label { font-size: 12px; font-family: var(--font-mono); font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--client-accent); }
    .doc-number { font-size: 24px; font-family: var(--font-mono); font-weight: 800; margin-top: 2px; }
    .doc-status { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-family: var(--font-mono); font-weight: 700; text-transform: uppercase; margin-top: 6px; background: var(--bg-page); color: var(--text-status); }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; font-size: 13px; }
    .info-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 4px; }
    .client-name { font-size: 16px; font-weight: 700; }
    .client-contact { color: var(--text-muted); margin-top: 4px; line-height: 1.4; }
    .dates-right { text-align: right; display: flex; flex-direction: column; gap: 8px; }
    .date-val { font-family: var(--font-mono); font-weight: 600; }
    .fiscal-row { display: flex; gap: 8px; margin-top: 6px; font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); }
    .fiscal-chip { padding: 2px 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--soft-bg); }

    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .items-table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--border-color); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .items-table td { padding: 12px; border-bottom: 1px solid var(--border-color); }
    .col-desc { font-weight: 500; }
    .col-qty { text-align: center; font-family: var(--font-mono); width: 80px; }
    .col-rate { text-align: right; font-family: var(--font-mono); width: 120px; }
    .col-amount { text-align: right; font-family: var(--font-mono); font-weight: 700; width: 140px; }

    .totals-box { display: flex; justify-content: flex-end; margin-bottom: 32px; font-size: 14px; }
    .totals-list { width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row .money { font-family: var(--font-mono); font-weight: 600; }
    .total-row.grand { border-top: 2px solid var(--border-color); margin-top: 6px; padding-top: 10px; font-size: 18px; font-weight: 800; color: var(--text-main); }
    .total-row.grand .money { font-weight: 800; }

    .terms-box { background: var(--soft-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; margin-bottom: 32px; font-size: 12px; line-height: 1.6; }
    .terms-title { font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 6px; letter-spacing: 0.05em; }
    .terms-mono { font-family: var(--font-mono); }
    .terms-notes { margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 8px; white-space: pre-line; }

    .footer-row { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 24px; border-top: 1px solid var(--border-color); font-size: 11px; color: var(--text-muted); }
    .sig-block { text-align: right; }
    .sig-label { text-transform: uppercase; font-size: 10px; font-weight: 700; margin-bottom: 4px; }
    .sig-img { height: 44px; object-fit: contain; margin-top: 4px; }
    .sig-text { font-family: var(--font-serif); font-style: italic; font-size: 18px; border-bottom: 1px solid var(--border-color); padding: 4px 16px; margin-top: 4px; }

    @page { size: A4 portrait; margin: 12mm 15mm; }
    @media print {
      body { background: var(--paper-bg); padding: 0; }
      .paper-card { border: none; box-shadow: none; padding: 0; }
      .print-btn { display: none; }
      tr, .terms-box, .footer-row { break-inside: avoid; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }

    .print-toolbar { display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 20px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; background: var(--text-main); color: var(--paper-bg); border: none; }
    .btn:hover { background: var(--btn-hover); }

    .theme-swiss { border-top: 8px solid var(--swiss-ink) !important; border-radius: 0 !important; }
    .theme-swiss .studio-title, .theme-swiss .doc-number, .theme-swiss .client-name { text-transform: uppercase; letter-spacing: -0.02em; }
    .theme-swiss .items-table th { background: var(--swiss-ink); color: var(--paper-bg); }
    .theme-letterpress { background: var(--letter-paper) !important; border-color: var(--letter-border) !important; font-family: var(--font-serif); }
    .theme-letterpress .studio-title, .theme-letterpress .client-name { font-family: var(--font-serif); color: var(--btn-hover); }
    .theme-letterpress .items-table th { border-bottom: 2px solid var(--letter-rule); color: var(--letter-muted); }
  `;
}
