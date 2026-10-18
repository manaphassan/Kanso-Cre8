<script lang="ts">
  import Studio from '$lib/components/settings/Studio.svelte';
  import Preferences from '$lib/components/settings/Preferences.svelte';
  import Vault from '$lib/components/settings/Vault.svelte';
  import About from '$lib/components/settings/About.svelte';

  type SettingsTab = 'studio' | 'preferences' | 'vault' | 'about';
  let activeTab = $state<SettingsTab>('studio');
</script>

<div class="settings-view-container">
  <div class="view-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Settings/</span>
        <span class="tag-meta">Atelier Environment &amp; Storage · Zero SQL</span>
      </div>
      <h1 class="view-title">Studio Settings</h1>
      <p class="view-subtitle">Precision controls for designer identity, visual themes, vault storage, and studio preferences.</p>
    </div>

    <div class="header-actions">
      <div class="sync-status-pill">
        <span class="status-dot"></span>
        <span>Vault Synced · Zero SQL</span>
      </div>
    </div>
  </div>

  <nav class="settings-tabs-bar" aria-label="Settings Navigation">
    <button
      class="tab-btn"
      class:active={activeTab === 'studio'}
      onclick={() => (activeTab = 'studio')}
    >
      <span>Studio &amp; Brand Profile</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'preferences'}
      onclick={() => (activeTab = 'preferences')}
    >
      <span>Themes &amp; Preferences</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'vault'}
      onclick={() => (activeTab = 'vault')}
    >
      <span>Vault &amp; Storage</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'about'}
      onclick={() => (activeTab = 'about')}
    >
      <span>About &amp; License</span>
    </button>
  </nav>

  <div class="tab-body">
    {#if activeTab === 'studio'}
      <Studio />
    {:else if activeTab === 'preferences'}
      <Preferences />
    {:else if activeTab === 'vault'}
      <Vault />
    {:else if activeTab === 'about'}
      <About />
    {/if}
  </div>
</div>

<style>
  .settings-view-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-titles {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .header-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .tag-badge {
    font-weight: 700;
    color: var(--kanso-accent);
    font-family: monospace;
  }
  .tag-meta {
    color: var(--kanso-text-muted);
  }
  .view-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }
  .view-subtitle {
    margin: 0;
    font-size: 13px;
    color: var(--kanso-text-muted);
  }
  .sync-status-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 20px;
    font-size: 12px;
    color: var(--kanso-text-muted);
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kanso-success);
  }
  .settings-tabs-bar {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 8px;
  }
  .tab-btn {
    padding: 8px 16px;
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--kanso-text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .tab-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }
  .tab-btn.active {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface);
    border-color: var(--kanso-border);
  }
  .tab-body {
    margin-top: 8px;
  }
</style>
