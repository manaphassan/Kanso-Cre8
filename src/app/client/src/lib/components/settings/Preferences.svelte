<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { getSession, setSession } from '$lib/services/session';
  import ThemeSelector from './ThemeSelector.svelte';
  import KeyboardShortcuts from './KeyboardShortcuts.svelte';

  type ViewMode = 'cards' | 'kanban' | 'table';
  let defaultProjectView = $state<ViewMode>(
    (getSession().defaultProjectView as ViewMode) || 'kanban'
  );
  let hourlyRate = $state(timerStore.hourlyRate || 125);

  const viewModesList: { id: ViewMode; name: string; desc: string }[] = [
    { id: 'kanban', name: 'Kanban Pipeline', desc: 'Stage-by-stage drag-and-drop production pipeline' },
    { id: 'table', name: 'Data Table', desc: 'High-density sortable tabular grid for studio oversight' },
    { id: 'cards', name: 'Cards Grid', desc: 'Visual card overview with priority, client swatch, and deadline indicators' }
  ];

  function handleSavePreferences() {
    setSession({ defaultProjectView, projectView: defaultProjectView });
    const numRate = Number(hourlyRate) || 125;
    timerStore.setHourlyRate(numRate);
    settingsStore.updateSettings({ defaultHourlyRate: numRate });
    appState.addToast('Studio preferences saved successfully.', 'success');
  }
</script>

<div class="settings-grid">
  <ThemeSelector />

  <div class="card-surface">
    <div class="card-header">
      <h2 class="card-title">Production Preferences &amp; Rates</h2>
      <p class="card-subtitle">Configure opening workspace views, baseline hourly billing velocity, and timer behavior.</p>
    </div>

    <div class="form-group">
      <label class="form-label" for="default-view-select">Default Project Workspace View</label>
      <div class="view-options-list">
        {#each viewModesList as vm}
          <label class="view-radio-card" class:checked={defaultProjectView === vm.id}>
            <input
              type="radio"
              name="defaultView"
              value={vm.id}
              checked={defaultProjectView === vm.id}
              onchange={() => (defaultProjectView = vm.id)}
            />
            <div class="radio-content">
              <span class="radio-title">{vm.name}</span>
              <span class="radio-desc">{vm.desc}</span>
            </div>
          </label>
        {/each}
      </div>
    </div>

    <div class="form-group" style="max-width: 340px; margin-top: 16px;">
      <label class="form-label" for="rate-input">Baseline Hourly Billing Rate ({settingsStore.settings.currencySymbol || 'RM'} {settingsStore.settings.currency || 'MYR'} / hr)</label>
      <input
        id="rate-input"
        type="number"
        min="10"
        max="1000"
        step="5"
        class="form-input"
        bind:value={hourlyRate}
      />
    </div>

    <div class="form-actions-row" style="margin-top: 20px;">
      <button type="button" class="btn-primary" onclick={handleSavePreferences}>
        Save Preferences
      </button>
    </div>
  </div>

  <KeyboardShortcuts />
</div>

<style>
  .settings-grid { display: flex; flex-direction: column; gap: 24px; }
  .card-surface { background: var(--kanso-surface); border: 1px solid var(--kanso-border); border-radius: 8px; padding: 24px; }
  .card-header { margin-bottom: 20px; }
  .card-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--kanso-text-primary); }
  .card-subtitle { margin: 4px 0 0 0; font-size: 13px; color: var(--kanso-text-muted); }
  .form-group { display: flex; flex-direction: column; gap: 8px; }
  .form-label { font-size: 12px; font-weight: 600; color: var(--kanso-text-muted); }
  .view-options-list { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .view-radio-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); border-radius: 6px; cursor: pointer; transition: all 0.15s ease; }
  .view-radio-card:hover { border-color: var(--kanso-text-muted); }
  .view-radio-card.checked { border-color: var(--kanso-accent); }
  .radio-content { display: flex; flex-direction: column; gap: 2px; }
  .radio-title { font-size: 13px; font-weight: 600; color: var(--kanso-text-primary); }
  .radio-desc { font-size: 12px; color: var(--kanso-text-muted); }
  .form-input { height: 38px; padding: 0 12px; border-radius: 6px; background: var(--kanso-canvas); border: 1px solid var(--kanso-border); color: var(--kanso-text-primary); font-size: 13px; }
  .form-input:focus { outline: none; border-color: var(--kanso-accent); }
  .btn-primary { height: 38px; padding: 0 20px; border-radius: 6px; background: var(--kanso-accent); color: #FFFFFF; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
  .btn-primary:hover { opacity: 0.9; }
  .form-actions-row { display: flex; justify-content: flex-end; }
</style>
