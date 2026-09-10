<script lang="ts">
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { clientService, DEFAULT_CLIENTS } from '$lib/services/clientService';
  import { financeService } from '$lib/services/financeService';

  let showRatePopover = $state(false);
  let showStopModal = $state(false);
  let stopSessionNote = $state('');
  let appendToInvoiceChoice = $state(true);

  // Client swatches mapping
  const clientProfiles = $derived(clientService.getClients());
  const activeClient = $derived(
    clientProfiles.find(c => c.code === timerStore.clientCode) || clientProfiles[0] || DEFAULT_CLIENTS[0]
  );

  function handlePlayPause() {
    if (timerStore.isRunning) {
      timerStore.pause();
    } else if (timerStore.isPaused) {
      timerStore.resume();
    } else {
      timerStore.start();
    }
  }

  function handleStopClick() {
    if (!timerStore.isRunning && !timerStore.isPaused && timerStore.elapsedSeconds === 0) return;
    stopSessionNote = timerStore.sessionNote || '';
    showStopModal = true;
  }

  function confirmStop() {
    timerStore.sessionNote = stopSessionNote;
    const log = timerStore.stop();
    showStopModal = false;

    if (log) {
      appState.addToast(
        `Session saved: ${log.durationFormatted} (${log.earnedFormatted}) on ${log.clientCode}`,
        'success'
      );

      if (appendToInvoiceChoice) {
        financeService.appendSession(log.clientCode, log).then(inv => {
          if (inv) {
            appState.addToast(`Appended ${log.durationFormatted} to invoice ${inv.documentNumber}`, 'info');
          }
        }).catch(e => {
          console.warn('[HeaderTimerWidget] Error appending to draft invoice:', e);
        });
      }
    }
  }

  function cancelStop() {
    showStopModal = false;
  }

  function copySwatch(hex: string, label: string) {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(hex);
      appState.addToast(`Copied ${label} ${hex} to clipboard`, 'info');
    }
  }

  function selectClient(code: string) {
    const found = clientProfiles.find(c => c.code === code);
    if (found) {
      timerStore.setClient(found.code, found.defaultHourlyRate);
    } else {
      timerStore.setClient(code);
    }
  }
</script>

