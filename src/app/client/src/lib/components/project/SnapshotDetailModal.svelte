<script lang="ts">
  import { Button, Icon } from '$lib/components/ui';

  interface Props {
    open: boolean;
    snapshot: any;
    details: any;
    onClose: () => void;
    onRollback: (snapshotId: string) => Promise<void>;
  }

  let { open = false, snapshot, details, onClose, onRollback }: Props = $props();

  let activeTab = $state<'readme' | 'copy' | 'review' | 'meta'>('readme');
</script>

{#if open}
  <div class="modal-backdrop" onclick={onClose} role="presentation">
    <div
      class="modal-card detail-modal-card"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-labelledby="snapshot-inspector-title"
    >
      <div class="modal-header">
        <div class="detail-header-left">
          <h3 id="snapshot-inspector-title" class="modal-title">Snapshot Inspector</h3>
          {#if snapshot}
            <span class="detail-snap-id font-mono">{snapshot.id} (Rev {snapshot.revision || 1})</span>
          {/if}
        </div>
        <button class="icon-close-btn" onclick={onClose} aria-label="Close dialog">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div class="inspector-nav-bar">
        <button class="nav-tab-btn" class:active={activeTab === 'readme'} onclick={() => (activeTab = 'readme')}>
          Brief (README.md)
        </button>
        <button class="nav-tab-btn" class:active={activeTab === 'copy'} onclick={() => (activeTab = 'copy')}>
          Copy (COPY.md)
        </button>
        <button class="nav-tab-btn" class:active={activeTab === 'review'} onclick={() => (activeTab = 'review')}>
          Review (_review.md)
        </button>
        <button class="nav-tab-btn" class:active={activeTab === 'meta'} onclick={() => (activeTab = 'meta')}>
          Metadata
        </button>
      </div>

      <div class="detail-content-body">
        {#if !details}
          <div class="loading-box"><p>Loading snapshot files...</p></div>
        {:else if activeTab === 'readme'}
          <pre class="file-code-block">{details.readme || 'No README.md content'}</pre>
        {:else if activeTab === 'copy'}
          <pre class="file-code-block">{details.copy || 'No COPY.md content'}</pre>
        {:else if activeTab === 'review'}
          <pre class="file-code-block">{details.review || 'No _review.md comments recorded'}</pre>
        {:else if activeTab === 'meta'}
          <pre class="file-code-block">{JSON.stringify(details.meta || {}, null, 2)}</pre>
        {/if}
      </div>

      <div class="modal-footer">
        <Button appearance="secondary" size="sm" onclick={onClose}>
          Close
        </Button>
        {#if snapshot}
          <Button appearance="primary" size="sm" onclick={() => onRollback(snapshot.id)}>
            <Icon name="refresh" size={14} />
            <span>Restore Project to this Snapshot</span>
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
  }
  .modal-card {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    width: 100%;
    max-width: 800px;
    height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
    outline: none;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid var(--kanso-border);
  }
  .modal-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .detail-header-left {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .detail-snap-id {
    font-size: 11px;
    color: var(--kanso-accent);
  }
  .icon-close-btn {
    background: none;
    border: none;
    color: var(--kanso-text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }
  .icon-close-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }
  .inspector-nav-bar {
    display: flex;
    gap: 8px;
    padding: 8px 18px;
    background: var(--kanso-canvas);
    border-bottom: 1px solid var(--kanso-border);
  }
  .nav-tab-btn {
    padding: 6px 12px;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--kanso-text-muted);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .nav-tab-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface);
  }
  .nav-tab-btn.active {
    color: var(--kanso-accent);
    background: var(--kanso-surface);
    border-color: var(--kanso-border);
  }
  .detail-content-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px 18px;
    background: var(--kanso-canvas);
  }
  .file-code-block {
    margin: 0;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--kanso-text-primary);
    white-space: pre-wrap;
    word-break: break-all;
  }
  .loading-box {
    padding: 40px;
    text-align: center;
    color: var(--kanso-text-muted);
    font-size: 12px;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid var(--kanso-border);
  }
</style>
