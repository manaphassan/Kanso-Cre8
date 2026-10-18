<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  interface CompartmentStat {
    id: string;
    name: string;
    description: string;
    exists: boolean;
    fileCount: number;
    sizeBytes: number;
    formattedSize: string;
  }

  interface VaultHealthReport {
    vaultExists: boolean;
    workspaceRoot: string;
    score: number;
    status: 'pristine' | 'healthy' | 'warning' | 'critical';
    lastScannedAt: string;
    compartments: CompartmentStat[];
    brokenWikiLinks: Array<{ sourceFile: string; sourceTitle: string; linkText: string; target: string; reason: string }>;
    orphanNotes: Array<{ id: string; title: string; relPath: string; category: string }>;
    frontmatterIssues: Array<{ file: string; compartment: string; issue: string; missingKeys: string[] }>;
    syncConflicts: any[];
    storageSummary: { totalFiles: number; totalSizeBytes: number; formattedTotalSize: string };
  }

  let report = $state<VaultHealthReport | null>(null);
  let isScanning = $state(false);
  let isCleaning = $state(false);
  let activeTab = $state<'overview' | 'links' | 'orphans' | 'frontmatter' | 'conflicts'>('overview');

  async function scanVault() {
    isScanning = true;
    try {
      const res = await ApiClient.getVaultHealth();
      if (res && res.success) {
        report = res.report;
        if (report && report.score >= 95) {
          appState.addToast('Vault integrity verified pristine. Zero critical issues.', 'success', 'Vault Healthy');
        } else if (report && report.score >= 80) {
          appState.addToast(`Vault health score: ${report.score}/100 with minor warnings.`, 'info', 'Vault Audited');
        } else {
          appState.addToast(`Vault health score: ${report?.score || 0}/100. Issues detected.`, 'warning', 'Vault Attention');
        }
      }
    } catch (err: any) {
      appState.addToast(`Failed to scan vault health: ${err.message}`, 'error');
    } finally {
      isScanning = false;
    }
  }

  async function handleCleanAllConflicts() {
    isCleaning = true;
    try {
      const res = await ApiClient.cleanVaultSyncConflicts('keep_local');
      if (res && res.success) {
        appState.addToast(`Resolved ${res.resolvedCount} sync conflict file(s).`, 'success', 'Conflicts Cleaned');
        await scanVault();
      }
    } catch (err: any) {
      appState.addToast(`Clean error: ${err.message}`, 'error');
    } finally {
      isCleaning = false;
    }
  }

  onMount(() => {
    scanVault();
  });
</script>

