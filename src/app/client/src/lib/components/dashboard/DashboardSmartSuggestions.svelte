<script lang="ts">
  import { Icon } from '$lib/components/ui';

  interface Props {
    unbilledSuggestion: any;
    reviewSuggestion: any;
    deadlineSuggestion: any;
    wellnessSuggestion: any;
  }

  let { unbilledSuggestion, reviewSuggestion, deadlineSuggestion, wellnessSuggestion }: Props = $props();

  const alerts = $derived.by(() => {
    const list: Array<{ header: string; body: string; actionText?: string; actionHref?: string; icon: string; severity: string }> = [];
    if (reviewSuggestion && reviewSuggestion.header !== 'Review Queue Clear') {
      list.push({ ...reviewSuggestion, icon: 'alert', severity: 'warning' });
    }
    if (deadlineSuggestion && deadlineSuggestion.header === 'Approaching Milestone') {
      list.push({ ...deadlineSuggestion, icon: 'calendar', severity: 'warning' });
    }
    if (unbilledSuggestion && (unbilledSuggestion.header === 'Live Billable Session' || unbilledSuggestion.header === 'Pending Receivables')) {
      list.push({ ...unbilledSuggestion, icon: 'wallet', severity: 'info' });
    }
    if (list.length === 0) {
      list.push({
        ...(wellnessSuggestion || {
          header: 'Focus & Cadence',
          body: 'Mindful zen pacing. Take a 5-minute break between deep focus sessions.',
          actionText: 'Tune Radio',
          actionHref: '#radio'
        }),
        icon: 'sparkle',
        severity: 'calm'
      });
    }
    return list;
  });

  let activeIndex = $state(0);
  const currentAlert = $derived(alerts[Math.min(activeIndex, alerts.length - 1)] || alerts[0]);

  function nextAlert() {
    activeIndex = (activeIndex + 1) % alerts.length;
  }
</script>

<aside class="suggestion-strip severity-{currentAlert.severity}" aria-label="Smart suggestions">
  <div class="strip-left">
    <span class="strip-icon"><Icon name={currentAlert.icon} size={14} /></span>
    <span class="strip-label font-semibold">{currentAlert.header}</span>
    <span class="strip-separator">·</span>
    <span class="strip-body">{currentAlert.body}</span>
  </div>

  <div class="strip-right">
    {#if alerts.length > 1}
      <button class="strip-cycle-btn font-mono" onclick={nextAlert} title="Next suggestion" aria-label="Next suggestion">
        {activeIndex + 1}/{alerts.length}
      </button>
    {/if}
    {#if currentAlert.actionHref}
      <a href={currentAlert.actionHref} class="strip-action-link">{currentAlert.actionText}</a>
    {/if}
  </div>
</aside>

<style>
  .suggestion-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 16px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    margin-bottom: 24px;
    font-size: 13px;
    min-height: 40px;
  }
  .suggestion-strip.severity-warning {
    border-left: 3px solid var(--kanso-warning);
  }
  .suggestion-strip.severity-info {
    border-left: 3px solid var(--kanso-accent);
  }
  .suggestion-strip.severity-calm {
    border-left: 3px solid var(--kanso-border);
  }
  .strip-left {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .strip-icon {
    display: flex;
    align-items: center;
    color: var(--kanso-accent);
    flex-shrink: 0;
  }
  .severity-warning .strip-icon {
    color: var(--kanso-warning);
  }
  .strip-label {
    color: var(--kanso-text-primary);
    flex-shrink: 0;
  }
  .strip-separator {
    color: var(--kanso-text-muted);
  }
  .strip-body {
    color: var(--kanso-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .strip-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .strip-cycle-btn {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .strip-cycle-btn:hover {
    color: var(--kanso-text-primary);
    border-color: var(--kanso-accent);
  }
  .strip-action-link {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-accent);
    text-decoration: none;
    white-space: nowrap;
  }
  .strip-action-link:hover {
    text-decoration: underline;
  }
  @media (max-width: 768px) {
    .suggestion-strip {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .strip-left {
      white-space: normal;
      flex-wrap: wrap;
    }
  }
</style>