<div class="timer-widget-wrap" class:is-active={timerStore.isRunning}>
  <!-- Tactile Transport Controls -->
  <div class="transport-buttons">
    <button
      class="transport-btn play-btn"
      class:running={timerStore.isRunning}
      class:paused={timerStore.isPaused}
      onclick={handlePlayPause}
      title={timerStore.isRunning ? 'Pause Timer (Space)' : 'Start Billable Timer'}
      aria-label="Start or pause timer"
    >
      {#if timerStore.isRunning}
        <!-- Pause Icon -->
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      {:else}
        <!-- Play Icon -->
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      {/if}
    </button>

    <button
      class="transport-btn stop-btn"
      disabled={!timerStore.isRunning && !timerStore.isPaused && timerStore.elapsedSeconds === 0}
      onclick={handleStopClick}
      title="Stop & Log Session"
      aria-label="Stop timer"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"/>
      </svg>
    </button>
  </div>

  <!-- Monospaced Ticker Display -->
  <div class="ticker-display" class:pulse={timerStore.isRunning}>
    <span class="time-readout">{timerStore.formattedTime}</span>
  </div>

  <!-- Real-Time Auto-Calculated Earned Rate Badge -->
  <div class="earned-badge" title="Live accrued earnings based on hourly rate">
    <span class="earned-amount">{timerStore.formattedEarned}</span>
  </div>

  <!-- Client & Hourly Rate Selector Strip -->
  <div class="client-rate-strip">
    <select
      class="client-select"
      value={timerStore.clientCode}
      onchange={(e) => selectClient((e.target as HTMLSelectElement).value)}
      title="Active Client Billing Profile"
    >
      {#each clientProfiles as client}
        <option value={client.code}>{client.code} ({settingsStore.settings.currencySymbol}{client.defaultHourlyRate}/h)</option>
      {/each}
    </select>

    <!-- Inline Rate Trigger -->
    <div class="rate-badge-wrap">
      <button
        class="rate-trigger"
        onclick={() => (showRatePopover = !showRatePopover)}
        title="Click to edit design hourly rate"
      >
        @{settingsStore.settings.currencySymbol}{timerStore.hourlyRate}/h
      </button>

      {#if showRatePopover}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="rate-popover-backdrop" onclick={() => (showRatePopover = false)}></div>
        <div class="rate-popover" role="dialog" aria-label="Hourly Rate Selector">
          <div class="popover-title">Design Hourly Rate</div>
          <div class="rate-input-row">
            <span class="curr-prefix">{settingsStore.settings.currencySymbol}</span>
            <input
              type="number"
              min="10"
              max="1000"
              step="5"
              value={timerStore.hourlyRate}
              onchange={(e) => timerStore.setRate(Number((e.target as HTMLInputElement).value))}
              class="rate-input"
            />
            <span class="curr-suffix">/ hour</span>
          </div>
          <div class="rate-presets">
            {#each [100, 140, 160, 180, 200, 220] as preset}
              <button
                class="preset-chip"
                class:selected={timerStore.hourlyRate === preset}
                onclick={() => { timerStore.setRate(preset); showRatePopover = false; }}
              >
                {settingsStore.settings.currencySymbol}{preset}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Active Client Swatch Strip with 1-Click Hex Copy -->
    {#if activeClient?.palette}
      <div class="client-swatches" title="1-Click copy {activeClient.name} brand color">
        <button
          class="swatch-dot"
          style="background: {activeClient.palette.primary};"
          onclick={() => copySwatch(activeClient.palette.primary, 'Primary')}
          title="Primary: {activeClient.palette.primary}"
        ></button>
        <button
          class="swatch-dot"
          style="background: {activeClient.palette.secondary};"
          onclick={() => copySwatch(activeClient.palette.secondary, 'Secondary')}
          title="Secondary: {activeClient.palette.secondary}"
        ></button>
        <button
          class="swatch-dot"
          style="background: {activeClient.palette.accent};"
          onclick={() => copySwatch(activeClient.palette.accent, 'Accent')}
          title="Accent: {activeClient.palette.accent}"
        ></button>
      </div>
    {/if}
  </div>
</div>

<!-- Stop Session Dialog -->
{#if showStopModal}
  <div class="stop-modal-backdrop" onclick={cancelStop} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="stop-modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      <div class="stop-modal-header">
        <div class="stop-title-wrap">
          <span class="stop-badge-icon">⏱️</span>
          <div>
            <h3 class="stop-modal-title">Session Complete</h3>
            <p class="stop-modal-sub">Log hours to creative ledger &amp; client invoice</p>
          </div>
        </div>
      </div>

      <div class="stop-metrics-bento">
        <div class="bento-box">
          <span class="bbox-label">TIME LOGGED</span>
          <span class="bbox-value time-val">{timerStore.formattedTime}</span>
        </div>
        <div class="bento-box">
          <span class="bbox-label">CLIENT</span>
          <span class="bbox-value client-val">{timerStore.clientCode}</span>
        </div>
        <div class="bento-box">
          <span class="bbox-label">ACCRUED EARNED</span>
          <span class="bbox-value earn-val">{timerStore.formattedEarned}</span>
        </div>
      </div>

      <div class="stop-input-group">
        <label for="stop-note" class="stop-label">Session Deliverable Note / Summary</label>
        <input
          id="stop-note"
          type="text"
          bind:value={stopSessionNote}
          placeholder="e.g. 4K Mobile Hero 3D renders, revision round 2..."
          class="stop-input"
        />
      </div>

      <label class="stop-checkbox-row">
        <input type="checkbox" bind:checked={appendToInvoiceChoice} class="stop-checkbox" />
        <span class="checkbox-text">
          <strong>1-Click Append to Draft Invoice</strong> ({timerStore.clientCode})
        </span>
      </label>

      <div class="stop-modal-actions">
        <button class="modal-btn secondary" onclick={cancelStop}>Resume Session</button>
        <button class="modal-btn primary" onclick={confirmStop}>Log &amp; Finish</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .timer-widget-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 9999px;
    padding: 3px 8px 3px 4px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  .timer-widget-wrap.is-active {
    border-color: rgba(56, 189, 248, 0.4);
    background: rgba(56, 189, 248, 0.04);
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.12);
  }

  .transport-buttons {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .transport-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
    color: var(--kanso-text-primary, #F4F4F5);
    background: transparent;
  }

  .transport-btn.play-btn {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--kanso-border, #27272A);
  }

  .transport-btn.play-btn:hover {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    border-color: var(--kanso-accent, #38BDF8);
  }

  .transport-btn.play-btn.running {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
    animation: pulseGlow 2s infinite ease-in-out;
  }

  @keyframes pulseGlow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.88; transform: scale(0.96); }
  }

  .transport-btn.stop-btn {
    background: transparent;
    color: var(--kanso-text-muted, #71717A);
  }

  .transport-btn.stop-btn:hover:not(:disabled) {
    color: #EF4444;
    background: rgba(239, 68, 68, 0.12);
  }

  .transport-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .ticker-display {
    display: flex;
    align-items: center;
    padding: 0 4px;
    font-family: var(--kanso-font-mono, ui-monospace, monospace);
    font-size: 15.5px;
    font-weight: 700;
    color: var(--kanso-text-muted, #71717A);
    letter-spacing: 0.05em;
    font-variant-numeric: tabular-nums;
  }

  .ticker-display.pulse {
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .earned-badge {
    display: inline-flex;
    align-items: center;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.25);
    color: #10B981;
    font-size: 13px;
    font-weight: 700;
    font-family: var(--kanso-font-mono, ui-monospace, monospace);
    padding: 2px 8px;
    border-radius: 9999px;
    font-variant-numeric: tabular-nums;
  }

  .client-rate-strip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-left: 4px;
    border-left: 1px solid var(--kanso-border, #27272A);
  }

  .client-select {
    background: transparent;
    border: none;
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    cursor: pointer;
    outline: none;
    padding: 3px 6px;
    border-radius: 4px;
  }

  .client-select:hover {
    background: var(--kanso-surface-hover, #27272A);
  }

  .client-select option {
    background: #18181B;
    color: #F4F4F5;
  }

  .rate-badge-wrap {
    position: relative;
  }

  .rate-trigger {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-muted, #71717A);
    padding: 2px 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .rate-trigger:hover {
    color: var(--kanso-text-primary, #F4F4F5);
    border-color: var(--kanso-accent, #38BDF8);
  }

  .rate-popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }

  .rate-popover {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 6px;
    width: 210px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 100;
  }

  .popover-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--kanso-text-muted, #71717A);
    margin-bottom: 6px;
  }

  .rate-input-row {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 4px 8px;
  }

  .curr-prefix, .curr-suffix {
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
  }

  .rate-input {
    width: 60px;
    background: transparent;
    border: none;
    color: #F4F4F5;
    font-size: 14px;
    font-weight: 700;
    outline: none;
  }

  .rate-presets {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    margin-top: 8px;
  }

  .preset-chip {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 4px;
    color: var(--kanso-text-primary, #F4F4F5);
    font-size: 12px;
    font-weight: 600;
    padding: 4px 0;
    cursor: pointer;
  }

  .preset-chip:hover, .preset-chip.selected {
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    border-color: var(--kanso-accent, #38BDF8);
  }

  .client-swatches {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-left: 2px;
  }

  .swatch-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: transform 0.15s ease;
    padding: 0;
  }

  .swatch-dot:hover {
    transform: scale(1.3);
    border-color: #FFFFFF;
  }

  /* --- STOP MODAL --- */
  .stop-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease;
  }

  .stop-modal-card {
    width: 100%;
    max-width: 440px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stop-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .stop-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .stop-badge-icon {
    font-size: 24px;
  }

  .stop-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }

  .stop-modal-sub {
    font-size: 13px;
    color: var(--kanso-text-muted, #71717A);
    margin: 2px 0 0 0;
  }

  .stop-metrics-bento {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 10px;
  }

  .bento-box {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bbox-label {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--kanso-text-muted, #71717A);
    letter-spacing: 0.05em;
  }

  .bbox-value {
    font-size: 14px;
    font-weight: 700;
    font-family: ui-monospace, SFMono-Regular, monospace;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .bbox-value.time-val { color: var(--kanso-accent, #38BDF8); }
  .bbox-value.client-val { color: #F59E0B; }
  .bbox-value.earn-val { color: #10B981; }

  .stop-input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .stop-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .stop-input {
    background: #09090B;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    color: #F4F4F5;
    outline: none;
  }

  .stop-input:focus {
    border-color: var(--kanso-accent, #38BDF8);
  }

  .stop-checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--kanso-text-primary, #F4F4F5);
    cursor: pointer;
  }

  .stop-checkbox {
    width: 15px;
    height: 15px;
    accent-color: var(--kanso-accent, #38BDF8);
    cursor: pointer;
  }

  .stop-modal-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .modal-btn {
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .modal-btn.secondary {
    background: transparent;
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .modal-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .modal-btn.primary {
    background: var(--kanso-accent, #38BDF8);
    border: 1px solid var(--kanso-accent, #38BDF8);
    color: #09090B;
  }

  .modal-btn.primary:hover {
    filter: brightness(1.1);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
