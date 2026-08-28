<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { ThemeName, User } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentInput from '$lib/components/ui/FluentInput.svelte';

  // Profile fields
  let fullName = $state<string>('');
  let staffId = $state<string>('');
  let department = $state<string>('');
  let role = $state<string>('');
  let email = $state<string>('');
  let defaultBrand = $state<string>('SS');
  let avatar = $state<string>('');
  let avatarColor = $state<string>('#0078D4');
  let isSavingProfile = $state<boolean>(false);

  // Staff directory list from Synology NAS
  let staffDirectory = $state<Array<{
    staffId: string;
    username: string;
    name: string;
    role: string;
    department?: string;
    email?: string;
    avatar?: string;
    avatarColor?: string;
    defaultBrand?: string;
  }>>([]);
  let selectedStaffKey = $state<string>('');

  // Password change fields
  let currentPassword = $state<string>('');
  let newPassword = $state<string>('');
  let confirmPassword = $state<string>('');
  let isSavingPassword = $state<boolean>(false);

  // Avatar presets
  const avatarColors = [
    { label: 'Brand Blue', hex: '#0078D4' },
    { label: 'Deep Cyan', hex: '#21A1F7' },
    { label: 'Royal Navy', hex: '#106EBE' },
    { label: 'Electric Purple', hex: '#7C3AED' },
    { label: 'Amber Orange', hex: '#D97706' },
    { label: 'Emerald Green', hex: '#059669' },
    { label: 'Ruby Rose', hex: '#E11D48' },
    { label: 'Slate Gray', hex: '#4B5563' }
  ];

  let brands = $state<Array<{ code: string; name: string }>>([]);

  async function loadBrands() {
    try {
      const res = await ApiClient.getCompanies();
      if (res && res.companies && res.companies.length > 0) {
        brands = res.companies
          .filter(c => c.status !== 'inactive')
          .map(c => ({
            code: c.code,
            name: `${c.name} (${c.code})`
          }));
      }
    } catch (e) {
      console.warn('[ProfileView] loadBrands error:', e);
      if (brands.length === 0) {
        brands = [
          { code: 'SS', name: 'SuamiSihat Core (SS)' },
          { code: 'SSH', name: 'SuamiSihat Holding (SSH)' },
          { code: 'SSC', name: 'SuamiSihat Healthcare (SSC)' },
          { code: 'SSW', name: 'SuamiSihat Wellness (SSW)' },
          { code: 'SSE', name: 'SuamiSihat Ecommerce (SSE)' },
          { code: 'SST', name: 'SuamiSihat Technology (SST)' }
        ];
      }
    }
  }

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
    { id: 'kanban', name: 'Kanban Board', desc: '6-column drag-and-drop production pipeline', icon: '📊' },
    { id: 'gantt', name: 'Gantt Timeline', desc: 'Interactive schedule timeline with start & due duration bars', icon: '📈' },
    { id: 'calendar', name: 'Production Calendar', desc: 'Monthly deliverable due dates on calendar days', icon: '📅' },
    { id: 'table', name: 'Data Table', desc: 'High-density sortable tabular grid for studio oversight', icon: '📑' }
  ];

  onMount(async () => {
    populateFromCurrentUser();
    await Promise.all([loadStaffDirectory(), loadBrands()]);

    const handleCompanyUpdate = () => loadBrands();
    window.addEventListener('company:updated', handleCompanyUpdate);

    return () => {
      window.removeEventListener('company:updated', handleCompanyUpdate);
    };
  });

  function populateFromCurrentUser() {
    if (appState.currentUser) {
      fullName = appState.currentUser.name || '';
      staffId = appState.currentUser.staffId || '';
      department = appState.currentUser.department || 'Creative Production';
      role = appState.currentUser.role || 'Designer';
      email = appState.currentUser.email || '';
      defaultBrand = appState.currentUser.defaultBrand || 'SS';
      avatar = appState.currentUser.avatar || (typeof localStorage !== 'undefined' ? (localStorage.getItem(`ss_cam_avatar_${staffId}`) || localStorage.getItem('ss_cam_user_avatar') || '') : '');
      avatarColor = appState.currentUser.avatarColor || '#0078D4';
    }
  }

  async function loadStaffDirectory() {
    try {
      const res = await ApiClient.getStaffRoster();
      if (res && res.roster) {
        staffDirectory = res.roster;
        if (staffId) {
          const matched = staffDirectory.find(s => s.staffId.toLowerCase() === staffId.toLowerCase());
          if (matched) {
            selectedStaffKey = matched.staffId;
          }
        }
      }
    } catch (e) {
      console.warn('[ProfileView] loadStaffDirectory error:', e);
    }
  }

  function handleStaffSelection(targetId: string) {
    selectedStaffKey = targetId;
    const found = staffDirectory.find(s => s.staffId === targetId);
    if (found) {
      fullName = found.name;
      staffId = found.staffId;
      department = found.department || 'Creative Production';
      role = found.role || 'Designer';
      if (found.email) email = found.email;
      if (found.defaultBrand) defaultBrand = found.defaultBrand;
      if (found.avatar) avatar = found.avatar;
      if (found.avatarColor) avatarColor = found.avatarColor;
      appState.addToast(`Loaded profile fields for ${found.name}`, 'info');
    }
  }

  // Handle Photo File Upload
  let fileInput: HTMLInputElement;

  function triggerPhotoUpload() {
    if (fileInput) fileInput.click();
  }

  function handleFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      appState.addToast('Please select a valid image file (PNG, JPG, WEBP, GIF).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      appState.addToast('Image size exceeds 5MB limit. Please choose a smaller file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      // Resize image via canvas to keep avatar compact
      resizeImage(rawDataUrl, 256, 256, (optimizedUrl) => {
        avatar = optimizedUrl;
        appState.addToast('Profile image loaded. Click "Save Profile" to apply changes.', 'success');
      });
    };
    reader.readAsDataURL(file);
  }

  function resizeImage(dataUrl: string, maxWidth: number, maxHeight: number, callback: (result: string) => void) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Crop to square from center
      const minDim = Math.min(width, height);
      const startX = (width - minDim) / 2;
      const startY = (height - minDim) / 2;

      canvas.width = maxWidth;
      canvas.height = maxHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxWidth, maxHeight);
        callback(canvas.toDataURL('image/jpeg', 0.88));
      } else {
        callback(dataUrl);
      }
    };
    img.src = dataUrl;
  }

  function removeAvatarPhoto() {
    avatar = '';
    appState.addToast('Profile photo removed. Standard initials will be displayed.', 'info');
  }

  async function handleProfileSave() {
    isSavingProfile = true;
    try {
      const targetStaffId = staffId.trim() || appState.currentUser?.staffId || 'SS0004';
      const savePayload = {
        staffId: targetStaffId,
        name: fullName.trim(),
        email: email.trim(),
        department: department.trim(),
        avatar: avatar || '',
        avatarColor: avatarColor || '#0078D4',
        defaultBrand: defaultBrand || 'SS'
      };

      const res = await ApiClient.updateProfile(savePayload);

      // Persist to local storage cache immediately for instant recovery
      if (typeof localStorage !== 'undefined') {
        if (avatar) {
          localStorage.setItem(`ss_cam_avatar_${targetStaffId}`, avatar);
          localStorage.setItem('ss_cam_user_avatar', avatar);
        } else {
          localStorage.removeItem(`ss_cam_avatar_${targetStaffId}`);
          localStorage.removeItem('ss_cam_user_avatar');
        }
      }

      if (appState.currentUser) {
        appState.currentUser = {
          ...appState.currentUser,
          name: fullName.trim(),
          email: email.trim(),
          department: department.trim(),
          avatar: avatar || '',
          avatarColor: avatarColor || '#0078D4',
          defaultBrand: defaultBrand || 'SS',
          ...(res && res.user ? res.user : {})
        };
      }

      appState.addToast('Designer profile and avatar photo saved and synchronized with Synology NAS.', 'success', 'Profile Updated');
    } catch (err: any) {
      appState.addToast(`Failed to save profile: ${err.message}`, 'error');
    } finally {
      isSavingProfile = false;
    }
  }

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

  const userInitial = $derived((fullName || appState.currentUser?.name || 'U').charAt(0).toUpperCase());
