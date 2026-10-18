<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open = $bindable(false), onClose }: Props = $props();

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';
  const shiftKey = isMac ? '⇧' : 'Shift';

  let dontShowAgain = $state(false);

  const shortcuts = [
    {
      keys: [`${modKey}`, '1 – 6'],
      title: 'Fast Navigation',
      desc: 'Jump between Home, Projects, Journal, Notes, Clients & Money, and Settings.'
    },
    {
      keys: [`${modKey}`, 'K'],
      title: 'Command Palette',
      desc: 'Universal jump bar to search projects, client dossiers, atomic notes, and actions.'
    },
    {
      keys: [`${modKey}`, `${shiftKey}`, 'K'],
      title: 'Quick Scratchpad',
      desc: 'Instant clipboard and idea dump directly into Scratchpad.md.'
    },
    {
      keys: [`${modKey}`, `${shiftKey}`, 'Z'],
      title: 'Quiet Mode',
      desc: 'Strip away all UI chrome and navigation for total flow on your active canvas.'
    },
    {
      keys: ['Space'],
      title: 'Focus Radio Deck',
      desc: 'Toggle the mechanical lo-fi cassette stream with vintage tape head and gears.'
    }
  ];

  function dismiss() {
    if (dontShowAgain) {
      try {
        localStorage.setItem('kanso.onboarding_dismissed', 'true');
      } catch (_) {}
    }
    open = false;
    onClose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      dismiss();
    }
  }

  onMount(() => {
    try {
      const dismissed = localStorage.getItem('kanso.onboarding_dismissed');
      if (dismissed === 'true') {
        dontShowAgain = true;
      }
    } catch (_) {}
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" onclick={dismiss}>
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div class="badge-row">
          <span class="zen-badge">
            <Icon name="sparkles" size={12} />
            <span>ATELIER FLOW STATE</span>
          </span>
          <span class="version-tag">Kanso Cre8 v0.8.0</span>
        </div>
        <h2 id="onboarding-title" class="modal-title">Designed for Tactile Speed</h2>
        <p class="modal-subtitle">
          Keep your hands on the keyboard. Five essential shortcuts to master your mindful creative vault.
        </p>
      </div>

      <div class="shortcut-list">
        {#each shortcuts as sc, idx}
          <div class="shortcut-row">
            <div class="shortcut-num">0{idx + 1}</div>
            <div class="shortcut-keys">
              {#each sc.keys as k}
                <kbd class="kanso-kbd">{k}</kbd>
              {/each}
            </div>
            <div class="shortcut-meta">
              <span class="meta-title">{sc.title}</span>
              <span class="meta-desc">{sc.desc}</span>
            </div>
          </div>
        {/each}
      </div>

      <div class="modal-tip-banner">
        <Icon name="info" size={14} />
        <span>Press <kbd class="inline-kbd">?</kbd> at any time to reopen this cheat sheet.</span>
      </div>

      <div class="modal-footer">
        <label class="remember-label">
          <input type="checkbox" bind:checked={dontShowAgain} class="remember-checkbox" />
          <span>Do not show on startup</span>
        </label>
        <button type="button" class="btn-enter" onclick={dismiss}>
          <span>Enter Atelier</span>
          <kbd class="btn-kbd">↵</kbd>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(6px);
    padding: var(--kanso-space-4);
  }

  .modal-card {
    width: 100%;
    max-width: 580px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    padding: var(--kanso-space-5) var(--kanso-space-5) var(--kanso-space-3);
    border-bottom: 1px solid var(--kanso-border);
  }

  .badge-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--kanso-space-2);
  }

  .zen-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--kanso-space-1);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
    background: var(--kanso-surface-hover);
    padding: 2px 8px;
    border-radius: var(--kanso-radius-sm);
    border: 1px solid var(--kanso-border);
  }

  .version-tag {
    font-size: 11px;
    font-family: var(--kanso-font-mono);
    color: var(--kanso-text-muted);
  }

  .modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .modal-subtitle {
    margin: var(--kanso-space-1) 0 0;
    font-size: 12.5px;
    color: var(--kanso-text-muted);
    line-height: 1.45;
  }

  .shortcut-list {
    padding: var(--kanso-space-3) var(--kanso-space-5);
    display: flex;
    flex-direction: column;
    gap: var(--kanso-space-2);
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-3);
    padding: var(--kanso-space-2) var(--kanso-space-3);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
  }

  .shortcut-num {
    font-size: 11px;
    font-family: var(--kanso-font-mono);
    color: var(--kanso-text-muted);
    font-weight: 700;
  }

  .shortcut-keys {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 110px;
  }

  .kanso-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    font-family: var(--kanso-font-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-primary);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-sm);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .shortcut-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }

  .meta-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--kanso-text-primary);
  }

  .meta-desc {
    font-size: 11.5px;
    color: var(--kanso-text-muted);
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .modal-tip-banner {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    margin: 0 var(--kanso-space-5) var(--kanso-space-3);
    padding: var(--kanso-space-2) var(--kanso-space-3);
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-md);
    font-size: 12px;
    color: var(--kanso-text-muted);
  }

  .inline-kbd {
    display: inline-block;
    padding: 0 5px;
    font-family: var(--kanso-font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-xs);
  }

  .modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--kanso-space-4) var(--kanso-space-5);
    background: var(--kanso-surface);
    border-top: 1px solid var(--kanso-border);
  }

  .remember-label {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    font-size: 12px;
    color: var(--kanso-text-muted);
    cursor: pointer;
  }

  .remember-checkbox {
    accent-color: var(--kanso-accent);
    cursor: pointer;
  }

  .btn-enter {
    height: 36px;
    padding: 0 var(--kanso-space-4);
    display: inline-flex;
    align-items: center;
    gap: var(--kanso-space-2);
    background: var(--kanso-accent);
    border: 1px solid var(--kanso-accent);
    border-radius: var(--kanso-radius-md);
    color: var(--kanso-canvas);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .btn-enter:hover {
    opacity: 0.9;
  }

  .btn-kbd {
    font-family: var(--kanso-font-mono);
    font-size: 11px;
    background: rgba(0, 0, 0, 0.15);
    padding: 1px 5px;
    border-radius: var(--kanso-radius-xs);
  }

  @media (max-width: 600px) {
    .shortcut-row {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--kanso-space-1);
    }
    .meta-desc {
      white-space: normal;
    }
    .modal-footer {
      flex-direction: column;
      gap: var(--kanso-space-3);
      align-items: stretch;
    }
    .btn-enter {
      justify-content: center;
    }
  }
</style>
