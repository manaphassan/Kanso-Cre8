<script lang="ts">
  import { timerStore, type TimeSessionLog } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { financeService } from '$lib/services/financeService';
  import { appState } from '$lib/stores/appState.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  let isAppendingAll = $state(false);
  let appendingId = $state<string | null>(null);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  async function appendSingleSession(session: TimeSessionLog) {
    appendingId = session.id;
    try {
      const inv = await financeService.appendSession(session.clientCode, session);
      timerStore.markSessionAppended(session.id);
      if (inv) {
        appState.addToast(`Appended ${session.durationFormatted} to ${session.clientCode} invoice ${inv.documentNumber}`, 'success');
      } else {
        appState.addToast(`Appended session to ${session.clientCode} draft invoice`, 'success');
      }
    } catch (e) {
      console.warn('[UnbilledSessionsModal] Failed appending session:', e);
      appState.addToast('Failed appending session to invoice', 'error');
    } finally {
      appendingId = null;
    }
  }

  function dismissSession(session: TimeSessionLog) {
    timerStore.dismissUnbilledSession(session.id);
    appState.addToast(`Session on ${session.clientCode} marked as settled`, 'info');
  }

  async function appendAllSessions() {
    if (timerStore.unbilledLogs.length === 0) return;
    isAppendingAll = true;
    try {
      const logs = [...timerStore.unbilledLogs];
      for (const log of logs) {
        await financeService.appendSession(log.clientCode, log);
        timerStore.markSessionAppended(log.id);
      }
      appState.addToast(`Appended ${logs.length} session(s) to respective client draft invoices`, 'success');
      onClose();
    } catch (e) {
      console.warn('[UnbilledSessionsModal] Failed appending all sessions:', e);
      appState.addToast('Error appending some sessions', 'error');
    } finally {
      isAppendingAll = false;
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="unbilled-backdrop" onclick={onClose} role="presentation">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="unbilled-card"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unbilled-title"
      tabindex="-1"
    >
      <div class="unbilled-header">
        <div class="header-left">
          <span class="header-badge-icon" aria-hidden="true">
            <Icon name="clock" size={16} />
          </span>
          <div>
            <h3 id="unbilled-title" class="unbilled-title">
              Unbilled Atelier Time
              {#if timerStore.unbilledCount > 0}
                <span class="unbilled-pill font-mono">{timerStore.unbilledCount}</span>
              {/if}
            </h3>
            <p class="unbilled-subtitle">Logged chronometer sessions ready to append to client invoices</p>
          </div>
        </div>
        <button type="button" class="close-btn" onclick={onClose} aria-label="Close dialog">
          <Icon name="close" size={14} />
        </button>
      </div>

      {#if timerStore.unbilledCount > 0}
        <div class="unbilled-bento">
          <div class="bento-metric">
            <span class="metric-label">UNBILLED TIME</span>
            <span class="metric-value font-mono">{timerStore.unbilledFormatted}</span>
          </div>
          <div class="bento-metric">
            <span class="metric-label">ACCRUED VALUE</span>
            <span class="metric-value text-accent font-mono">
              +{settingsStore.settings.currencySymbol || 'RM'} {timerStore.unbilledEarnings.toFixed(2)}
            </span>
          </div>
          <div class="bento-metric">
            <span class="metric-label">SESSIONS</span>
            <span class="metric-value font-mono">{timerStore.unbilledCount}</span>
          </div>
        </div>

        <div class="sessions-scroll" role="region" aria-label="Unbilled sessions list">
          {#each timerStore.unbilledLogs as session (session.id)}
            <div class="session-item-row">
              <div class="session-info">
                <div class="session-meta-row">
                  <span class="client-badge font-mono">{session.clientCode}</span>
                  <span class="session-date font-mono">{session.startedAt ? session.startedAt.split('T')[0] : 'Today'}</span>
                  <span class="session-rate font-mono">@{settingsStore.settings.currencySymbol || 'RM'} {session.hourlyRate}/h</span>
                </div>
                <div class="session-desc">
                  <strong>{session.projectTitle || 'Creative Sprint'}</strong>
                  {#if session.note}
                    <span class="session-note">· {session.note}</span>
                  {/if}
                </div>
              </div>

              <div class="session-figures">
                <span class="session-duration font-mono">{session.durationFormatted}</span>
                <span class="session-earned font-mono text-accent">{session.earnedFormatted}</span>
              </div>

              <div class="session-actions">
                <button
                  type="button"
                  class="action-btn append-btn"
                  disabled={appendingId === session.id || isAppendingAll}
                  onclick={() => appendSingleSession(session)}
                  title="Append line item to {session.clientCode} draft invoice"
                  aria-label="Append to draft invoice"
                >
                  {appendingId === session.id ? 'Appending...' : 'Append to Draft'}
                </button>
                <button
                  type="button"
                  class="action-btn dismiss-btn"
                  onclick={() => dismissSession(session)}
                  title="Mark as billed or settled outside invoice"
                  aria-label="Dismiss session"
                >
                  Dismiss
                </button>
              </div>
            </div>
          {/each}
        </div>

        <div class="unbilled-footer">
          <button type="button" class="btn secondary" onclick={onClose}>Close</button>
          <button type="button" class="btn primary" disabled={isAppendingAll} onclick={appendAllSessions}>
            {isAppendingAll ? 'Appending All...' : `Append All (${timerStore.unbilledCount}) to Invoices`}
          </button>
        </div>
      {:else}
        <div class="empty-state-box">
          <span class="empty-icon" aria-hidden="true"><Icon name="check" size={24} /></span>
          <div class="empty-title">All Atelier Time Billed</div>
          <p class="empty-sub">Every stopped chronometer session is currently accounted for on client draft invoices.</p>
          <button type="button" class="btn secondary" onclick={onClose}>Return to Atelier</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .unbilled-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .unbilled-card { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; width: 100%; max-width: 620px; max-height: 85vh; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); }
  .unbilled-header { display: flex; align-items: center; justify-content: space-between; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .header-badge-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-border); color: var(--kanso-warning); }
  .unbilled-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--kanso-text-primary); display: flex; align-items: center; gap: 8px; }
  .unbilled-pill { padding: 1px 6px; font-size: 11px; border-radius: 9999px; background: var(--kanso-surface-hover); border: 1px solid var(--kanso-warning); color: var(--kanso-warning); }
  .unbilled-subtitle { margin: 2px 0 0; font-size: 12px; color: var(--kanso-text-muted); }
  .close-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: transparent; border: none; color: var(--kanso-text-muted); cursor: pointer; }
  .close-btn:hover { background: var(--kanso-surface-hover); color: var(--kanso-text-primary); }
  .unbilled-bento { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; padding: 12px; }
  .bento-metric { display: flex; flex-direction: column; gap: 2px; }
  .metric-label { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; color: var(--kanso-text-muted); }
  .metric-value { font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .text-accent { color: var(--kanso-accent); }
  .sessions-scroll { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 4px; }
  .session-item-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; transition: border-color 0.15s ease; }
  .session-item-row:hover { border-color: var(--kanso-border); }
  .session-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .session-meta-row { display: flex; align-items: center; gap: 6px; font-size: 11px; }
  .client-badge { padding: 1px 5px; border-radius: 4px; background: var(--kanso-surface-hover); color: var(--kanso-accent); font-weight: 700; }
  .session-date, .session-rate { color: var(--kanso-text-muted); }
  .session-desc { font-size: 12px; color: var(--kanso-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .session-note { color: var(--kanso-text-muted); }
  .session-figures { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .session-duration { font-size: 12px; font-weight: 700; color: var(--kanso-text-primary); }
  .session-earned { font-size: 11px; font-weight: 600; }
  .session-actions { display: flex; align-items: center; gap: 6px; }
  .action-btn { padding: 5px 10px; font-size: 11px; font-weight: 600; border-radius: 4px; cursor: pointer; border: 1px solid var(--kanso-border); background: var(--kanso-surface); color: var(--kanso-text-primary); transition: all 0.12s ease; }
  .action-btn.append-btn { background: var(--kanso-accent); border-color: var(--kanso-accent); color: var(--kanso-canvas); }
  .action-btn.append-btn:hover:not(:disabled) { opacity: 0.9; }
  .action-btn.dismiss-btn { color: var(--kanso-text-muted); }
  .action-btn.dismiss-btn:hover { color: var(--kanso-text-primary); background: var(--kanso-surface-hover); }
  .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .unbilled-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 10px; border-top: 1px solid var(--kanso-border); }
  .btn { padding: 8px 16px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; border: none; transition: opacity 0.15s ease; }
  .btn.primary { background: var(--kanso-accent); color: var(--kanso-canvas); }
  .btn.primary:hover:not(:disabled) { opacity: 0.9; }
  .btn.secondary { background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); }
  .btn.secondary:hover { background: var(--kanso-surface-hover); }
  .empty-state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; text-align: center; gap: 8px; }
  .empty-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: var(--kanso-surface-hover); color: var(--kanso-success); margin-bottom: 8px; }
  .empty-title { font-size: 14px; font-weight: 700; color: var(--kanso-text-primary); }
  .empty-sub { font-size: 12px; color: var(--kanso-text-muted); max-width: 340px; margin: 0 0 12px; }
</style>
