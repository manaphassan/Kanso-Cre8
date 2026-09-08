<script lang="ts">
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    open?: boolean;
    onClose?: () => void;
  }

  let { open = $bindable(false), onClose }: Props = $props();

  let sourcePath = $state('');
  let migrationMode = $state<'copy' | 'move'>('copy');
  let isLoadingPreview = $state(false);
  let isExecuting = $state(false);
  let errorMessage = $state<string | null>(null);
  let previewData = $state<any | null>(null);
  let executionResult = $state<any | null>(null);

  function resetState() {
    sourcePath = '';
    previewData = null;
    executionResult = null;
    errorMessage = null;
    isLoadingPreview = false;
    isExecuting = false;
  }

  function handleClose() {
    open = false;
    resetState();
    onClose?.();
  }

  async function runPreview() {
    if (!sourcePath.trim()) {
      errorMessage = 'Please provide an absolute path to the external Obsidian vault or Notion export folder.';
      return;
    }

    errorMessage = null;
    isLoadingPreview = true;
    previewData = null;
    executionResult = null;

    try {
      const res = await ApiClient.previewMigration(sourcePath.trim());
      if (res.success && res.preview) {
        previewData = res.preview;
      } else {
        errorMessage = 'Failed to analyze source vault directory.';
      }
    } catch (err: any) {
      errorMessage = err.message || 'Could not access or scan source vault directory.';
    } finally {
      isLoadingPreview = false;
    }
  }

  async function executeMigration() {
    if (!previewData || !sourcePath.trim()) return;

    errorMessage = null;
    isExecuting = true;

    try {
      const res = await ApiClient.executeMigration({
        sourceDir: sourcePath.trim(),
        mode: migrationMode
      });

      if (res.success && res.result) {
        executionResult = res.result;
        appState.showToast(`Successfully ingested ${res.result.migratedCount} files into Kanso vault!`, 'success');
      } else {
        errorMessage = 'Migration execution encountered an error.';
      }
    } catch (err: any) {
      errorMessage = err.message || 'Error occurred during vault file ingestion.';
    } finally {
      isExecuting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="migration-modal-overlay" onclick={handleClose} role="presentation">
    <div class="migration-modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      
      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="vault-icon-badge">📦</div>
          <div>
            <h2 class="modal-title">Obsidian & Notion Vault Migration Wizard</h2>
            <p class="modal-subtitle">Auto-ingest external markdown vaults into Kanso's canonical 8-folder architecture</p>
          </div>
        </div>
        <button class="close-btn" onclick={handleClose} aria-label="Close modal">✕</button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        {#if errorMessage}
          <div class="error-alert">
            <span class="error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        {/if}

        {#if !executionResult}
          <!-- Input Form -->
          <div class="input-section">
            <label class="input-label" for="source-vault-input">Source Vault Directory Path</label>
            <div class="path-input-row">
              <input
                id="source-vault-input"
                type="text"
                class="kanso-input"
                placeholder="e.g. C:\Users\Username\Documents\ObsidianVault or D:\NotionExport"
                bind:value={sourcePath}
                disabled={isLoadingPreview || isExecuting}
              />
              <FluentButton 
                variant="accent" 
                onclick={runPreview} 
                disabled={isLoadingPreview || isExecuting || !sourcePath.trim()}
              >
                {isLoadingPreview ? 'Scanning...' : 'Analyze Vault'}
              </FluentButton>
            </div>
            <p class="input-hint">
              Kanso Cre8 will inspect notes, attachments, and frontmatter, mapping them into Fleeting, Literature, Permanent, and Client vaults.
            </p>
          </div>

          <!-- Preview Breakdown -->
          {#if previewData}
            <div class="preview-section">
              <div class="preview-header">
                <span class="preview-title">Vault Composition Analysis</span>
                <span class="total-badge">{previewData.totalFiles} items found</span>
              </div>

              <div class="category-grid">
                <div class="cat-card">
                  <div class="cat-icon">🧠</div>
                  <div class="cat-info">
                    <span class="cat-count">{previewData.counts.fleeting}</span>
                    <span class="cat-name">Fleeting Notes</span>
                    <span class="cat-target">_Zettelkasten/01_Fleeting/</span>
                  </div>
                </div>

                <div class="cat-card">
                  <div class="cat-icon">📚</div>
                  <div class="cat-info">
                    <span class="cat-count">{previewData.counts.literature}</span>
                    <span class="cat-name">Literature Notes</span>
                    <span class="cat-target">_Zettelkasten/02_Literature/</span>
                  </div>
                </div>

                <div class="cat-card">
                  <div class="cat-icon">💎</div>
                  <div class="cat-info">
                    <span class="cat-count">{previewData.counts.permanent}</span>
                    <span class="cat-name">Permanent Notes</span>
                    <span class="cat-target">_Zettelkasten/03_Permanent/</span>
                  </div>
                </div>

                <div class="cat-card">
                  <div class="cat-icon">🏢</div>
                  <div class="cat-info">
                    <span class="cat-count">{previewData.counts.clients}</span>
                    <span class="cat-name">Client Dossiers</span>
                    <span class="cat-target">_Clients/</span>
                  </div>
                </div>

                <div class="cat-card">
                  <div class="cat-icon">🧾</div>
                  <div class="cat-info">
                    <span class="cat-count">{previewData.counts.finance}</span>
                    <span class="cat-name">Finance & Invoices</span>
                    <span class="cat-target">_Finance/</span>
                  </div>
                </div>

                <div class="cat-card">
                  <div class="cat-icon">📁</div>
                  <div class="cat-info">
                    <span class="cat-count">{previewData.counts.projects}</span>
                    <span class="cat-name">Project Vaults</span>
                    <span class="cat-target">2026/</span>
                  </div>
                </div>
              </div>

              <!-- Options -->
              <div class="options-bar">
                <div class="option-group">
                  <span class="option-label">Ingestion Strategy:</span>
                  <label class="radio-label">
                    <input type="radio" name="mig-mode" value="copy" bind:group={migrationMode} />
                    <span>Safe Copy (Non-destructive, leaves original intact)</span>
                  </label>
                  <label class="radio-label">
                    <input type="radio" name="mig-mode" value="move" bind:group={migrationMode} />
                    <span>Move (Clean import)</span>
                  </label>
                </div>
              </div>
            </div>
          {/if}

        {:else}
          <!-- Execution Completed Screen -->
          <div class="success-screen">
            <div class="success-badge">✅</div>
            <h3 class="success-title">Vault Migration Complete!</h3>
            <p class="success-sub">
              Successfully sorted and ingested <strong>{executionResult.migratedCount}</strong> files into your canonical Kanso Cre8 vault.
            </p>

            <div class="report-box">
              <span class="report-icon">📄</span>
              <div class="report-details">
                <span class="report-label">Migration Audit Report Generated:</span>
                <code class="report-path">{executionResult.reportPath}</code>
              </div>
            </div>

            <div class="success-actions">
              <FluentButton variant="accent" onclick={handleClose}>
                Open Vault & Start Working
              </FluentButton>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      {#if !executionResult}
        <div class="modal-footer">
          <FluentButton variant="subtle" onclick={handleClose}>Cancel</FluentButton>
          {#if previewData}
            <FluentButton 
              variant="accent" 
              onclick={executeMigration} 
              disabled={isExecuting || previewData.totalFiles === 0}
            >
              {isExecuting ? 'Ingesting Vault...' : `Ingest ${previewData.totalFiles} Files into Kanso Vault`}
            </FluentButton>
          {/if}
        </div>
      {/if}

    </div>
  </div>
{/if}

<style>
  .migration-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(9, 9, 11, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 24px;
  }

  .migration-modal-card {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    width: 100%;
    max-width: 760px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--kanso-border, #27272A);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .vault-icon-badge {
    font-size: 24px;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: var(--kanso-surface-hover, #27272A);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }

  .modal-subtitle {
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
    margin: 2px 0 0 0;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    font-size: 18px;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    color: var(--kanso-text-primary, #F4F4F5);
    background: var(--kanso-surface-hover, #27272A);
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .error-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--kanso-danger, #EF4444);
    border-radius: 8px;
    color: var(--kanso-danger, #EF4444);
    font-size: 13px;
  }

  .input-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
    margin-bottom: 8px;
  }

  .path-input-row {
    display: flex;
    gap: 12px;
  }

  .kanso-input {
    flex: 1;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 13px;
    color: var(--kanso-text-primary, #F4F4F5);
    outline: none;
    font-family: inherit;
  }

  .kanso-input:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }

  .input-hint {
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
    margin-top: 6px;
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 16px;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .preview-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .total-badge {
    background: var(--kanso-surface-hover, #27272A);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-accent, #38BDF8);
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .cat-card {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cat-icon {
    font-size: 18px;
  }

  .cat-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .cat-count {
    font-size: 15px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    line-height: 1.1;
  }

  .cat-name {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
    font-weight: 500;
  }

  .cat-target {
    font-size: 10px;
    color: var(--kanso-accent, #38BDF8);
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .options-bar {
    border-top: 1px solid var(--kanso-border, #27272A);
    padding-top: 12px;
  }

  .option-group {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
  }

  .option-label {
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
  }

  .radio-label:hover {
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .success-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px 0;
  }

  .success-badge {
    font-size: 36px;
    margin-bottom: 12px;
  }

  .success-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0 0 6px 0;
  }

  .success-sub {
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    max-width: 480px;
    margin: 0 0 20px 0;
  }

  .report-box {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 12px 18px;
    margin-bottom: 24px;
    text-align: left;
  }

  .report-icon {
    font-size: 20px;
  }

  .report-label {
    display: block;
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
  }

  .report-path {
    font-size: 12px;
    color: var(--kanso-accent, #38BDF8);
    font-family: monospace;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--kanso-border, #27272A);
    background: var(--kanso-surface, #18181B);
  }
</style>
