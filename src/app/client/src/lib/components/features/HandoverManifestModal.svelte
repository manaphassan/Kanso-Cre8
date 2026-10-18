<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { handleBackdropClick, handleModalKeydown } from '$lib/utils';

  interface Props {
    open?: boolean;
    preview: any;
    onClose: () => void;
    onDownload?: () => void;
  }

  let { open = false, preview, onClose, onDownload }: Props = $props();

  type TabType = 'manifest' | 'summary' | 'hashes';
  let activeTab = $state<TabType>('manifest');
  let copiedHash = $state<string | null>(null);
  let copiedManifest = $state<boolean>(false);

  function handleKeydown(e: KeyboardEvent) {
    handleModalKeydown(e, onClose, open);
  }

  async function copyDeliveryManifest() {
    if (!preview?.deliveryMd) return;
    try {
      await navigator.clipboard.writeText(preview.deliveryMd);
      copiedManifest = true;
      appState.addToast('DELIVERY.md copied to clipboard', 'success', 'Manifest Copied');
      setTimeout(() => { copiedManifest = false; }, 2500);
    } catch (err) {
      console.warn('Failed to copy manifest:', err);
    }
  }

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      copiedHash = hash;
      appState.addToast(`SHA-256 hash copied: ${hash.slice(0, 12)}...`, 'info', 'Checksum Copied');
      setTimeout(() => { copiedHash = null; }, 2500);
    } catch (err) {
      console.warn('Failed to copy hash:', err);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && preview}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="manifest-backdrop" onclick={(e) => handleBackdropClick(e, onClose)} role="dialog" aria-modal="true" aria-label="DELIVERY.md Handover Manifest Preview" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="manifest-modal" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <div class="manifest-header">
        <div class="header-left">
          <div class="icon-chip">
            <Icon name="document" size={18} color="var(--kanso-accent)" />
          </div>
          <div>
            <div class="header-pills">
              <span class="pill pill-job font-mono">{preview.jobId}</span>
              <span class="pill pill-brand font-mono">{preview.clientCode}</span>
              <span class="pill pill-tag">DELIVERY.md MANIFEST</span>
            </div>
            <h2 class="manifest-title">Handover Manifest &amp; Cryptographic Proof</h2>
          </div>
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close manifest preview">
          <Icon name="close" size={16} />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-bar">
        <div class="tabs-group">
          <button 
            type="button" 
            class="tab-btn" 
            class:active={activeTab === 'manifest'}
            onclick={() => activeTab = 'manifest'}
          >
            <Icon name="document" size={14} />
            <span>DELIVERY.md</span>
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            class:active={activeTab === 'summary'}
            onclick={() => activeTab = 'summary'}
          >
            <Icon name="globe" size={14} />
            <span>HTML Colophon</span>
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            class:active={activeTab === 'hashes'}
            onclick={() => activeTab = 'hashes'}
          >
            <Icon name="checkCircle" size={14} />
            <span>SHA-256 Hashes ({preview.assets?.length || 0})</span>
          </button>
        </div>
        <div class="tabs-actions">
          {#if activeTab === 'manifest'}
            <Button appearance="ghost" size="sm" onclick={copyDeliveryManifest}>
              <Icon name={copiedManifest ? 'checkCircle' : 'copy'} size={13} />
              <span>{copiedManifest ? 'Copied' : 'Copy Manifest'}</span>
            </Button>
          {/if}
        </div>
      </div>

      <!-- Body Content -->
      <div class="manifest-body">
        {#if activeTab === 'manifest'}
          <pre class="manifest-pre font-mono">{preview.deliveryMd || 'Manifest content empty.'}</pre>
        {:else if activeTab === 'summary'}
          <div class="summary-preview-frame">
            <iframe
              srcdoc={preview.htmlSummary || '<p>No preview generated.</p>'}
              title="Handover Summary HTML Preview"
              sandbox="allow-same-origin"
              class="summary-iframe"
            ></iframe>
          </div>
        {:else if activeTab === 'hashes'}
          <div class="hashes-table-wrapper">
            <table class="hashes-table">
              <thead>
                <tr>
                  <th>Asset File</th>
                  <th>Format</th>
                  <th>Size</th>
                  <th>SHA-256 Cryptographic Hash</th>
                  <th>Copy</th>
                </tr>
              </thead>
              <tbody>
                {#each (preview.assets || []) as asset}
                  <tr>
                    <td>
                      <span class="file-path font-mono">{asset.relPath}</span>
                    </td>
                    <td><span class="format-badge font-mono">{asset.format}</span></td>
                    <td class="font-mono text-muted">{asset.sizeFormatted}</td>
                    <td>
                      <code class="hash-code font-mono">{asset.sha256}</code>
                    </td>
                    <td>
                      <button 
                        type="button" 
                        class="hash-copy-btn" 
                        onclick={() => copyHash(asset.sha256)}
                        title="Copy SHA-256 checksum"
                        aria-label="Copy checksum for {asset.filename}"
                      >
                        <Icon name={copiedHash === asset.sha256 ? 'checkCircle' : 'copy'} size={13} color={copiedHash === asset.sha256 ? 'var(--kanso-success)' : 'currentColor'} />
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="manifest-footer">
        <div class="footer-stats font-mono">
          <span>{preview.totalAssets} files</span>
          <span class="sep">·</span>
          <span>{preview.totalSizeFormatted}</span>
          <span class="sep">·</span>
          <span class="text-accent">SHA-256 Verified</span>
        </div>
        <div class="footer-actions">
          <Button appearance="subtle" onclick={onClose}>Close</Button>
          {#if onDownload}
            <Button appearance="primary" onclick={onDownload}>
              <Icon name="download" size={14} />
              <span>Download Handover ZIP</span>
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .manifest-backdrop {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2050;
    padding: 20px;
    animation: fadeIn 0.15s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }
  .manifest-modal {
    width: 95%;
    max-width: 820px;
    height: 82vh;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
  }
  .manifest-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--kanso-surface);
    border-bottom: 1px solid var(--kanso-border);
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .icon-chip {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-pills { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .pill { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
  .pill-job { background: var(--kanso-surface-hover); color: var(--kanso-text-primary); border: 1px solid var(--kanso-border); }
  .pill-brand { background: var(--kanso-surface-hover); color: var(--kanso-accent); border: 1px solid var(--kanso-border); }
  .pill-tag { background: var(--kanso-surface-hover); color: var(--kanso-success); border: 1px solid var(--kanso-border); }
  .manifest-title { font-size: 15px; font-weight: 700; color: var(--kanso-text-primary); margin: 0; }
  .close-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
  }
  .close-btn:hover { color: var(--kanso-text-primary); background: var(--kanso-surface-hover); }
  .tabs-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: var(--kanso-surface);
    border-bottom: 1px solid var(--kanso-border);
  }
  .tabs-group { display: flex; gap: 6px; }
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--kanso-text-muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
  }
  .tab-btn:hover { color: var(--kanso-text-primary); background: var(--kanso-surface-hover); }
  .tab-btn.active {
    color: var(--kanso-text-primary);
    background: var(--kanso-canvas);
    border-color: var(--kanso-border);
  }
  .manifest-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: var(--kanso-canvas);
  }
  .manifest-pre {
    margin: 0;
    padding: 14px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    color: var(--kanso-text-primary);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .summary-preview-frame {
    width: 100%;
    height: 100%;
    min-height: 420px;
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--kanso-surface);
  }
  .summary-iframe {
    width: 100%;
    height: 100%;
    min-height: 420px;
    border: none;
    background: var(--kanso-surface);
  }
  .hashes-table-wrapper {
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--kanso-surface);
  }
  .hashes-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .hashes-table th {
    text-align: left;
    padding: 10px 12px;
    background: var(--kanso-surface-hover);
    border-bottom: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .hashes-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
  }
  .hashes-table tr:last-child td { border-bottom: none; }
  .file-path { font-weight: 600; color: var(--kanso-text-primary); }
  .format-badge {
    padding: 2px 6px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    color: var(--kanso-text-muted);
  }
  .hash-code { font-size: 11px; color: var(--kanso-accent); word-break: break-all; }
  .hash-copy-btn {
    background: transparent;
    border: 1px solid var(--kanso-border);
    border-radius: 4px;
    color: var(--kanso-text-muted);
    cursor: pointer;
    padding: 4px 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .hash-copy-btn:hover { color: var(--kanso-text-primary); background: var(--kanso-surface-hover); }
  .manifest-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: var(--kanso-surface);
    border-top: 1px solid var(--kanso-border);
  }
  .footer-stats { font-size: 11px; color: var(--kanso-text-muted); display: flex; align-items: center; gap: 8px; }
  .sep { opacity: 0.4; }
  .text-muted { color: var(--kanso-text-muted); }
  .text-accent { color: var(--kanso-accent); }
  .footer-actions { display: flex; align-items: center; gap: 10px; }
</style>