<div class="vault-inspector-card">
  <!-- Header & Score Strip -->
  <div class="inspector-header">
    <div class="header-left">
      <div class="score-badge" class:pristine={report?.status === 'pristine'} class:healthy={report?.status === 'healthy'} class:warning={report?.status === 'warning'} class:critical={report?.status === 'critical'}>
        <span class="score-num">{report ? report.score : '--'}</span>
        <span class="score-max">/100</span>
      </div>
      <div class="title-meta">
        <div class="title-row">
          <h3 class="inspector-title">Vault Health & Link Integrity</h3>
          <span class="status-pill" class:pristine={report?.status === 'pristine'} class:warning={report?.status === 'warning' || report?.status === 'critical'}>
            {report ? report.status.toUpperCase() : 'SCANNING'}
          </span>
        </div>
        <p class="inspector-desc">
          Automated link integrity, orphan notes, and frontmatter verification across plain UTF-8 Markdown storage.
        </p>
      </div>
    </div>

    <button type="button" class="kanso-btn primary compact" onclick={scanVault} disabled={isScanning}>
      <Icon name="history" size={14} />
      <span>{isScanning ? 'Auditing Vault...' : 'Scan Vault'}</span>
    </button>
  </div>

  <!-- Metric Badges Strip -->
  {#if report}
    <div class="metrics-row">
      <button type="button" class="metric-chip" class:active={activeTab === 'overview'} onclick={() => activeTab = 'overview'}>
        <span class="chip-label">Total Files</span>
        <span class="chip-val">{report.storageSummary.totalFiles}</span>
      </button>

      <button type="button" class="metric-chip" class:active={activeTab === 'links'} class:has-issues={(report.brokenWikiLinks.length > 0)} onclick={() => activeTab = 'links'}>
        <span class="chip-label">Broken Links</span>
        <span class="chip-val">{report.brokenWikiLinks.length}</span>
      </button>

      <button type="button" class="metric-chip" class:active={activeTab === 'orphans'} class:has-issues={(report.orphanNotes.length > 0)} onclick={() => activeTab = 'orphans'}>
        <span class="chip-label">Orphan Notes</span>
        <span class="chip-val">{report.orphanNotes.length}</span>
      </button>

      <button type="button" class="metric-chip" class:active={activeTab === 'frontmatter'} class:has-issues={(report.frontmatterIssues.length > 0)} onclick={() => activeTab = 'frontmatter'}>
        <span class="chip-label">Frontmatter</span>
        <span class="chip-val">{report.frontmatterIssues.length}</span>
      </button>

      <button type="button" class="metric-chip" class:active={activeTab === 'conflicts'} class:has-issues={(report.syncConflicts.length > 0)} onclick={() => activeTab = 'conflicts'}>
        <span class="chip-label">Sync Conflicts</span>
        <span class="chip-val">{report.syncConflicts.length}</span>
      </button>
    </div>
  {/if}

  <!-- Tab Panels -->
  {#if report}
    {#if activeTab === 'overview'}
      <!-- 6-Compartment Storage Bento -->
      <div class="bento-grid">
        {#each report.compartments as comp}
          <div class="compartment-card" class:missing={!comp.exists}>
            <div class="comp-head">
              <div class="comp-icon-box">
                <Icon name="folder" size={16} />
              </div>
              <span class="comp-status" class:present={comp.exists}>
                {comp.exists ? 'VERIFIED' : 'MISSING'}
              </span>
            </div>
            <div class="comp-name">{comp.name}</div>
            <div class="comp-desc">{comp.description}</div>
            <div class="comp-footer">
              <span class="comp-files">{comp.fileCount} file{comp.fileCount === 1 ? '' : 's'}</span>
              <span class="comp-size">{comp.formattedSize}</span>
            </div>
          </div>
        {/each}
      </div>

      <div class="vault-footer-banner">
        <div class="banner-stat">
          <span class="stat-muted">Total Storage Footprint:</span>
          <strong class="stat-bold">{report.storageSummary.formattedTotalSize}</strong>
        </div>
        <div class="banner-stat">
          <span class="stat-muted">Last Audit:</span>
          <span class="stat-time">{new Date(report.lastScannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <!-- Leave With Your Data (Data Sovereignty) -->
      <div class="sovereignty-banner">
        <div class="sovereignty-text">
          <div class="sovereignty-header">
            <Icon name="download" size={15} color="var(--kanso-accent)" />
            <span class="sovereignty-title font-mono">Data Sovereignty: Leave With Your Data</span>
          </div>
          <p class="sovereignty-desc">
            Download your complete atelier vault as an unencumbered ZIP archive. All 6 compartments remain 100% human-readable UTF-8 Markdown and JSON files with zero binary database locks.
          </p>
        </div>
        <a 
          href="/api/system/export-vault" 
          download 
          class="export-vault-btn"
          aria-label="Export Full Vault Archive"
        >
          <Icon name="download" size={14} />
          <span>Export Vault Archive (.zip)</span>
        </a>
      </div>

    {:else if activeTab === 'links'}
      <!-- Broken WikiLinks -->
      <div class="tab-pane">
        {#if report.brokenWikiLinks.length === 0}
          <div class="clean-empty-state">
            <span class="clean-icon"><Icon name="checkmark" size={18} /></span>
            <span class="clean-text">All WikiLinks [[...]] resolve to active notes, clients, or projects.</span>
          </div>
        {:else}
          <div class="issues-list">
            {#each report.brokenWikiLinks as link}
              <div class="issue-item">
                <div class="issue-main">
                  <div class="issue-title-row">
                    <span class="link-target-badge">[[{link.target}]]</span>
                    <span class="issue-source">in <strong>{link.sourceTitle}</strong></span>
                  </div>
                  <div class="issue-detail">{link.sourceFile} — {link.reason}</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'orphans'}
      <!-- Orphan Notes -->
      <div class="tab-pane">
        {#if report.orphanNotes.length === 0}
          <div class="clean-empty-state">
            <span class="clean-icon"><Icon name="checkmark" size={18} /></span>
            <span class="clean-text">Zero orphan notes. All atelier notes are linked in the knowledge graph.</span>
          </div>
        {:else}
          <div class="issues-list">
            {#each report.orphanNotes as note}
              <div class="issue-item">
                <div class="issue-main">
                  <div class="issue-title-row">
                    <span class="note-title">{note.title}</span>
                    <span class="category-pill">{note.category}</span>
                  </div>
                  <div class="issue-detail">{note.relPath} — Isolated note with 0 incoming & 0 outgoing links.</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'frontmatter'}
      <!-- Frontmatter Schema Issues -->
      <div class="tab-pane">
        {#if report.frontmatterIssues.length === 0}
          <div class="clean-empty-state">
            <span class="clean-icon"><Icon name="checkmark" size={18} /></span>
            <span class="clean-text">All YAML frontmatter headers adhere to canonical schemas.</span>
          </div>
        {:else}
          <div class="issues-list">
            {#each report.frontmatterIssues as issue}
              <div class="issue-item">
                <div class="issue-main">
                  <div class="issue-title-row">
                    <span class="file-name">{issue.file}</span>
                    <span class="category-pill">{issue.compartment}</span>
                  </div>
                  <div class="issue-detail warning-text">{issue.issue}</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeTab === 'conflicts'}
      <!-- Sync Conflicts -->
      <div class="tab-pane">
        {#if report.syncConflicts.length === 0}
          <div class="clean-empty-state">
            <span class="clean-icon"><Icon name="checkmark" size={18} /></span>
            <span class="clean-text">Zero cloud sync collisions or conflicted copies detected.</span>
          </div>
        {:else}
          <div class="conflicts-action-bar">
            <span class="conflict-alert-text">{report.syncConflicts.length} cloud conflict(s) detected across storage.</span>
            <button type="button" class="kanso-btn danger compact" onclick={handleCleanAllConflicts} disabled={isCleaning}>
              <Icon name="check" size={14} />
              <span>{isCleaning ? 'Cleaning...' : 'Clean All Conflicted Copies'}</span>
            </button>
          </div>
          <div class="issues-list">
            {#each report.syncConflicts as conflict}
              <div class="issue-item">
                <div class="issue-main">
                  <div class="issue-title-row">
                    <span class="file-name">{conflict.filename}</span>
                  </div>
                  <div class="issue-detail">{conflict.relPath}</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .vault-inspector-card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
  .inspector-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .score-badge { width: 56px; height: 56px; border-radius: 8px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
  .score-badge.pristine { border-color: var(--kanso-success); color: var(--kanso-success); }
  .score-badge.healthy { border-color: var(--kanso-accent); color: var(--kanso-accent); }
  .score-badge.warning { border-color: var(--kanso-warning); color: var(--kanso-warning); }
  .score-badge.critical { border-color: var(--kanso-danger); color: var(--kanso-danger); }
  .score-num { font-size: 20px; font-weight: 800; line-height: 1; }
  .score-max { font-size: 10px; color: var(--kanso-text-muted); font-weight: 600; margin-top: 2px; }
  .title-row { display: flex; align-items: center; gap: 10px; }
  .inspector-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .inspector-desc { margin: 4px 0 0 0; font-size: 12.5px; color: var(--kanso-text-muted); }
  .status-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: var(--kanso-canvas); color: var(--kanso-text-muted); border: 1px solid var(--kanso-border); }
  .status-pill.pristine { border-color: var(--kanso-success); color: var(--kanso-success); }
  .status-pill.warning { border-color: var(--kanso-warning); color: var(--kanso-warning); }
  .metrics-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
  .metric-chip { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; text-align: left; cursor: pointer; transition: all 0.15s ease; }
  .metric-chip:hover, .metric-chip.active { border-color: var(--kanso-accent); background: var(--kanso-surface-hover); }
  .metric-chip.has-issues .chip-val { color: var(--kanso-warning); }
  .chip-label { font-size: 11px; color: var(--kanso-text-muted); font-weight: 600; }
  .chip-val { font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .bento-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .compartment-card { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
  .comp-head { display: flex; justify-content: space-between; align-items: center; }
  .comp-icon-box { color: var(--kanso-text-muted); }
  .comp-status { font-size: 9.5px; font-weight: 700; color: var(--kanso-text-muted); }
  .comp-status.present { color: var(--kanso-success); }
  .comp-name { font-size: 13.5px; font-weight: 700; color: var(--kanso-text-primary); }
  .comp-desc { font-size: 11px; color: var(--kanso-text-muted); line-height: 1.3; }
  .comp-footer { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--kanso-border); font-size: 11px; font-weight: 600; color: var(--kanso-text-primary); }
  .vault-footer-banner { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 10px 16px; display: flex; justify-content: space-between; font-size: 12px; }
  .stat-muted { color: var(--kanso-text-muted); margin-right: 6px; }
  .stat-bold { color: var(--kanso-text-primary); }
  .stat-time { color: var(--kanso-text-muted); }
  .clean-empty-state { display: flex; align-items: center; gap: 10px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 16px; color: var(--kanso-text-primary); font-size: 12.5px; }
  .clean-icon { color: var(--kanso-success); }
  .issues-list { display: flex; flex-direction: column; gap: 8px; }
  .issue-item { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
  .issue-title-row { display: flex; align-items: center; gap: 8px; }
  .link-target-badge { background: var(--kanso-surface); border: 1px solid var(--kanso-border); color: var(--kanso-danger); font-family: monospace; font-size: 11.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
  .issue-source { font-size: 12px; color: var(--kanso-text-muted); }
  .issue-detail { font-size: 11.5px; color: var(--kanso-text-muted); margin-top: 4px; }
  .warning-text { color: var(--kanso-warning); }
  .note-title, .file-name { font-size: 13px; font-weight: 600; color: var(--kanso-text-primary); }
  .category-pill { font-size: 10px; color: var(--kanso-text-muted); border: 1px solid var(--kanso-border); padding: 1px 6px; border-radius: 3px; }
  .conflicts-action-bar { display: flex; justify-content: space-between; align-items: center; background: var(--kanso-canvas); border: 1px solid var(--kanso-warning); border-radius: 6px; padding: 12px 16px; margin-bottom: 12px; }
  .conflict-alert-text { font-size: 12.5px; font-weight: 600; color: var(--kanso-warning); }
  .kanso-btn { display: inline-flex; align-items: center; gap: 8px; border-radius: 6px; font-size: 12px; font-weight: 600; padding: 8px 14px; cursor: pointer; border: 1px solid transparent; transition: all 0.15s ease; }
  .kanso-btn.primary { background: var(--kanso-accent); color: var(--kanso-canvas); }
  .kanso-btn.danger { background: var(--kanso-danger); color: var(--kanso-surface); }
  .kanso-btn:hover { opacity: 0.9; }
  .kanso-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .sovereignty-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    margin-top: 12px;
  }
  @media (max-width: 768px) {
    .sovereignty-banner {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  .sovereignty-text { display: flex; flex-direction: column; gap: 4px; }
  .sovereignty-header { display: flex; align-items: center; gap: 8px; }
  .sovereignty-title { font-size: 13px; font-weight: 700; color: var(--kanso-text-primary); }
  .sovereignty-desc { margin: 0; font-size: 11.5px; color: var(--kanso-text-muted); line-height: 1.4; max-width: 580px; }
  .export-vault-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    color: var(--kanso-text-primary);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .export-vault-btn:hover {
    background: var(--kanso-accent);
    color: var(--kanso-canvas);
    border-color: var(--kanso-accent);
  }
</style>
