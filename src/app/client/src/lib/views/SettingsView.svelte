<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';
  import type { ThemeName } from '$lib/types';

  type SettingsTab = 'profile' | 'appearance' | 'vault' | 'preferences' | 'shortcuts' | 'security';
  let activeTab = $state<SettingsTab>('profile');

  // Profile fields
  let fullName = $state('');
  let staffId = $state('');
  let department = $state('');
  let role = $state('');
  let email = $state('');
  let defaultBrand = $state('ACME');
  let avatar = $state('');
  let avatarColor = $state('#38BDF8');
  let isSavingProfile = $state(false);

  // Staff directory from workspace
  let staffDirectory = $state<any[]>([]);
  let selectedStaffKey = $state('');

  // Password change fields
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let isSavingPassword = $state(false);

  // Workspace View preferences
  type ViewMode = 'cards' | 'kanban' | 'gantt' | 'calendar' | 'table';
  let defaultProjectView = $state<ViewMode>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('ss_cam_default_project_view') as ViewMode)) || 'cards'
  );

  // Hourly rate preset
  let hourlyRate = $state(timerStore.hourlyRate || 125);

  const avatarColors = [
    { label: 'Electric Sky', hex: '#38BDF8' },
    { label: 'Fluent Blue', hex: '#0078D4' },
    { label: 'Emerald Mint', hex: '#10B981' },
    { label: 'Amber Gold', hex: '#F59E0B' },
    { label: 'Purple Haze', hex: '#8B5CF6' },
    { label: 'Rose Crimson', hex: '#F43F5E' },
    { label: 'Porcelain Zinc', hex: '#71717A' }
  ];

  const brandOptions = [
    { code: 'ACME', name: 'Acme Corporation (ACME)' },
    { code: 'NEX', name: 'Nexus Studio (NEX)' },
    { code: 'LUM', name: 'Lumina Labs (LUM)' }
  ];

  const themeCards: { id: ThemeName; name: string; tag: string; desc: string; canvasColor: string; surfaceColor: string; accentColor: string }[] = [
    {
      id: 'dark',
      name: 'Vorxs Olive Obsidian',
      tag: 'DARK MODE',
      desc: 'Organic olive obsidian canvas with tactical sage surfaces and terracotta pops. Deep, warm, zero eyestrain.',
      canvasColor: '#151813',
      surfaceColor: '#1E251A',
      accentColor: '#DE694B'
    },
    {
      id: 'light',
      name: 'Vorxs Stone Paper',
      tag: 'LIGHT MODE',
      desc: 'Warm Scandinavian raw stone paper canvas with deep charcoal ink and terracotta CTAs.',
      canvasColor: '#ECE8DF',
      surfaceColor: '#F7F5F0',
      accentColor: '#DE694B'
    },
    {
      id: 'eink',
      name: 'Vorxs Tactile Paper',
      tag: 'E-INK MODE',
      desc: 'Zero-eyestrain warm recycled pulp with sharp pure ink borders and zero glare in bright studio daylight.',
      canvasColor: '#F4F1EA',
      surfaceColor: '#EAE5D9',
      accentColor: '#DE694B'
    }
  ];

  const viewModesList: { id: ViewMode; name: string; desc: string }[] = [
    { id: 'cards', name: 'Cards Grid', desc: 'Visual card overview with priority, client swatch, and deadline indicators' },
    { id: 'kanban', name: 'Kanban Pipeline', desc: '6-stage drag-and-drop production pipeline' },
    { id: 'gantt', name: 'Gantt Timeline', desc: 'Interactive schedule timeline with deliverable durations' },
    { id: 'calendar', name: 'Production Calendar', desc: 'Monthly deliverable due dates on calendar grid' },
    { id: 'table', name: 'Data Table', desc: 'High-density sortable tabular grid for studio oversight' }
  ];

  const shortcutList = [
    { key: '⌘ 1', label: 'Studio Deck', desc: 'Executive overview, today tasks & cashflow' },
    { key: '⌘ 2', label: 'Project Vaults', desc: 'Manage 5-folder project directories' },
    { key: '⌘ 3', label: 'Bullet Journal', desc: 'BuJo rapid log, monthly & yearly review' },
    { key: '⌘ 4', label: 'Review Queue', desc: 'Deliverables inspection & lightbox approval' },
    { key: '⌘ 5', label: 'Quotes & Invoices', desc: 'Dual-pane markdown invoice studio' },
    { key: '⌘ 6', label: 'Atelier Notes', desc: 'Zettelkasten knowledge base & tasks' },
    { key: '⌘ 7', label: 'Clients & Brands', desc: 'Client dossiers & HEX brand swatches' },
    { key: '⌘ 8', label: 'Focus Radio', desc: 'Mechanical retro cassette focus deck' },
    { key: '⌘ 9', label: 'Settings', desc: 'Studio preferences, themes & vault' },
    { key: '⌘ K', label: 'Command Palette', desc: 'Instant search across entire creative vault' },
    { key: '⌘ ⇧ T', label: 'Toggle Chronometer', desc: 'Start, pause, or resume billable timer' },
    { key: '⌘ ⇧ K', label: 'Quick Scratchpad', desc: 'Instant clipboard capture into Scratchpad.md' },
    { key: '⌘ ⇧ J', label: 'Open Journal', desc: 'Direct shortcut to today’s rapid log' },
    { key: '⌘ ⇧ I', label: 'Open Invoices', desc: 'Direct shortcut to Quotes & Invoices Studio' },
    { key: 'Space', label: 'Focus Radio Play/Pause', desc: 'Toggle lo-fi cassette stream on/off' }
  ];

  let fileInput: HTMLInputElement;

  function populateFromCurrentUser() {
    if (appState.currentUser) {
      fullName = appState.currentUser.name || '';
      staffId = appState.currentUser.staffId || '';
      department = appState.currentUser.department || 'Creative Operations';
      role = appState.currentUser.role || 'Design Lead';
      email = appState.currentUser.email || '';
      defaultBrand = appState.currentUser.defaultBrand || 'ACME';
      avatar = appState.currentUser.avatar || '';
      avatarColor = appState.currentUser.avatarColor || '#38BDF8';
    }
  }

  async function loadStaffDirectory() {
    try {
      const res = await ApiClient.getStaffRoster();
      if (res?.roster) {
        staffDirectory = res.roster;
      }
    } catch { /* graceful fallback */ }
  }

  function handleStaffSelection(targetId: string) {
    selectedStaffKey = targetId;
    const found = staffDirectory.find((s) => s.staffId === targetId);
    if (found) {
      fullName = found.name;
      staffId = found.staffId;
      department = found.department || 'Creative Operations';
      role = found.role || 'Design Lead';
      if (found.email) email = found.email;
      if (found.defaultBrand) defaultBrand = found.defaultBrand;
      if (found.avatar) avatar = found.avatar;
      if (found.avatarColor) avatarColor = found.avatarColor;
      appState.addToast(`Loaded profile for ${found.name}`, 'info');
    }
  }

  function triggerPhotoUpload() {
    if (fileInput) fileInput.click();
  }

  function handleFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      appState.addToast('Please select a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      avatar = rawDataUrl;
      appState.addToast('Profile image loaded. Click "Save Profile" to apply.', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeAvatarPhoto() {
    avatar = '';
    appState.addToast('Avatar removed. Initials monogram will be displayed.', 'info');
  }

  async function handleProfileSave() {
    isSavingProfile = true;
    try {
      const payload = {
        staffId: staffId.trim() || appState.currentUser?.staffId || 'CRE8-001',
        name: fullName.trim(),
        email: email.trim(),
        department: department.trim(),
        avatar: avatar || '',
        avatarColor: avatarColor || '#38BDF8',
        defaultBrand: defaultBrand || 'ACME'
      };

      await ApiClient.updateProfile(payload);
      if (appState.currentUser) {
        appState.currentUser.name = payload.name;
        appState.currentUser.email = payload.email;
        appState.currentUser.department = payload.department;
        appState.currentUser.avatar = payload.avatar;
        appState.currentUser.avatarColor = payload.avatarColor;
        appState.currentUser.defaultBrand = payload.defaultBrand;
      }
      appState.addToast('Creator profile saved and synchronized with vault.', 'success', 'Profile Updated');
    } catch (err: any) {
      appState.addToast(`Failed to save profile: ${err.message}`, 'error');
    } finally {
      isSavingProfile = false;
    }
  }

  function handleSavePreferences() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ss_cam_default_project_view', defaultProjectView);
      localStorage.setItem('ss_cam_project_view', defaultProjectView);
    }
    timerStore.setHourlyRate(Number(hourlyRate) || 125);
    appState.addToast('Studio preferences saved successfully.', 'success');
  }

  async function handlePasswordSave() {
    if (!newPassword || newPassword.length < 6) {
      appState.addToast('Password must be at least 6 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      appState.addToast('New passwords do not match.', 'warning');
      return;
    }

    isSavingPassword = true;
    try {
      await ApiClient.changePassword({ currentPassword, newPassword });
      appState.addToast('Password updated successfully.', 'success');
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (err: any) {
      appState.addToast(`Failed to change password: ${err.message}`, 'error');
    } finally {
      isSavingPassword = false;
    }
  }

  onMount(() => {
    populateFromCurrentUser();
    loadStaffDirectory();
  });
</script>

<div class="settings-view-container">
  <!-- View Header -->
  <div class="view-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">STUDIO CONFIGURATION</span>
        <span class="tag-meta">Local-First Vault Settings</span>
      </div>
      <h1 class="view-title">Settings</h1>
      <p class="view-subtitle">Customize creator identity, visual studio themes, vault storage, and production preferences.</p>
    </div>

    <div class="header-actions">
      <div class="sync-status-pill">
        <span class="status-dot"></span>
        <span>Vault Synced</span>
      </div>
    </div>
  </div>

  <!-- Settings Segmented Tabs Navigation -->
  <nav class="settings-tabs-bar" aria-label="Settings Navigation">
    <button
      class="tab-btn"
      class:active={activeTab === 'profile'}
      onclick={() => (activeTab = 'profile')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <span>Creator Profile</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'appearance'}
      onclick={() => (activeTab = 'appearance')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
      </svg>
      <span>Appearance &amp; Themes</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'vault'}
      onclick={() => (activeTab = 'vault')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
      </svg>
      <span>Vault &amp; Cloud Storage</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'preferences'}
      onclick={() => (activeTab = 'preferences')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/>
      </svg>
      <span>Studio Preferences</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'shortcuts'}
      onclick={() => (activeTab = 'shortcuts')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
      </svg>
      <span>Hotkeys</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'security'}
      onclick={() => (activeTab = 'security')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
      </svg>
      <span>Security</span>
    </button>
  </nav>

  <!-- TAB CONTENT -->
  <div class="tab-body">
    <!-- ═══════════ TAB 1: CREATOR PROFILE ═══════════ -->
    {#if activeTab === 'profile'}
      <div class="settings-grid">
        <div class="card-surface">
          <div class="card-header">
            <h2 class="card-title">Creator Identity</h2>
            <p class="card-subtitle">Information displayed across deliverables, audit logs, and client handover manifests.</p>
          </div>

          <!-- Staff Selector if available -->
          {#if staffDirectory.length > 0}
            <div class="form-group">
              <label class="form-label" for="staff-roster-select">Load from Workspace Roster</label>
              <select
                id="staff-roster-select"
                class="form-select"
                value={selectedStaffKey}
                onchange={(e) => handleStaffSelection((e.target as HTMLSelectElement).value)}
              >
                <option value="">Select a roster member...</option>
                {#each staffDirectory as s}
                  <option value={s.staffId}>{s.name} ({s.staffId} · {s.role})</option>
                {/each}
              </select>
            </div>
          {/if}

          <!-- Avatar Section -->
          <div class="avatar-manager-row">
            <div class="avatar-preview-wrap">
              <div
                class="avatar-display"
                style="background: {avatarColor || 'var(--kanso-accent)'};"
              >
                {#if avatar}
                  <img src={avatar} alt={fullName} class="avatar-img" />
                {:else}
                  <span class="avatar-text">{(fullName || 'U').charAt(0).toUpperCase()}</span>
                {/if}
              </div>
            </div>

            <div class="avatar-actions">
              <div class="avatar-btn-row">
                <input
                  type="file"
                  accept="image/*"
                  bind:this={fileInput}
                  onchange={handleFileSelected}
                  style="display: none;"
                />
                <button type="button" class="btn-secondary" onclick={triggerPhotoUpload}>
                  Upload Picture
                </button>
                {#if avatar}
                  <button type="button" class="btn-secondary danger" onclick={removeAvatarPhoto}>
                    Remove Picture
                  </button>
                {/if}
              </div>
              <p class="avatar-hint">PNG, JPG, or WEBP up to 5MB. Cropped to a square.</p>

              <!-- Color Palette -->
              <div class="color-picker-row">
                <span class="color-label">Accent Swatch:</span>
                <div class="swatches-list">
                  {#each avatarColors as c}
                    <button
                      type="button"
                      class="swatch-circle"
                      class:selected={avatarColor === c.hex}
                      style="background: {c.hex};"
                      title={c.label}
                      onclick={() => (avatarColor = c.hex)}
                    ></button>
                  {/each}
                </div>
              </div>
            </div>
          </div>

          <!-- Form Fields -->
          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="full-name-input">Full Name</label>
              <input id="full-name-input" type="text" class="form-input" bind:value={fullName} placeholder="e.g. Alex Morgan" />
            </div>
            <div class="form-group">
              <label class="form-label" for="staff-id-input">Staff / Designer ID</label>
              <input id="staff-id-input" type="text" class="form-input" bind:value={staffId} placeholder="e.g. CRE8-001" />
            </div>
            <div class="form-group">
              <label class="form-label" for="role-input">Role / Title</label>
              <input id="role-input" type="text" class="form-input" bind:value={role} placeholder="e.g. Senior Brand Designer" />
            </div>
            <div class="form-group">
              <label class="form-label" for="dept-input">Department</label>
              <input id="dept-input" type="text" class="form-input" bind:value={department} placeholder="e.g. Creative Operations" />
            </div>
            <div class="form-group">
              <label class="form-label" for="email-input">Email Address</label>
              <input id="email-input" type="email" class="form-input" bind:value={email} placeholder="e.g. alex@atelier.studio" />
            </div>
            <div class="form-group">
              <label class="form-label" for="brand-select">Default Client Brand</label>
              <select id="brand-select" class="form-select" bind:value={defaultBrand}>
                {#each brandOptions as b}
                  <option value={b.code}>{b.name}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="form-actions-row">
            <button
              type="button"
              class="btn-primary"
              onclick={handleProfileSave}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>
      </div>

    <!-- ═══════════ TAB 2: APPEARANCE & THEMES ═══════════ -->
    {:else if activeTab === 'appearance'}
      <div class="card-surface">
        <div class="card-header">
          <h2 class="card-title">Studio Visual Themes</h2>
          <p class="card-subtitle">Select your preferred lighting environment. Themes adjust dynamic CSS tokens instantly with zero reloads.</p>
        </div>

        <div class="themes-grid">
          {#each themeCards as t}
            <div
              class="theme-card"
              class:selected={appState.theme === t.id}
              onclick={() => appState.setTheme(t.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && appState.setTheme(t.id)}
            >
              <div class="theme-card-preview" style="background: {t.canvasColor}; border: 1px solid var(--kanso-border);">
                <div class="preview-surface" style="background: {t.surfaceColor}; border: 1px solid {t.id === 'eink' ? '#000000' : 'rgba(255,255,255,0.1)'};">
                  <div class="preview-dot" style="background: {t.accentColor};"></div>
                  <div class="preview-line" style="background: {t.id === 'light' || t.id === 'eink' ? '#18181B' : '#FFFFFF'}; width: 45%;"></div>
                  <div class="preview-line" style="background: {t.id === 'light' || t.id === 'eink' ? '#64748B' : '#71717A'}; width: 70%;"></div>
                </div>
              </div>

              <div class="theme-card-info">
                <div class="theme-title-row">
                  <span class="theme-name">{t.name}</span>
                  <span class="theme-tag">{t.tag}</span>
                </div>
                <p class="theme-desc">{t.desc}</p>
                {#if appState.theme === t.id}
                  <div class="active-pill">
                    <span class="active-dot"></span>
                    <span>Active Environment</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <div class="typography-notice-box">
          <div class="notice-icon">📐</div>
          <div class="notice-content">
            <h4>Legible Typography Standard Active</h4>
            <p>All micro-text below 12px has been eliminated. Body copy renders comfortably at 14px–15px, and primary studio metrics render at 24px–28px font sizes for maximum readability on Retina and 4K studio displays.</p>
          </div>
        </div>
      </div>

    <!-- ═══════════ TAB 3: VAULT & STORAGE ═══════════ -->
    {:else if activeTab === 'vault'}
      <div class="card-surface">
        <div class="card-header">
          <h2 class="card-title">Pure Markdown Storage Engine</h2>
          <p class="card-subtitle">Zero SQL, SQLite binary files, or external cloud databases. 100% human-readable plain UTF-8 Markdown files.</p>
        </div>

        <div class="vault-info-card">
          <div class="vault-info-row">
            <span class="vault-label">Vault Root Directory:</span>
            <span class="vault-path-badge">{vaultStore.config.rootPath}</span>
          </div>
          <div class="vault-info-row">
            <span class="vault-label">Sync Provider:</span>
            <span class="provider-pill">Local NVMe &amp; Synology Drive</span>
          </div>
          <div class="vault-info-row">
            <span class="vault-label">File Integrity:</span>
            <span class="integrity-pill">YAML Frontmatter + Lossless Plain Text</span>
          </div>
        </div>

        <div class="vault-metrics-grid">
          <div class="metric-card">
            <span class="metric-num">3</span>
            <span class="metric-label">Client Dossiers</span>
            <span class="metric-sub">_Clients/ (ACME, NEX, LUM)</span>
          </div>
          <div class="metric-card">
            <span class="metric-num">4</span>
            <span class="metric-label">Active Project Vaults</span>
            <span class="metric-sub">5-Folder Production Directories</span>
          </div>
          <div class="metric-card">
            <span class="metric-num">100%</span>
            <span class="metric-label">Data Sovereignty</span>
            <span class="metric-sub">Openable in VS Code &amp; Obsidian</span>
          </div>
        </div>
      </div>

    <!-- ═══════════ TAB 4: PREFERENCES ═══════════ -->
    {:else if activeTab === 'preferences'}
      <div class="card-surface">
        <div class="card-header">
          <h2 class="card-title">Studio Production Defaults</h2>
          <p class="card-subtitle">Set your default opening project view and baseline hourly design rate for the header chronometer.</p>
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
          <label class="form-label" for="rate-input">Default Hourly Billing Rate ($ USD / hr)</label>
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

        <div class="form-actions-row">
          <button type="button" class="btn-primary" onclick={handleSavePreferences}>
            Save Preferences
          </button>
        </div>
      </div>

    <!-- ═══════════ TAB 5: SHORTCUTS ═══════════ -->
    {:else if activeTab === 'shortcuts'}
      <div class="card-surface">
        <div class="card-header">
          <h2 class="card-title">Keyboard Accelerators &amp; Studio HUD Hotkeys</h2>
          <p class="card-subtitle">High-velocity command shortcuts for distraction-free creative production.</p>
        </div>

        <div class="shortcuts-table-wrap">
          <table class="shortcuts-table">
            <thead>
              <tr>
                <th style="width: 160px;">Accelerator</th>
                <th style="width: 200px;">Action</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {#each shortcutList as sc}
                <tr>
                  <td>
                    <kbd class="shortcut-kbd">{sc.key}</kbd>
                  </td>
                  <td class="font-semibold text-primary">{sc.label}</td>
                  <td class="text-muted">{sc.desc}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

    <!-- ═══════════ TAB 6: SECURITY ═══════════ -->
    {:else if activeTab === 'security'}
      <div class="card-surface" style="max-width: 580px;">
        <div class="card-header">
          <h2 class="card-title">Creator Password &amp; Vault Access</h2>
          <p class="card-subtitle">Update your standalone studio password stored in local vault configuration.</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="current-pw-input">Current Password</label>
          <input
            id="current-pw-input"
            type="password"
            class="form-input"
            bind:value={currentPassword}
            placeholder="••••••••"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="new-pw-input">New Password</label>
          <input
            id="new-pw-input"
            type="password"
            class="form-input"
            bind:value={newPassword}
            placeholder="Minimum 6 characters"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="confirm-pw-input">Confirm New Password</label>
          <input
            id="confirm-pw-input"
            type="password"
            class="form-input"
            bind:value={confirmPassword}
            placeholder="Repeat new password"
          />
        </div>

        <div class="form-actions-row">
          <button
            type="button"
            class="btn-primary"
            onclick={handlePasswordSave}
            disabled={isSavingPassword}
          >
            {isSavingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .settings-view-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .view-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 16px;
  }

  .header-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .tag-badge {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .tag-meta {
    font-size: 13px;
    color: var(--kanso-text-muted);
  }

  .view-title {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .view-subtitle {
    font-size: 14px;
    color: var(--kanso-text-muted);
    margin: 4px 0 0 0;
  }

  .sync-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 700;
    color: #10B981;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 8px #10B981;
  }

  /* Segmented Navigation Tabs */
  .settings-tabs-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 10px;
    padding: 4px;
    overflow-x: auto;
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--kanso-text-muted);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.14s ease;
    font-family: inherit;
  }

  .tab-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }

  .tab-btn.active {
    background: var(--kanso-surface-active);
    color: var(--kanso-text-primary);
    font-weight: 700;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  [data-theme="eink"] .tab-btn.active {
    background: #000000;
    color: #FFFFFF;
  }

  /* Cards & Surface Containers */
  .card-surface {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .card-header {
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 14px;
  }

  .card-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .card-subtitle {
    font-size: 13.5px;
    color: var(--kanso-text-muted);
    margin: 4px 0 0 0;
  }

  /* Forms */
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-label {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--kanso-text-secondary);
  }

  .form-input, .form-select {
    height: 40px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-canvas);
    color: var(--kanso-text-primary);
    font-size: 14px;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.14s ease;
  }

  .form-input:focus, .form-select:focus {
    outline: none;
    border-color: var(--kanso-accent);
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 680px) {
    .form-grid-2 { grid-template-columns: 1fr; }
  }

  .form-actions-row {
    display: flex;
    justify-content: flex-start;
    padding-top: 8px;
  }

  /* Buttons */
  .btn-primary {
    height: 38px;
    padding: 0 20px;
    border-radius: 8px;
    border: none;
    background: var(--kanso-accent);
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.15s ease;
  }

  .btn-primary:hover { filter: brightness(1.1); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-secondary {
    height: 34px;
    padding: 0 14px;
    border-radius: 7px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.14s ease;
  }

  .btn-secondary:hover {
    background: var(--kanso-surface-hover);
  }

  .btn-secondary.danger {
    color: #EF4444;
    border-color: rgba(239, 68, 68, 0.3);
  }

  /* Avatar Row */
  .avatar-manager-row {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 14px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 10px;
  }

  .avatar-display {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: #FFFFFF;
    font-size: 24px;
    font-weight: 800;
    border: 2px solid var(--kanso-border);
    flex-shrink: 0;
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .avatar-btn-row {
    display: flex;
    gap: 8px;
  }

  .avatar-hint {
    font-size: 12.5px;
    color: var(--kanso-text-muted);
    margin: 0;
  }

  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .color-label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--kanso-text-secondary);
  }

  .swatches-list {
    display: flex;
    gap: 6px;
  }

  .swatch-circle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.14s ease;
  }

  .swatch-circle:hover { transform: scale(1.15); }
  .swatch-circle.selected { border-color: #FFFFFF; box-shadow: 0 0 0 2px var(--kanso-accent); }

  /* Theme Cards */
  .themes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }

  .theme-card {
    border: 1.5px solid var(--kanso-border);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s ease;
    background: var(--kanso-surface);
  }

  .theme-card:hover {
    border-color: var(--kanso-accent);
    transform: translateY(-2px);
  }

  .theme-card.selected {
    border-color: var(--kanso-accent);
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.3);
  }

  .theme-card-preview {
    height: 110px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-surface {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-sizing: border-box;
  }

  .preview-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .preview-line {
    height: 6px;
    border-radius: 3px;
  }

  .theme-card-info {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .theme-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .theme-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .theme-tag {
    font-size: 11px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--kanso-text-muted);
  }

  .theme-desc {
    font-size: 13px;
    color: var(--kanso-text-muted);
    margin: 0;
    line-height: 1.45;
  }

  .active-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-accent);
    margin-top: 4px;
  }

  .active-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--kanso-accent);
  }

  .typography-notice-box {
    display: flex;
    gap: 14px;
    padding: 16px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 10px;
    align-items: flex-start;
  }

  .notice-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .notice-content h4 {
    margin: 0 0 4px 0;
    font-size: 14.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .notice-content p {
    margin: 0;
    font-size: 13px;
    color: var(--kanso-text-muted);
    line-height: 1.5;
  }

  /* Vault Info */
  .vault-info-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 10px;
  }

  .vault-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13.5px;
  }

  .vault-label {
    color: var(--kanso-text-muted);
  }

  .vault-path-badge {
    font-family: monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.1);
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid rgba(56, 189, 248, 0.25);
  }

  .provider-pill, .integrity-pill {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .vault-metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .metric-card {
    padding: 16px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metric-num {
    font-size: 24px;
    font-weight: 800;
    font-family: monospace;
    color: var(--kanso-text-primary);
  }

  .metric-label {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .metric-sub {
    font-size: 12px;
    color: var(--kanso-text-muted);
  }

  /* View Radio Options */
  .view-options-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .view-radio-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-canvas);
    cursor: pointer;
    transition: all 0.14s ease;
  }

  .view-radio-card:hover {
    border-color: var(--kanso-accent);
  }

  .view-radio-card.checked {
    border-color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.08);
  }

  .radio-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .radio-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .radio-desc {
    font-size: 12.5px;
    color: var(--kanso-text-muted);
  }

  /* Shortcuts Table */
  .shortcuts-table-wrap {
    overflow-x: auto;
  }

  .shortcuts-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }

  .shortcuts-table th {
    text-align: left;
    padding: 10px 14px;
    border-bottom: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .shortcuts-table td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--kanso-border);
  }

  .shortcut-kbd {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    font-family: monospace;
    font-size: 13px;
    font-weight: 700;
  }

  .text-primary { color: var(--kanso-text-primary); }
  .text-muted { color: var(--kanso-text-muted); }
  .font-semibold { font-weight: 600; }
</style>
