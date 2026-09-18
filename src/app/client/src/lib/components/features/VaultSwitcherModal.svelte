<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';

  interface Props {
    open: boolean;
    currentPath?: string;
    onclose: () => void;
    onSwitched?: (newPath: string) => void;
  }

  let {
    open = $bindable(false),
    currentPath = '',
    onclose,
    onSwitched
  }: Props = $props();

  interface Candidate {
    path: string;
    accessible?: boolean;
    exists?: boolean;
    itemCount?: number;
    isCurrent: boolean;
  }

  let candidates = $state<Candidate[]>([]);
  let customPath = $state('');
  let autoCreate = $state(true);
  let isLoading = $state(false);
  let isSwitching = $state(false);
  let errorMsg = $state('');

  $effect(() => {
    if (open) {
      loadCandidates();
      errorMsg = '';
      customPath = '';
    }
  });

  async function loadCandidates() {
    isLoading = true;
    try {
      const res = await ApiClient.getWorkspaceCandidates();
      if (res.success && res.candidates) {
        candidates = res.candidates;
      }
    } catch (e: any) {
      console.error('Failed to load workspace candidates', e);
    } finally {
      isLoading = false;
    }
  }

  async function handleSwitch(targetPath: string) {
    if (!targetPath || !targetPath.trim()) {
      errorMsg = 'Please provide a valid folder path.';
      return;
    }

    isSwitching = true;
    errorMsg = '';
    try {
      const res = await ApiClient.updateWorkspaceRoot(targetPath.trim(), autoCreate);
      if (res.success) {
        appState.addToast(`Active vault mounted to: ${res.workspaceRoot || targetPath}`, 'success', 'Vault Switched');
        if (onSwitched) onSwitched(res.workspaceRoot || targetPath);
        onclose();
        setTimeout(() => {
          window.location.reload();
        }, 300);
      } else {
        errorMsg = (res as any).error || 'Failed to switch vault.';
      }
    } catch (e: any) {
      errorMsg = e.message || 'Error switching vault.';
    } finally {
      isSwitching = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="vault-modal-overlay" onclick={onclose} role="presentation">
    <!-- Modal Card -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="vault-modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="badge-row">
            <span class="badge-zen">KANSO VAULT SWITCHER</span>
            <span class="hotkey-hint">Ctrl+O</span>
          </div>
          <h3 class="modal-title">Switch Creative Vault</h3>
          <p class="modal-sub">Mount local directory or external sync folder with zero binary database locks</p>
        </div>
        <button class="close-btn" onclick={onclose} title="Close (Esc)">✕</button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        {#if errorMsg}
          <div class="error-banner">
            <span>⚠️ {errorMsg}</span>
          </div>
        {/if}

        <!-- Candidate list -->
        <div class="section-title">Discovered Vault Locations</div>
        {#if isLoading}
          <div class="loading-state">Scanning local storage &amp; cloud folders...</div>
        {:else if candidates.length === 0}
          <div class="empty-state">No default vault candidates discovered.</div>
        {:else}
          <div class="candidate-list">
            {#each candidates as cand}
              <div
                class="candidate-row"
                class:is-active={cand.isCurrent}
                class:is-unavail={!cand.accessible}
              >
                <div class="cand-icon">
                  {#if cand.isCurrent}
                    <span class="active-dot"></span>
                  {:else}
                    📁
                  {/if}
                </div>

                <div class="cand-details">
                  <div class="cand-path-row">
                    <span class="cand-path" title={cand.path}>{cand.path}</span>
                    {#if cand.isCurrent}
                      <span class="active-pill">ACTIVE VAULT</span>
                    {:else if cand.accessible}
                      <span class="ready-pill">{cand.itemCount || 0} items</span>
                    {:else}
                      <span class="unavail-pill">UNAVAILABLE</span>
                    {/if}
                  </div>
                </div>

                <div class="cand-action">
                  {#if cand.isCurrent}
                    <button class="btn-sm btn-disabled" disabled>Mounted</button>
                  {:else}
                    <button
                      class="btn-sm btn-mount"
                      disabled={isSwitching || !cand.accessible}
                      onclick={() => handleSwitch(cand.path)}
                    >
                      Mount
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Custom Path Input -->
        <div class="section-title custom-title">Mount Custom Local Directory</div>
        <div class="custom-path-box">
          <div class="input-row">
            <input
              type="text"
              class="custom-input"
              placeholder="e.g. D:\CreativeVault or C:\Users\name\Dropbox\DesignVault"
              bind:value={customPath}
              onkeydown={(e) => { if (e.key === 'Enter') handleSwitch(customPath); }}
            />
            <button
              class="btn-mount-custom"
              disabled={isSwitching || !customPath.trim()}
              onclick={() => handleSwitch(customPath)}
            >
              {isSwitching ? 'Mounting...' : 'Switch Vault'}
            </button>
          </div>

          <label class="auto-create-toggle" for="vault-auto-create-cb">
            <input type="checkbox" id="vault-auto-create-cb" bind:checked={autoCreate} />
            <span>Auto-scaffold canonical 5-folder structure (<code>_Clients</code>, <code>_Projects</code>, <code>_Journal</code>, <code>_Notes</code>, <code>_Finance</code>) if directory is empty</span>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <div class="footer-note">
          <span>💡 100% human-readable Markdown. Works seamlessly with Dropbox, Google Drive &amp; OneDrive.</span>
        </div>
        <button class="btn-cancel" onclick={onclose}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .vault-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(9, 9, 11, 0.75);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 16px;
    animation: fadeIn 150ms ease-out;
  }

  .vault-modal-card {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    width: 100%;
    max-width: 620px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--kanso-border, #27272A);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    background: var(--kanso-canvas, #09090B);
  }

  .badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .badge-zen {
    font-family: ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--kanso-accent, #38BDF8);
    letter-spacing: 0.05em;
  }

  .hotkey-hint {
    font-family: ui-monospace, monospace;
    font-size: 10px;
    background: var(--kanso-surface-hover, #27272A);
    color: var(--kanso-text-muted, #71717A);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--kanso-border, #27272A);
  }

  .modal-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0 0 2px 0;
  }

  .modal-sub {
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    font-size: 16px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: color 120ms;
  }

  .close-btn:hover {
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .modal-body {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 480px;
    overflow-y: auto;
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #F87171;
    font-size: 12px;
    padding: 8px 12px;
    border-radius: 6px;
  }

  .section-title {
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted, #71717A);
  }

  .custom-title {
    margin-top: 8px;
  }

  .candidate-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .candidate-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    transition: all 120ms ease;
  }

  .candidate-row.is-active {
    border-color: var(--kanso-accent, #38BDF8);
    background: rgba(56, 189, 248, 0.04);
  }

  .candidate-row.is-unavail {
    opacity: 0.6;
  }

  .cand-icon {
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
  }

  .active-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--kanso-accent, #38BDF8);
    box-shadow: 0 0 8px var(--kanso-accent, #38BDF8);
  }

  .cand-details {
    flex: 1;
    min-width: 0;
  }

  .cand-path-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cand-path {
    font-size: 12.5px;
    font-family: ui-monospace, monospace;
    color: var(--kanso-text-primary, #F4F4F5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .active-pill {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(56, 189, 248, 0.15);
    color: var(--kanso-accent, #38BDF8);
    white-space: nowrap;
  }

  .ready-pill {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--kanso-surface-hover, #27272A);
    color: var(--kanso-text-muted, #71717A);
    white-space: nowrap;
  }

  .unavail-pill {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(239, 68, 68, 0.1);
    color: #F87171;
    white-space: nowrap;
  }

  .btn-sm {
    font-size: 11.5px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all 120ms;
  }

  .btn-mount {
    background: var(--kanso-surface-hover, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    border: 1px solid var(--kanso-border, #27272A);
  }

  .btn-mount:hover:not(:disabled) {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
  }

  .btn-disabled {
    background: transparent;
    color: var(--kanso-text-muted, #71717A);
    border: 1px solid transparent;
    cursor: default;
  }

  .custom-path-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    padding: 12px;
    border-radius: 8px;
  }

  .input-row {
    display: flex;
    gap: 8px;
  }

  .custom-input {
    flex: 1;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12.5px;
    font-family: ui-monospace, monospace;
    color: var(--kanso-text-primary, #F4F4F5);
    outline: none;
  }

  .custom-input:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }

  .btn-mount-custom {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    font-size: 12px;
    font-weight: 700;
    padding: 8px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 120ms;
  }

  .btn-mount-custom:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-mount-custom:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auto-create-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
  }

  .auto-create-toggle code {
    font-family: ui-monospace, monospace;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .modal-footer {
    padding: 12px 20px;
    border-top: 1px solid var(--kanso-border, #27272A);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--kanso-canvas, #09090B);
  }

  .footer-note {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
  }

  .btn-cancel {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
  }

  .loading-state, .empty-state {
    font-size: 12.5px;
    color: var(--kanso-text-muted, #71717A);
    padding: 16px;
    text-align: center;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
