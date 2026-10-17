<script lang="ts">
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { clientService, DEFAULT_CLIENTS } from '$lib/services/clientService';
  import { financeService } from '$lib/services/financeService';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { Icon } from '$lib/components/ui';
  import StopSessionModal from './StopSessionModal.svelte';

  let showRatePopover = $state(false);
  let showClientPopover = $state(false);
  let showStopModal = $state(false);
  let stopSessionNote = $state('');

  // Active client profile
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

  // Tactile Global Shortcut: Ctrl+Alt+T
  $effect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handlePlayPause();
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });

  // Idle Activity Detection (15-Minute Focus & Inactivity Threshold)
  let lastActiveTimestamp = $state<number>(Date.now());
  let showIdlePrompt = $state<boolean>(false);
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

  $effect(() => {
    if (!timerStore.isRunning) {
      showIdlePrompt = false;
      return;
    }
    function recordActivity() {
      lastActiveTimestamp = Date.now();
      if (showIdlePrompt) showIdlePrompt = false;
    }
    const events = ['mousemove', 'keydown', 'pointerdown', 'wheel', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, recordActivity, { passive: true }));
    const checkInterval = setInterval(() => {
      if (timerStore.isRunning && Date.now() - lastActiveTimestamp >= IDLE_TIMEOUT_MS) {
        showIdlePrompt = true;
      }
    }, 10000);
    return () => {
      events.forEach(evt => window.removeEventListener(evt, recordActivity));
      clearInterval(checkInterval);
    };
  });

  function dismissIdlePrompt(keepRunning = true) {
    lastActiveTimestamp = Date.now();
    showIdlePrompt = false;
    if (!keepRunning) timerStore.pause();
  }

  // Auto-adapt client from active project
  $effect(() => {
    if (!timerStore.isRunning && !timerStore.isPaused) {
      const activeProjId = appState.routeParams?.id;
      if (activeProjId) {
        const foundProj = projectStore.selectedProject?.id === activeProjId
          ? projectStore.selectedProject
          : (projectStore.projects || []).find(p => p.id === activeProjId || p.jobId === activeProjId);
        if (foundProj) {
          const clientCode = (foundProj.brand || (foundProj as any).clientCode || '').toUpperCase();
          if (clientCode && clientCode !== timerStore.clientCode) {
            selectClient(clientCode);
          }
        }
      }
    }
  });

  function handleStopClick() {
    if (!timerStore.isRunning && !timerStore.isPaused && timerStore.elapsedSeconds === 0) return;
    stopSessionNote = timerStore.sessionNote || '';
    showStopModal = true;
  }

  function confirmStop(note: string, appendToInvoice: boolean) {
    timerStore.sessionNote = note;
    const log = timerStore.stop();
    showStopModal = false;

    if (log) {
      appState.addToast(
        `Session saved: ${log.durationFormatted} (${log.earnedFormatted}) on ${log.clientCode}`,
        'success'
      );
      if (appendToInvoice) {
        financeService.appendSession(log.clientCode, log).then(inv => {
          if (inv) appState.addToast(`Appended ${log.durationFormatted} to invoice ${inv.documentNumber}`, 'info');
        }).catch(e => {
          console.warn('[HeaderTimerWidget] Error appending to draft invoice:', e);
        });
      }
    }
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
  <!-- Transport Controls -->
  <div class="transport-buttons">
    <button
      type="button"
      class="transport-btn play-btn"
      class:running={timerStore.isRunning}
      class:paused={timerStore.isPaused}
      onclick={handlePlayPause}
      title={timerStore.isRunning ? 'Pause Timer (Ctrl+Alt+T)' : 'Start Billable Timer (Ctrl+Alt+T)'}
      aria-label="Start or pause timer"
    >
      <Icon name={timerStore.isRunning ? 'pause' : 'play'} size={12} />
    </button>

    <button
      type="button"
      class="transport-btn stop-btn"
      disabled={!timerStore.isRunning && !timerStore.isPaused && timerStore.elapsedSeconds === 0}
      onclick={handleStopClick}
      title="Stop & Log Session"
      aria-label="Stop timer"
    >
      <Icon name="stop" size={10} />
    </button>
  </div>

  <!-- Monospaced Ticker Display -->
  <div class="ticker-display" class:pulse={timerStore.isRunning}>
    <span class="time-readout font-mono">{timerStore.formattedTime}</span>
  </div>

  <!-- Collapsed Rate + Accrued Earnings Compact Control -->
  <div class="rate-earnings-wrap">
    <button
      type="button"
      class="rate-earnings-pill font-mono"
      onclick={() => { showRatePopover = !showRatePopover; showClientPopover = false; }}
      title="Edit hourly rate ({settingsStore.settings.currencySymbol || '$'}{timerStore.hourlyRate}/h) · Accrued {timerStore.formattedEarned}"
      aria-label="Edit rate and view earnings"
    >
      <span class="rate-part">@{settingsStore.settings.currencySymbol || '$'}{timerStore.hourlyRate}/h</span>
      <span class="pill-dot">·</span>
      <span class="earn-part" class:has-earnings={timerStore.earnings > 0}>{timerStore.formattedEarned}</span>
    </button>

    {#if showRatePopover}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="popover-backdrop" onclick={() => (showRatePopover = false)}></div>
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
              type="button"
              class="preset-chip"
              class:selected={timerStore.hourlyRate === preset}
              onclick={() => { timerStore.setRate(preset); showRatePopover = false; }}
            >
              {settingsStore.settings.currencySymbol} {preset}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="strip-divider" aria-hidden="true"></div>

  <!-- Active Client Selector & Swatches (shows only active client) -->
  <div class="client-swatch-strip">
    <div class="client-picker-wrap">
      <button
        type="button"
        class="client-trigger-btn font-mono"
        onclick={() => { showClientPopover = !showClientPopover; showRatePopover = false; }}
        title="Active Client: {activeClient?.name || timerStore.clientCode}"
        aria-label="Select client profile"
      >
        <span class="client-code-badge">{activeClient?.code || timerStore.clientCode}</span>
        <Icon name="chevronDown" size={10} />
      </button>

      {#if showClientPopover}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="popover-backdrop" onclick={() => (showClientPopover = false)}></div>
        <div class="client-popover" role="menu">
          <div class="popover-title">Active Client</div>
          <div class="client-list">
            {#each clientProfiles as client}
              <button
                type="button"
                class="client-option-btn"
                class:selected={client.code === timerStore.clientCode}
                onclick={() => { selectClient(client.code); showClientPopover = false; }}
              >
                <span class="client-opt-code font-mono">{client.code}</span>
                <span class="client-opt-name">{client.name}</span>
                <span class="client-opt-rate font-mono">{settingsStore.settings.currencySymbol} {client.defaultHourlyRate}/h</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Active Client Palette Swatch with 1-Click Copy -->
    {#if activeClient?.palette}
      <div class="active-swatches">
        <button
          type="button"
          class="swatch-dot"
          style="background: {activeClient.palette.primary};"
          onclick={() => copySwatch(activeClient.palette.primary, 'Primary')}
          title="Primary: {activeClient.palette.primary}"
          aria-label="Copy primary color {activeClient.palette.primary}"
        ></button>
        <button
          type="button"
          class="swatch-dot"
          style="background: {activeClient.palette.secondary};"
          onclick={() => copySwatch(activeClient.palette.secondary, 'Secondary')}
          title="Secondary: {activeClient.palette.secondary}"
          aria-label="Copy secondary color {activeClient.palette.secondary}"
        ></button>
        <button
          type="button"
          class="swatch-dot"
          style="background: {activeClient.palette.accent};"
          onclick={() => copySwatch(activeClient.palette.accent, 'Accent')}
          title="Accent: {activeClient.palette.accent}"
          aria-label="Copy accent color {activeClient.palette.accent}"
        ></button>
      </div>
    {/if}
  </div>

  <!-- Smart Idle Chronometer Pill -->
  {#if showIdlePrompt}
    <div class="idle-prompt-pill" role="alert">
      <span class="idle-alert-icon"><Icon name="clock" size={13} /></span>
      <span class="idle-prompt-text font-mono">Still crafting on [{timerStore.clientCode}]?</span>
      <button type="button" class="idle-action-btn keep" onclick={() => dismissIdlePrompt(true)}>
        Keep Running
      </button>
      <button type="button" class="idle-action-btn pause" onclick={() => dismissIdlePrompt(false)}>
        Pause
      </button>
    </div>
  {/if}
</div>

<!-- Stop Session Dialog -->
<StopSessionModal
  open={showStopModal}
  formattedTime={timerStore.formattedTime}
  clientCode={timerStore.clientCode}
  formattedEarned={timerStore.formattedEarned}
  initialNote={stopSessionNote}
  onConfirm={confirmStop}
  onCancel={() => (showStopModal = false)}
/>

<style>
  .timer-widget-wrap { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 30px; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 9999px; padding: 2px 8px 2px 4px; white-space: nowrap; flex-shrink: 0; box-sizing: border-box; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .timer-widget-wrap.is-active { border-color: var(--kanso-accent); }
  .transport-buttons { display: flex; align-items: center; gap: 2px; }
  .transport-btn { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 9999px; border: none; cursor: pointer; background: transparent; color: var(--kanso-text-muted); transition: all 0.12s ease; }
  .transport-btn:hover:not(:disabled) { background: var(--kanso-surface-hover); color: var(--kanso-text-primary); }
  .play-btn.running { background: var(--kanso-accent); color: #FFFFFF; }
  .transport-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .ticker-display { padding: 0 4px; }
  .time-readout { font-size: 12px; font-weight: 700; color: var(--kanso-text-primary); letter-spacing: 0.04em; }
  .ticker-display.pulse .time-readout { color: var(--kanso-accent); }
  .rate-earnings-wrap { position: relative; }
  .rate-earnings-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 9999px; font-size: 11px; color: var(--kanso-text-muted); cursor: pointer; transition: all 0.12s ease; }
  .rate-earnings-pill:hover { border-color: var(--kanso-accent); color: var(--kanso-text-primary); }
  .pill-dot { opacity: 0.5; }
  .earn-part.has-earnings { color: var(--kanso-success); font-weight: 700; }
  .strip-divider { width: 1px; height: 14px; background: var(--kanso-border); }
  .client-swatch-strip { display: flex; align-items: center; gap: 6px; }
  .client-picker-wrap { position: relative; }
  .client-trigger-btn { display: inline-flex; align-items: center; gap: 3px; background: transparent; border: none; cursor: pointer; padding: 2px 4px; font-size: 11px; font-weight: 700; color: var(--kanso-text-primary); }
  .client-code-badge { color: var(--kanso-accent); }
  .active-swatches { display: flex; align-items: center; gap: 4px; }
  .swatch-dot { width: 10px; height: 10px; border-radius: 9999px; border: 1px solid var(--kanso-border); padding: 0; cursor: pointer; transition: transform 0.1s ease; }
  .swatch-dot:hover { transform: scale(1.3); }
  .popover-backdrop { position: fixed; inset: 0; z-index: 100; }
  .rate-popover, .client-popover { position: absolute; top: calc(100% + 8px); right: 0; z-index: 101; background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 12px; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4); min-width: 200px; }
  .popover-title { font-size: 11px; font-weight: 700; color: var(--kanso-text-muted); text-transform: uppercase; margin-bottom: 8px; }
  .rate-input-row { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
  .rate-input { width: 70px; height: 28px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 4px; padding: 0 6px; font-size: 12px; color: var(--kanso-text-primary); }
  .rate-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .preset-chip { padding: 3px 6px; font-size: 10px; font-family: monospace; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 4px; color: var(--kanso-text-muted); cursor: pointer; }
  .preset-chip.selected { background: var(--kanso-accent); color: #FFFFFF; border-color: var(--kanso-accent); }
  .client-list { display: flex; flex-direction: column; gap: 4px; }
  .client-option-btn { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 4px; cursor: pointer; font-size: 11px; color: var(--kanso-text-primary); }
  .client-option-btn.selected { border-color: var(--kanso-accent); }
  .client-opt-code { font-weight: 700; color: var(--kanso-accent); }
  .client-opt-name { flex: 1; color: var(--kanso-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .client-opt-rate { color: var(--kanso-text-muted); }
  .idle-prompt-pill { position: absolute; top: calc(100% + 6px); left: 0; z-index: 100; display: flex; align-items: center; gap: 8px; background: var(--kanso-surface); border: 1px solid var(--kanso-warning); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45); border-radius: 8px; padding: 5px 10px; font-size: 11.5px; white-space: nowrap; }
  .idle-alert-icon { display: flex; align-items: center; color: var(--kanso-warning); }
  .idle-prompt-text { color: var(--kanso-warning); font-weight: 500; }
  .idle-action-btn { padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; cursor: pointer; border: none; }
  .idle-action-btn.keep { background: var(--kanso-accent); color: #FFFFFF; }
  .idle-action-btn.pause { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-muted); }
</style>
