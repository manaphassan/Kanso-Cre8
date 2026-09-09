<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { zettelService } from '$lib/services/zettelService';
  import { appState } from '$lib/stores/appState.svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open = $bindable(), onclose }: Props = $props();

  let content = $state('');
  let isSaving = $state(false);
  let lastSaved = $state('');
  let saveTimer: any = null;

  $effect(() => {
    if (open) {
      loadContent();
    }
  });

  async function loadContent() {
    try {
      const res = await ApiClient.getScratchpad();
      if (res && res.success) {
        content = res.content || '';
        return;
      }
    } catch (e) {}
    content = zettelService.getScratchpad();
  }

  function handleInput() {
    if (saveTimer) clearTimeout(saveTimer);
    isSaving = true;
    saveTimer = setTimeout(async () => {
      await saveContent();
    }, 800);
  }

  async function saveContent() {
    try {
      isSaving = true;
      await ApiClient.saveScratchpad(content);
      zettelService.saveScratchpad(content);
      lastSaved = new Date().toLocaleTimeString();
    } catch (e) {
      zettelService.saveScratchpad(content);
    } finally {
      isSaving = false;
    }
  }

  async function handlePasteClipboard() {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const timestamp = new Date().toLocaleString();
          const appendBlock = `\n\n---\n*Pasted ${timestamp}*\n${text}`;
          content = content ? `${content}${appendBlock}` : text;
          await saveContent();
          appState.addToast('Clipboard content appended to Scratchpad', 'success');
        }
      }
    } catch (err) {
      appState.addToast('Could not access clipboard directly', 'warning');
    }
  }

  function handleClear() {
    if (confirm('Clear entire Scratchpad? This will erase temporary scribbles.')) {
      content = '';
      saveContent();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      saveContent();
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div class="scratchpad-overlay" onclick={() => { saveContent(); onclose(); }}>
    <div class="scratchpad-modal" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <div class="badge-row">
            <span class="badge-zen">_Notes/Scratchpad.md</span>
            <span class="hotkey-hint">Ctrl+Shift+K</span>
          </div>
          <h3 class="modal-title">Quick Scratchpad Capture</h3>
        </div>

        <div class="header-right">
          {#if isSaving}
            <span class="sync-indicator">Saving...</span>
          {:else if lastSaved}
            <span class="sync-indicator saved">Saved {lastSaved}</span>
          {/if}
          <button class="close-btn" onclick={() => { saveContent(); onclose(); }} title="Close (Esc)">✕</button>
        </div>
      </div>

      <!-- Textarea Body -->
      <div class="modal-body">
        <textarea
          bind:value={content}
          oninput={handleInput}
          class="scratchpad-textarea"
          placeholder="Instant clipboard dump, ephemeral notes, unformatted thoughts, or quick call scribbles..."
          autofocus
        ></textarea>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <div class="footer-stats">
          <span>{content.length} chars</span>
          <span>•</span>
          <span>{content.trim() ? content.trim().split(/\s+/).length : 0} words</span>
        </div>

        <div class="footer-actions">
          <button class="action-btn text-btn" onclick={handleClear}>Clear</button>
          <button class="action-btn secondary-btn" onclick={handlePasteClipboard}>
            📋 Paste Clipboard
          </button>
          <button class="action-btn primary-btn" onclick={() => { saveContent(); onclose(); }}>
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .scratchpad-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .scratchpad-modal {
    width: 100%;
    max-width: 680px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: modalPop 0.15s ease-out;
  }

  @keyframes modalPop {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--kanso-border, #27272A);
  }

  .badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .badge-zen {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-accent, #38BDF8);
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .hotkey-hint {
    font-size: 10px;
    font-family: ui-monospace, monospace;
    color: var(--kanso-text-muted, #71717A);
    background: rgba(255, 255, 255, 0.05);
    padding: 1px 5px;
    border-radius: 3px;
  }

  .modal-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sync-indicator {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
  }

  .sync-indicator.saved {
    color: #10B981;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    font-size: 14px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }

  .close-btn:hover {
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .modal-body {
    padding: 16px 20px;
  }

  .scratchpad-textarea {
    width: 100%;
    height: 320px;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    color: var(--kanso-text-primary, #F4F4F5);
    font-family: ui-monospace, monospace;
    font-size: 13px;
    line-height: 1.6;
    padding: 14px;
    outline: none;
    resize: none;
    box-sizing: border-box;
  }

  .scratchpad-textarea:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-top: 1px solid var(--kanso-border, #27272A);
    background: rgba(0, 0, 0, 0.2);
  }

  .footer-stats {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
  }

  .footer-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .action-btn {
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .text-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
  }

  .text-btn:hover {
    color: var(--kanso-danger, #EF4444);
  }

  .secondary-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .secondary-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .primary-btn {
    background: var(--kanso-accent, #38BDF8);
    border: 1px solid var(--kanso-accent, #38BDF8);
    color: #09090B;
    font-weight: 700;
  }

  .primary-btn:hover {
    filter: brightness(1.1);
  }
</style>
