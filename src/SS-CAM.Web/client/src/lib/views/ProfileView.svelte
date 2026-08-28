<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { ThemeName } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentInput from '$lib/components/ui/FluentInput.svelte';

  let currentPassword = $state<string>('');
  let newPassword = $state<string>('');
  let confirmPassword = $state<string>('');
  let isSavingPassword = $state<boolean>(false);

  const themes: { id: ThemeName; name: string; desc: string; preview: string }[] = [
    { id: 'falconia', name: 'Falconia (Light)', desc: 'Official SuamiSihat Clinical Blue Light Theme (60:30:10 Default)', preview: '#F3F4F6' },
    { id: 'metamorphosis', name: 'Metamorphosis (Dark Glass)', desc: 'Midnight Deep Navy with Electric Cyan Accents', preview: '#080D1F' },
    { id: 'catppuccin', name: 'Catppuccin (Mocha Dark)', desc: 'Soothing Mocha Dark Palette with Mauve Accents', preview: '#1E1E2E' }
  ];

  type ViewMode = 'cards' | 'kanban' | 'gantt' | 'calendar' | 'table';
  let defaultProjectView = $state<ViewMode>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('ss_cam_default_project_view') as ViewMode)) || 'cards'
  );

  const viewModesList: { id: ViewMode; name: string; desc: string; icon: string }[] = [
    { id: 'cards', name: 'Cards Grid', desc: 'Visual card overview with priority & deadline indicators', icon: '📋' },
    { id: 'kanban', name: 'Kanban Board', desc: '5-column drag-and-drop production pipeline', icon: '📊' },
    { id: 'gantt', name: 'Gantt Timeline', desc: 'Interactive schedule timeline with start & due duration bars', icon: '📈' },
    { id: 'calendar', name: 'Production Calendar', desc: 'Monthly deliverable due dates on calendar days', icon: '📅' },
    { id: 'table', name: 'Data Table', desc: 'High-density sortable tabular grid for studio oversight', icon: '📑' }
  ];

  function setDefaultProjectView(mode: ViewMode) {
    defaultProjectView = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ss_cam_default_project_view', mode);
      localStorage.setItem('ss_cam_project_view', mode);
    }
    appState.addToast(`Default Project Manager view set to ${mode.toUpperCase()}`, 'success');
  }

  async function handlePasswordChange() {
    if (!newPassword || newPassword !== confirmPassword) {
      appState.addToast('Passwords do not match or are empty', 'error');
      return;
    }

    isSavingPassword = true;
    try {
      await ApiClient.changePassword(currentPassword, newPassword);
      appState.addToast('Password updated successfully on Synology NAS', 'success');
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (err: any) {
      appState.addToast(`Failed to update password: ${err.message}`, 'error');
    } finally {
      isSavingPassword = false;
    }
  }
</script>

<div class="profile-view-container">
  <div class="view-header">
    <div>
      <h1 class="view-title">User Profile & Preferences</h1>
      <p class="view-subtitle">Manage personal workspace defaults, visual Fluent 2 themes, and account security</p>
    </div>
  </div>

  <div class="profile-grid">
    <!-- Project Manager Default View Selector -->
    <FluentCard elevated>
      <h3>Project Manager Default View</h3>
      <p style="margin-bottom: 14px;">Select which workspace layout opens automatically when navigating to Project Manager.</p>

      <div class="theme-options">
        {#each viewModesList as v}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="theme-card"
            class:active={defaultProjectView === v.id}
            onclick={() => setDefaultProjectView(v.id)}
          >
            <div class="view-mode-icon-swatch">{v.icon}</div>
            <div class="theme-info">
              <div class="theme-name">{v.name}</div>
              <div class="theme-desc">{v.desc}</div>
            </div>
            {#if defaultProjectView === v.id}
              <span class="active-tag">Default</span>
            {/if}
          </div>
        {/each}
      </div>
    </FluentCard>

    <!-- Theme Selector Card -->
    <FluentCard elevated>
      <h3>Fluent 2 Visual Theme Profile</h3>
      <p style="margin-bottom: 14px;">Select the visual hierarchy and color mode for this browser session.</p>

      <div class="theme-options">
        {#each themes as t}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="theme-card"
            class:active={appState.theme === t.id}
            onclick={() => appState.setTheme(t.id)}
          >
            <div class="theme-swatch" style="background: {t.preview};"></div>
            <div class="theme-info">
              <div class="theme-name">{t.name}</div>
              <div class="theme-desc">{t.desc}</div>
            </div>
            {#if appState.theme === t.id}
              <span class="active-tag">Active</span>
            {/if}
          </div>
        {/each}
      </div>
    </FluentCard>

    <!-- Account Details & Password Change -->
    <FluentCard elevated>
      <h3>Account Security & Password</h3>
      <p style="margin-bottom: 14px;">Logged in as <b>{appState.currentUser?.name || 'User'}</b> ({appState.currentUser?.role || ''})</p>

      <div class="password-form">
        <FluentInput
          type="password"
          label="Current Password"
          bind:value={currentPassword}
          placeholder="Enter current password"
        />
        <FluentInput
          type="password"
          label="New Password"
          bind:value={newPassword}
          placeholder="Enter new password"
        />
        <FluentInput
          type="password"
          label="Confirm New Password"
          bind:value={confirmPassword}
          placeholder="Repeat new password"
        />

        <div class="form-actions">
          <FluentButton
            appearance="primary"
            loading={isSavingPassword}
            onclick={handlePasswordChange}
          >
            Update Password
          </FluentButton>
          <FluentButton
            appearance="danger"
            onclick={() => appState.logout()}
          >
            Sign Out
          </FluentButton>
        </div>
      </div>
    </FluentCard>
  </div>
</div>

<style>
  .profile-view-container {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .view-header { margin-bottom: 4px; }
  .view-title { font-size: 24px; font-weight: 800; color: var(--text-primary); }
  .view-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .theme-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .theme-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .theme-card:hover {
    border-color: var(--brand-accent);
  }

  .theme-card.active {
    border-color: var(--brand-accent);
    background: var(--brand-tint);
  }

  .theme-swatch {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }

  .view-mode-icon-swatch {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
  }

  .theme-info {
    flex: 1;
  }

  .theme-name {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .theme-desc {
    font-size: 11.5px;
    color: var(--text-secondary);
  }

  .active-tag {
    font-size: 11px;
    font-weight: 800;
    color: var(--brand-accent);
    text-transform: uppercase;
  }

  .password-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
  }

  .form-actions {
    display: flex;
    gap: 10px;
    margin-top: 6px;
  }

  @media (max-width: 900px) {
    .profile-grid { grid-template-columns: 1fr; }
  }
</style>