</script>

<div class="profile-view-container">
  <!-- Page Header -->
  <div class="view-header">
    <div class="header-titles">
      <h1 class="view-title">User Profile &amp; Preferences</h1>
      <p class="view-subtitle">Customize visual themes, workstation preferences, Synology NAS sync paths, and designer identity.</p>
    </div>
  </div>

  <div class="profile-grid">
    <!-- ═══════════ LEFT COLUMN: PROFILE IDENTITY & SECURITY ═══════════ -->
    <div class="profile-col">
      <!-- Designer Profile Card -->
      <FluentCard elevated padding="20px">
        <div class="card-section-header">
          <div class="section-icon-badge">👤</div>
          <div>
            <h3 class="card-title">Designer Profile</h3>
            <p class="card-desc">Your identity across SS-CAM Web Portal &amp; Desktop App</p>
          </div>
        </div>

        <!-- Avatar Hero Showcase Box -->
        <div class="avatar-hero-box">
          <div class="avatar-container" style="background: {avatarColor};">
            {#if avatar}
              <img src={avatar} alt={fullName} class="avatar-img-preview" />
            {:else}
              <span class="avatar-initial-text">{userInitial}</span>
            {/if}

            <!-- Camera overlay button -->
            <button
              type="button"
              class="camera-btn"
              onclick={triggerPhotoUpload}
              title="Upload / Change Profile Picture"
            >
              📷
            </button>
            <input
              type="file"
              bind:this={fileInput}
              onchange={handleFileSelected}
              accept="image/png,image/jpeg,image/webp,image/gif"
              style="display: none;"
            />
          </div>

          <div class="avatar-hero-info">
            <h2 class="hero-name">{fullName || 'Designer Name'}</h2>
            <div class="hero-meta">{department || 'Creative Production'} · {role || 'Designer'}</div>
            <div class="hero-staff-chip">
              <span class="staff-id-tag">Staff ID: {staffId || 'SS0004'}</span>
              {#if avatar}
                <button type="button" class="remove-photo-btn" onclick={removeAvatarPhoto} title="Remove Custom Picture">
                  Remove Photo
                </button>
              {/if}
            </div>
          </div>
        </div>

        <!-- Avatar Theme Color Swatches -->
        <div class="form-row" style="margin-top: 14px;">
          <label class="field-label">Avatar Accent Color</label>
          <div class="color-swatches-row">
            {#each avatarColors as c}
              <button
                type="button"
                class="swatch-btn"
                class:active={avatarColor === c.hex}
                style="background: {c.hex};"
                title={c.label}
                onclick={() => (avatarColor = c.hex)}
              >
                {#if avatarColor === c.hex}
                  <span class="swatch-check">✓</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <div class="divider-line"></div>

        <!-- NAS Directory Selector -->
        {#if staffDirectory.length > 0}
          <div class="form-row">
            <label class="field-label" for="staff-dir-select">Select Staff Identity (Synology NAS Directory)</label>
            <select
              id="staff-dir-select"
              class="fluent-select"
              value={selectedStaffKey}
              onchange={(e) => handleStaffSelection((e.target as HTMLSelectElement).value)}
            >
              <option value="">-- Choose from Staff Directory --</option>
              {#each staffDirectory as s}
                <option value={s.staffId}>
                  {s.staffId} - {s.name} ({s.role || 'Designer'})
                </option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Profile Form Inputs -->
        <div class="form-grid-2x2">
          <FluentInput
            label="Full Name"
            bind:value={fullName}
            placeholder="e.g. Harussani"
          />

          <FluentInput
            label="Staff ID"
            bind:value={staffId}
            placeholder="e.g. SS0004"
            disabled
          />
        </div>

        <div class="form-grid-2x2">
          <FluentInput
            label="Department / Role"
            bind:value={department}
            placeholder="e.g. Creative Production"
          />

          <FluentInput
            label="Email Address"
            type="email"
            bind:value={email}
            placeholder="e.g. name.suamisihat@gmail.com"
          />
        </div>

        <div class="form-row">
          <label class="field-label" for="default-brand-select">Default Operating Brand</label>
          <select
            id="default-brand-select"
            class="fluent-select"
            bind:value={defaultBrand}
          >
            {#each brands as b}
              <option value={b.code}>{b.name}</option>
            {/each}
          </select>
        </div>

        <div class="profile-action-row">
          <FluentButton
            appearance="primary"
            loading={isSavingProfile}
            onclick={handleProfileSave}
          >
            💾 Save Profile
          </FluentButton>
        </div>
      </FluentCard>

      <!-- Account Security & Password Card -->
      <FluentCard elevated padding="20px">
        <div class="card-section-header">
          <div class="section-icon-badge">🔒</div>
          <div>
            <h3 class="card-title">Account Security &amp; Password</h3>
            <p class="card-desc">Logged in as <b>{appState.currentUser?.name || 'User'}</b> ({appState.currentUser?.role || ''})</p>
          </div>
        </div>

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

    <!-- ═══════════ RIGHT COLUMN: THEMES & WORKSPACE DEFAULTS ═══════════ -->
    <div class="profile-col">
      <!-- Theme Selector Card -->
      <FluentCard elevated padding="20px">
        <div class="card-section-header">
          <div class="section-icon-badge">🎨</div>
          <div>
            <h3 class="card-title">Fluent 2 Visual Theme Profile</h3>
            <p class="card-desc">Select the visual hierarchy and color mode for this browser session.</p>
          </div>
        </div>

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

      <!-- Project Manager Default View Selector -->
      <FluentCard elevated padding="20px">
        <div class="card-section-header">
          <div class="section-icon-badge">📋</div>
          <div>
            <h3 class="card-title">Project Manager Default View</h3>
            <p class="card-desc">Select which workspace layout opens automatically when navigating to Project Manager.</p>
          </div>
        </div>

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
    </div>
  </div>
</div>

<style>
  .profile-view-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-bottom: 30px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .view-header { margin-bottom: 4px; }
  .view-title { font-size: 26px; font-weight: 800; color: var(--text-primary); }
  .view-subtitle { font-size: 13.5px; color: var(--text-secondary); margin-top: 4px; }

  .profile-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.95fr);
    gap: 24px;
    align-items: start;
    width: 100%;
    box-sizing: border-box;
  }

  .profile-col {
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-width: 0;
    width: 100%;
  }

  /* Card Section Headers */
  .card-section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .section-icon-badge {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--brand-tint, rgba(0, 120, 212, 0.08));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .card-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .card-desc {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 2px 0 0 0;
  }

  /* Avatar Hero Showcase Box */
  .avatar-hero-box {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 16px;
    background: var(--surface-card-subtle, rgba(0,0,0,0.02));
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
  }

  .avatar-container {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    border: 2px solid rgba(255, 255, 255, 0.25);
  }

  .avatar-img-preview {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
  }

  .avatar-initial-text {
    font-size: 28px;
    font-weight: 800;
    color: #fff;
    user-select: none;
  }

  .camera-btn {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .camera-btn:hover {
    transform: scale(1.1);
    background: var(--surface-card-hover);
  }

  .avatar-hero-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .hero-name {
    font-size: 18px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }
  .hero-meta {
    font-size: 12.5px;
    color: var(--text-secondary);
  }
  .hero-staff-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  .staff-id-tag {
    font-size: 11px;
    font-weight: 700;
    color: var(--brand-accent);
    background: var(--brand-tint);
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid rgba(0, 120, 212, 0.2);
  }
  .remove-photo-btn {
    font-size: 11px;
    color: #EF4444;
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
  }
  .remove-photo-btn:hover {
    color: #DC2626;
  }

  /* Color Swatches */
  .color-swatches-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 6px;
  }
  .swatch-btn {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .swatch-btn:hover {
    transform: scale(1.15);
  }
  .swatch-btn.active {
    box-shadow: 0 0 0 2px var(--brand-accent);
    transform: scale(1.15);
  }
  .swatch-check {
    color: #fff;
    font-size: 12px;
    font-weight: 900;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }

  .divider-line {
    height: 1px;
    background: var(--surface-card-border);
    margin: 16px 0;
  }

  /* Form layouts */
  .form-row {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 12px;
  }
  .field-label {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-secondary);
  }
  .fluent-select {
    width: 100%;
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--surface-card-border);
    background: var(--surface-card);
    color: var(--text-primary);
    font-size: 12.5px;
    padding: 0 10px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
  }
  .fluent-select:focus {
    border-color: var(--brand-accent);
  }

  .form-grid-2x2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .profile-action-row {
    margin-top: 18px;
    display: flex;
    justify-content: flex-start;
  }

  /* Password & Themes */
  .password-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .form-actions {
    display: flex;
    gap: 10px;
    margin-top: 8px;
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

  @media (max-width: 960px) {
    .profile-grid { grid-template-columns: 1fr; }
    .form-grid-2x2 { grid-template-columns: 1fr; }
  }
</style>
