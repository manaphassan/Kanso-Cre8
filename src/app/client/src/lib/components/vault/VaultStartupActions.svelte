<script lang="ts">
  import { Icon } from '$lib/components/ui';

  interface Props {
    chosenPath: string;
    isRetrying: boolean;
    isMounting: boolean;
    isCreating: boolean;
    hasRoot: boolean;
    onRetry: () => void;
    onBrowse: () => void;
    onMountChosen: () => void;
    onCreateAndMountHere: () => void;
    onPathChange: (newPath: string) => void;
  }

  let {
    chosenPath,
    isRetrying,
    isMounting,
    isCreating,
    hasRoot,
    onRetry,
    onBrowse,
    onMountChosen,
    onCreateAndMountHere,
    onPathChange
  }: Props = $props();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    onPathChange(target.value);
  }
</script>

<div class="action-grid">
  <!-- Action 1: Retry -->
  <div class="action-box">
    <div class="action-meta">
      <span class="action-title">Drive Reconnected?</span>
      <span class="action-hint">Re-verify status if the drive or sync finished</span>
    </div>
    <button
      type="button"
      class="btn-secondary"
      onclick={onRetry}
      disabled={isRetrying}
    >
      <Icon name="bolt" size={14} />
      <span>{isRetrying ? 'Checking...' : 'Retry Vault Scan'}</span>
    </button>
  </div>

  <!-- Action 2: Choose different folder -->
  <div class="action-box choose-box">
    <div class="action-meta">
      <span class="action-title">Choose a Different Folder</span>
      <span class="action-hint">Relocate to any existing folder on your local storage</span>
    </div>
    <div class="input-row">
      <input
        type="text"
        class="gate-input"
        placeholder="e.g. D:\CreativeVault or /home/vault"
        value={chosenPath}
        oninput={handleInput}
        aria-label="New vault folder path"
      />
      <button type="button" class="btn-secondary btn-browse" onclick={onBrowse} title="Browse directories">
        <Icon name="folder" size={14} />
        <span>Browse</span>
      </button>
      <button
        type="button"
        class="btn-primary"
        onclick={onMountChosen}
        disabled={isMounting || !chosenPath.trim()}
      >
        <span>{isMounting ? 'Mounting...' : 'Mount Folder'}</span>
      </button>
    </div>
  </div>

  <!-- Action 3: Create and mount here -->
  {#if hasRoot}
    <div class="action-box">
      <div class="action-meta">
        <span class="action-title">New Vault Setup</span>
        <span class="action-hint">Explicitly initialize a fresh vault at the configured path</span>
      </div>
      <button
        type="button"
        class="btn-secondary btn-create"
        onclick={onCreateAndMountHere}
        disabled={isCreating}
      >
        <Icon name="package" size={14} />
        <span>{isCreating ? 'Provisioning...' : 'Create and Mount Here'}</span>
      </button>
    </div>
  {/if}
</div>

<style>
  .action-grid {
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-3);
  }

  .action-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--kanso-space-3) var(--kanso-space-4);
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    gap: var(--kanso-space-3);
  }

  .action-box.choose-box {
    flex-direction: column;
    align-items: stretch;
    gap: var(--kanso-space-2);
  }

  .action-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-primary);
  }

  .action-hint {
    font-size: 12px;
    color: var(--kanso-text-muted);
  }

  .input-row {
    display: flex;
    gap: var(--kanso-space-2);
  }

  .gate-input {
    flex: 1;
    height: 36px;
    padding: 0 var(--kanso-space-3);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-text-primary);
    font-family: var(--kanso-font-mono);
    font-size: 12.5px;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .gate-input:focus {
    border-color: var(--kanso-accent);
  }

  .btn-primary {
    height: 36px;
    padding: 0 var(--kanso-space-4);
    background: var(--kanso-accent);
    border: 1px solid var(--kanso-accent);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-canvas);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s ease;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .btn-secondary {
    height: 36px;
    padding: 0 var(--kanso-space-3);
    display: inline-flex;
    align-items: center;
    gap: var(--kanso-space-2);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-text-primary);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-text-muted);
  }

  .btn-secondary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .btn-create {
    color: var(--kanso-accent);
    border-color: var(--kanso-border);
  }

  .btn-create:hover:not(:disabled) {
    border-color: var(--kanso-accent);
  }

  @media (max-width: 600px) {
    .input-row {
      flex-direction: column;
    }
  }
</style>
