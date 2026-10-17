<script lang="ts">
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { Icon } from '$lib/components/ui';

  interface Props {
    unbilledSuggestion: any;
    reviewSuggestion: any;
    deadlineSuggestion: any;
    wellnessSuggestion: any;
  }

  let { unbilledSuggestion, reviewSuggestion, deadlineSuggestion, wellnessSuggestion }: Props = $props();
</script>

<section class="suggestions-panel">
  <div class="suggestions-header">
    <div class="sugg-header-left">
      <span class="bento-badge">CREATIVE OPERATIONS INTELLIGENCE</span>
      <h3 class="suggestions-title">Smart Suggestions &amp; Studio Radar</h3>
    </div>
  </div>

  <div class="suggestions-grid">
    <!-- Unbilled -->
    <div class="suggestion-card sky">
      <div class="sugg-top">
        <span class="sugg-chip sky">{unbilledSuggestion.header}</span>
      </div>
      <p class="sugg-body">{unbilledSuggestion.body}</p>
      <a href={unbilledSuggestion.actionHref} class="sugg-action-btn">{unbilledSuggestion.actionText}</a>
    </div>

    <!-- Proofs -->
    <div class="suggestion-card amber">
      <div class="sugg-top">
        <span class="sugg-chip amber">{reviewSuggestion.header}</span>
      </div>
      <p class="sugg-body">{reviewSuggestion.body}</p>
      <a href={reviewSuggestion.actionHref} class="sugg-action-btn">{reviewSuggestion.actionText}</a>
    </div>

    <!-- Deadlines -->
    <div class="suggestion-card {deadlineSuggestion.type}">
      <div class="sugg-top">
        <span class="sugg-chip {deadlineSuggestion.type}">{deadlineSuggestion.header}</span>
      </div>
      <p class="sugg-body">{deadlineSuggestion.body}</p>
      <a href={deadlineSuggestion.actionHref} class="sugg-action-btn">{deadlineSuggestion.actionText}</a>
    </div>

    <!-- Wellness -->
    <div class="suggestion-card teal">
      <div class="sugg-top">
        <span class="sugg-chip teal">{wellnessSuggestion.header}</span>
      </div>
      <p class="sugg-body">{wellnessSuggestion.body}</p>
      <a href={wellnessSuggestion.actionHref} class="sugg-action-btn">{wellnessSuggestion.actionText}</a>
    </div>
  </div>
</section>

<style>
  .suggestions-panel {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .suggestions-header {
    margin-bottom: 16px;
  }
  .bento-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
  }
  .suggestions-title {
    margin: 4px 0 0 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .suggestions-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 1024px) {
    .suggestions-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 600px) {
    .suggestions-grid {
      grid-template-columns: 1fr;
    }
  }
  .suggestion-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 10px;
  }
  .sugg-chip {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .sugg-chip.sky { background: var(--kanso-surface); color: var(--kanso-accent); border: 1px solid var(--kanso-border); }
  .sugg-chip.amber { background: var(--kanso-surface); color: var(--kanso-warning); border: 1px solid var(--kanso-border); }
  .sugg-chip.teal { background: var(--kanso-surface); color: var(--kanso-success); border: 1px solid var(--kanso-border); }
  .sugg-chip.rose { background: var(--kanso-surface); color: var(--kanso-danger); border: 1px solid var(--kanso-border); }
  .sugg-body {
    margin: 0;
    font-size: 12px;
    color: var(--kanso-text-muted);
    line-height: 1.45;
    flex: 1;
  }
  .sugg-action-btn {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-accent);
    text-decoration: none;
    margin-top: 4px;
  }
  .sugg-action-btn:hover {
    text-decoration: underline;
  }
</style>
