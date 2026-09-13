<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';
  import { studioService, type StudioProfile } from '$lib/services/studioService.svelte';
  import { licenseStore } from '$lib/stores/licenseStore.svelte';
  import type { ThemeName } from '$lib/types';

  type SettingsTab = 'profile' | 'appearance' | 'vault' | 'preferences' | 'shortcuts' | 'license' | 'security' | 'about';
  let activeTab = $state<SettingsTab>('profile');
  let licenseInputKey = $state('');

  // Studio & Freelance Branding fields
  let studioName = $state(studioService.profile.studioName);
  let principalName = $state(studioService.profile.principalName);
  let professionalTitle = $state(studioService.profile.professionalTitle);
  let tagline = $state(studioService.profile.tagline);
  let logo = $state(studioService.profile.logo);
  let brandColor = $state(studioService.profile.brandColor);

  let businessRegNo = $state(studioService.profile.businessRegNo);
  let billingEmail = $state(studioService.profile.billingEmail);
  let studioAddress = $state(studioService.profile.studioAddress);
  let website = $state(studioService.profile.website);
  let phone = $state(studioService.profile.phone);

  let paymentBank = $state(studioService.profile.paymentBank);
  let paymentAccountNo = $state(studioService.profile.paymentAccountNo);
  let paymentAccountName = $state(studioService.profile.paymentAccountName);
  let paymentSwiftOrQr = $state(studioService.profile.paymentSwiftOrQr);
  let defaultPaymentTerms = $state(studioService.profile.defaultPaymentTerms);
  let defaultCurrency = $state(studioService.profile.defaultCurrency);

  let digitalSignature = $state(studioService.profile.digitalSignature);
  let footerNotice = $state(studioService.profile.footerNotice);
  let isSavingProfile = $state(false);

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

  // Vault & File Path Management
  let currentVaultRoot = $state(vaultStore.config.rootPath || '');
  let customVaultInput = $state('');
  let isMountingVault = $state(false);
  let vaultHealth = $state<{ workspaceRoot: string; workspaceExists: boolean; cachedProjects: number; lastScan: string } | null>(null);

  // Canonical Folder Tree expansion state
  let expandedNodes = $state<Record<string, boolean>>({
    'clients': true,
    'finance': true,
    'projects': true,
    'projects-2026': true,
    'journal': true,
    'notes': true
  });

  function toggleNode(nodeKey: string) {
    expandedNodes[nodeKey] = !expandedNodes[nodeKey];
  }

  async function loadVaultStatus() {
    try {
      const health = await ApiClient.getSystemHealth().catch(() => null);
      if (health && health.success) {
        vaultHealth = health;
        currentVaultRoot = health.workspaceRoot || vaultStore.config.rootPath;
        if (!customVaultInput) {
          customVaultInput = health.workspaceRoot || '';
        }
      }
    } catch {
      /* graceful fallback */
    }
  }

  async function handleMountVault(targetPath: string) {
    if (!targetPath || !targetPath.trim()) {
      appState.addToast('Please specify a valid filesystem directory path.', 'warning');
      return;
    }
    isMountingVault = true;
    try {
      const res = await ApiClient.setWorkspaceRoot(targetPath.trim());
      if (res && res.success) {
        appState.addToast(`Active vault mounted at ${res.workspaceRoot}`, 'success', 'Vault Mounted');
        currentVaultRoot = res.workspaceRoot;
        customVaultInput = res.workspaceRoot;
        await loadVaultStatus();
        await vaultStore.scanVault();
      } else {
        appState.addToast(res?.message || 'Failed to mount vault directory.', 'error');
      }
    } catch (err: any) {
      appState.addToast(`Vault mount error: ${err.message}`, 'error');
    } finally {
      isMountingVault = false;
    }
  }

  function copyGitUrl() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://github.com/manaphassan/Kanso-Cre8');
      appState.addToast('Repository URL copied to clipboard: https://github.com/manaphassan/Kanso-Cre8', 'success', 'URL Copied');
    }
  }

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
      name: 'Obsidian Dark',
      tag: 'DARK MODE',
      desc: 'Organic olive obsidian canvas with tactical sage surfaces and terracotta pops. Deep, warm, zero eyestrain.',
      canvasColor: '#151813',
      surfaceColor: '#1E251A',
      accentColor: '#DE694B'
    },
    {
      id: 'light',
      name: 'Stone Paper',
      tag: 'LIGHT MODE',
      desc: 'Warm Scandinavian raw stone paper canvas with deep charcoal ink and terracotta CTAs.',
      canvasColor: '#ECE8DF',
      surfaceColor: '#F7F5F0',
      accentColor: '#DE694B'
    },
    {
      id: 'oceanic',
      name: 'Kai-Zen Blue',
      tag: 'OCEANIC CERULEAN',
      desc: 'Deep Ocean #064169 canvas with Cerulean #21A8C3 highlights, slate accents, and Poppins studio typography.',
      canvasColor: '#064169',
      surfaceColor: '#043150',
      accentColor: '#21A8C3'
    },
    {
      id: 'oceanic-light',
      name: 'Marina Light',
      tag: 'OCEANIC LIGHT',
      desc: 'Crisp light blue-grey #F0F4F8 canvas with deep ocean navy titles and Cerulean #21A8C3 actions.',
      canvasColor: '#F0F4F8',
      surfaceColor: '#FFFFFF',
      accentColor: '#21A8C3'
    },
    {
      id: 'eink',
      name: 'Paperlike E-Ink',
      tag: 'E-INK DISPLAY',
      desc: 'Optimized for low-color-depth & mono e-ink monitors (Dasung, Boox) per ampresent/e-ink-colorschemes: zero color jitter, pure #FFFFFF canvas, #FFFFF0 ivory cards, pure #000000 text, and #2424D9 link accent.',
      canvasColor: '#FFFFFF',
      surfaceColor: '#FFFFF0',
      accentColor: '#2424D9'
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
    { key: '⌘ 2', label: 'Project Manager', desc: 'Coordinate campaigns, Kanban, Gantt & schedules' },
    { key: '⌘ 3', label: 'Review Queue', desc: 'Deliverables inspection & lightbox approval' },
    { key: '⌘ 4', label: 'Bullet Journal', desc: 'BuJo rapid log, monthly & yearly review' },
    { key: '⌘ 5', label: 'Clients & Brand Hub', desc: 'Client dossiers & HEX brand swatches' },
    { key: '⌘ 6', label: 'Quotes & Invoices', desc: 'Dual-pane markdown invoice studio' },
    { key: '⌘ 7', label: 'Atelier Notes', desc: 'Zettelkasten knowledge base & tasks' },
    { key: '⌘ 8', label: 'Focus Radio', desc: 'Mechanical retro cassette focus deck' },
    { key: '⌘ 9', label: 'Studio Settings', desc: 'Studio preferences, themes & vault' },
    { key: '⌘ K', label: 'Command Palette', desc: 'Instant search across entire creative vault' },
    { key: '⌘ ⇧ T', label: 'Toggle Chronometer', desc: 'Start, pause, or resume billable timer' },
    { key: '⌘ ⇧ K', label: 'Quick Scratchpad', desc: 'Instant clipboard capture into Scratchpad.md' },
    { key: '⌘ ⇧ J', label: 'Open Journal', desc: 'Direct shortcut to today’s rapid log' },
    { key: '⌘ ⇧ I', label: 'Open Invoices', desc: 'Direct shortcut to Quotes & Invoices Studio' },
    { key: '⌘ ⇧ C', label: 'Copywriting Studio', desc: 'Direct shortcut to Copywriting Studio' },
    { key: 'Space', label: 'Focus Radio Play/Pause', desc: 'Toggle lo-fi cassette stream on/off' }
  ];

  let logoFileInput = $state<HTMLInputElement>();
  let signatureFileInput = $state<HTMLInputElement>();

  async function syncStudioProfile() {
    await studioService.init();
    studioName = studioService.profile.studioName;
    principalName = studioService.profile.principalName;
    professionalTitle = studioService.profile.professionalTitle;
    tagline = studioService.profile.tagline;
    logo = studioService.profile.logo;
    brandColor = studioService.profile.brandColor;
    businessRegNo = studioService.profile.businessRegNo;
    billingEmail = studioService.profile.billingEmail;
    studioAddress = studioService.profile.studioAddress;
    website = studioService.profile.website;
    phone = studioService.profile.phone;
    paymentBank = studioService.profile.paymentBank;
    paymentAccountNo = studioService.profile.paymentAccountNo;
    paymentAccountName = studioService.profile.paymentAccountName;
    paymentSwiftOrQr = studioService.profile.paymentSwiftOrQr;
    defaultPaymentTerms = studioService.profile.defaultPaymentTerms;
    defaultCurrency = studioService.profile.defaultCurrency;
    digitalSignature = studioService.profile.digitalSignature;
    footerNotice = studioService.profile.footerNotice;
  }

  function triggerLogoUpload() {
    if (logoFileInput) logoFileInput.click();
  }

  function handleLogoSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      appState.addToast('Please select a valid image file (PNG, JPG, WEBP, SVG).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      logo = (e.target?.result as string) || '';
      appState.addToast('Studio Logo loaded. Click "Save Studio Brand Dossier" to apply.', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    logo = '';
    appState.addToast('Studio Logo removed. Monogram initials will be used.', 'info');
  }

  function triggerSignatureUpload() {
    if (signatureFileInput) signatureFileInput.click();
  }

  function handleSignatureSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      appState.addToast('Please select a valid image file (PNG, WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      digitalSignature = (e.target?.result as string) || '';
      appState.addToast('Digital Signature / Seal loaded.', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeSignature() {
    digitalSignature = '';
    appState.addToast('Digital Signature / Seal removed.', 'info');
  }

  async function handleProfileSave() {
    isSavingProfile = true;
    try {
      await studioService.saveProfile({
        studioName: studioName.trim(),
        principalName: principalName.trim(),
        professionalTitle: professionalTitle.trim(),
        tagline: tagline.trim(),
        logo: logo || '',
        brandColor: brandColor || '#0284C7',
        businessRegNo: businessRegNo.trim(),
        billingEmail: billingEmail.trim(),
        studioAddress: studioAddress.trim(),
        website: website.trim(),
        phone: phone.trim(),
        paymentBank: paymentBank.trim(),
        paymentAccountNo: paymentAccountNo.trim(),
        paymentAccountName: paymentAccountName.trim(),
        paymentSwiftOrQr: paymentSwiftOrQr.trim(),
        defaultPaymentTerms: defaultPaymentTerms.trim(),
        defaultCurrency: defaultCurrency.trim(),
        digitalSignature: digitalSignature || '',
        footerNotice: footerNotice.trim()
      });

      // Synchronize with desktop current user so header and user menu update
      if (appState.currentUser) {
        appState.currentUser.name = principalName.trim() || studioName.trim();
        appState.currentUser.email = billingEmail.trim();
        appState.currentUser.role = professionalTitle.trim();
        appState.currentUser.avatar = logo || '';
        appState.currentUser.avatarColor = brandColor || '#0284C7';
      }

      appState.addToast('Studio & Freelance Brand Dossier saved and synchronized.', 'success', 'Brand Dossier Updated');
    } catch (err: any) {
      appState.addToast(`Failed to save studio dossier: ${err.message}`, 'error');
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
      await ApiClient.changePassword(currentPassword, newPassword);
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
    syncStudioProfile();
    loadVaultStatus();
  });
</script>

<div class="settings-view-container">
  <!-- View Header -->
  <div class="view-header">
    <div class="header-titles">
      <div class="header-tag">
        <span class="tag-badge">_Settings/</span>
        <span class="tag-meta">Atelier Environment &amp; Storage · Zero SQL</span>
      </div>
      <h1 class="view-title">Studio Settings</h1>
      <p class="view-subtitle">Precision controls for designer identity, visual themes, vault storage directories, and studio preferences.</p>
    </div>

    <div class="header-actions">
      <div class="sync-status-pill">
        <span class="status-dot"></span>
        <span>Vault Synced · Zero SQL</span>
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
      <span>Studio Brand Dossier</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'appearance'}
      onclick={() => (activeTab = 'appearance')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
      </svg>
      <span>Lighting &amp; Themes</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'vault'}
      onclick={() => (activeTab = 'vault')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
      </svg>
      <span>Vault &amp; File Path</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'preferences'}
      onclick={() => (activeTab = 'preferences')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/>
      </svg>
      <span>Studio Production</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'shortcuts'}
      onclick={() => (activeTab = 'shortcuts')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
      </svg>
      <span>Accelerators</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'license'}
      onclick={() => (activeTab = 'license')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span>Studio Edition &amp; License</span>
      {#if licenseStore.isPro}
        <span class="tab-pro-pill">PRO</span>
      {/if}
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'security'}
      onclick={() => (activeTab = 'security')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
      </svg>
      <span>Studio Key</span>
    </button>

    <button
      class="tab-btn"
      class:active={activeTab === 'about'}
      onclick={() => (activeTab = 'about')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
      <span>About Kanso Cre8</span>
    </button>
  </nav>

  <!-- TAB CONTENT -->
  <div class="tab-body">
    <!-- ═══════════ TAB 1: STUDIO & FREELANCE BRAND DOSSIER ═══════════ -->
    {#if activeTab === 'profile'}
      <div class="settings-grid">

        <!-- Live Stationery & Invoice Header Preview Banner -->
        <div class="card-surface stationery-preview-card">
          <div class="stationery-preview-header">
            <div class="preview-title-row">
              <span class="preview-badge">LIVE STATIONERY PREVIEW</span>
              <span class="preview-sub">Master identity auto-stamped on Invoices, Quotations, and Approval packages</span>
            </div>
            <span class="currency-badge">{defaultCurrency || 'USD'} BASE</span>
          </div>

          <div class="stationery-sheet-preview">
            <div class="sheet-header-left">
              <div class="sheet-logo-monogram" style="background: {brandColor || '#0284C7'};">
                {#if logo}
                  <img src={logo} alt={studioName || principalName} class="sheet-logo-img" />
                {:else}
                  <span>{(studioName || principalName || 'H').charAt(0).toUpperCase()}</span>
                {/if}
              </div>
              <div class="sheet-title-col">
                <h3 class="sheet-studio-name">{studioName || 'Studio Brand Name'}</h3>
                {#if tagline}
                  <p class="sheet-tagline">{tagline}</p>
                {/if}
                <div class="sheet-meta-row">
                  {#if businessRegNo}
                    <span class="sheet-reg-tag">REG: {businessRegNo}</span>
                  {/if}
                  <span class="sheet-loc-tag">{studioAddress || 'City, Country'}</span>
                  <span class="sheet-contact-tag">{billingEmail || 'billing@studio.com'} · {phone || '+00 000 0000'}</span>
                </div>
              </div>
            </div>

            <div class="sheet-header-right">
              <div class="doc-type-pill">COMMERCIAL MANIFEST</div>
              <div class="sheet-doc-no font-mono">INV-2026-001</div>
              {#if paymentBank}
                <div class="sheet-bank-pill font-mono text-xs">
                  {paymentBank} · {paymentAccountNo}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- 1. Studio & Principal Visual Identity -->
        <div class="card-surface">
          <div class="card-header">
            <h2 class="card-title">1. Studio &amp; Principal Brand Identity</h2>
            <p class="card-subtitle">Your studio name, principal designer identity, and visual trade mark.</p>
          </div>

          <!-- Logo & Brand Accent Manager -->
          <div class="avatar-manager-row">
            <div class="avatar-preview-wrap">
              <div
                class="avatar-display studio-logo-display"
                style="background: {brandColor || '#0284C7'};"
              >
                {#if logo}
                  <img src={logo} alt={studioName || principalName} class="avatar-img" />
                {:else}
                  <span class="avatar-text">{(studioName || principalName || 'H').charAt(0).toUpperCase()}</span>
                {/if}
              </div>
            </div>

            <div class="avatar-actions">
              <div class="avatar-btn-row">
                <input
                  type="file"
                  accept="image/*"
                  bind:this={logoFileInput}
                  onchange={handleLogoSelected}
                  style="display: none;"
                />
                <button type="button" class="btn-secondary" onclick={triggerLogoUpload}>
                  Upload Studio Logo
                </button>
                {#if logo}
                  <button type="button" class="btn-secondary danger" onclick={removeLogo}>
                    Remove Logo
                  </button>
                {/if}
              </div>
              <p class="avatar-hint">PNG, JPG, SVG, or WEBP. Square or circle monogram recommended.</p>

              <!-- Color Palette -->
              <div class="color-picker-row">
                <span class="color-label">Brand Accent Swatch:</span>
                <div class="swatches-list">
                  {#each avatarColors as c}
                    <button
                      type="button"
                      class="swatch-circle"
                      class:selected={brandColor === c.hex}
                      style="background: {c.hex};"
                      title={c.label}
                      onclick={() => (brandColor = c.hex)}
                    ></button>
                  {/each}
                </div>
              </div>
            </div>
          </div>

          <!-- Identity Form Fields -->
          <div class="form-grid-2" style="margin-top: 16px;">
            <div class="form-group">
              <label class="form-label" for="studio-name-input">Studio / Trade Entity Name</label>
              <input id="studio-name-input" type="text" class="form-input" bind:value={studioName} placeholder="e.g. HaNa Innovation" />
            </div>
            <div class="form-group">
              <label class="form-label" for="principal-name-input">Principal Designer / Creative Director</label>
              <input id="principal-name-input" type="text" class="form-input" bind:value={principalName} placeholder="e.g. Harussani" />
            </div>
            <div class="form-group">
              <label class="form-label" for="role-input">Professional Title &amp; Practice</label>
              <input id="role-input" type="text" class="form-input" bind:value={professionalTitle} placeholder="e.g. Principal Art Director & Brand Architect" />
            </div>
            <div class="form-group">
              <label class="form-label" for="tagline-input">Studio Tagline / Philosophy</label>
              <input id="tagline-input" type="text" class="form-input" bind:value={tagline} placeholder="e.g. Mindful Brand Systems & Digital Craft" />
            </div>
          </div>
        </div>

        <!-- 2. Business Registration & Commercial Contact -->
        <div class="card-surface">
          <div class="card-header">
            <h2 class="card-title">2. Business Registry &amp; Client Communication</h2>
            <p class="card-subtitle">Official commercial registration, tax credentials, and billing coordinates printed on invoice headers.</p>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="business-reg-input">Business Reg No. / Tax ID (SSM, VAT, EIN, ABN)</label>
              <input id="business-reg-input" type="text" class="form-input font-mono" bind:value={businessRegNo} placeholder="e.g. 202601004829 (LLP-9921)" />
            </div>
            <div class="form-group">
              <label class="form-label" for="billing-email-input">Official Business &amp; Billing Email</label>
              <input id="billing-email-input" type="email" class="form-input" bind:value={billingEmail} placeholder="e.g. billing@hana-innovation.com" />
            </div>
            <div class="form-group">
              <label class="form-label" for="address-input">Studio Location / Physical Atelier Base</label>
              <input id="address-input" type="text" class="form-input" bind:value={studioAddress} placeholder="e.g. Kuala Lumpur, Malaysia" />
            </div>
            <div class="form-group">
              <label class="form-label" for="website-input">Studio Website / Portfolio URL</label>
              <input id="website-input" type="url" class="form-input font-mono" bind:value={website} placeholder="e.g. https://hana-innovation.com" />
            </div>
            <div class="form-group">
              <label class="form-label" for="phone-input">Direct Phone / WhatsApp / Telegram</label>
              <input id="phone-input" type="tel" class="form-input font-mono" bind:value={phone} placeholder="e.g. +60 12-345 6789" />
            </div>
            <div class="form-group">
              <label class="form-label" for="currency-select">Default Invoicing Currency</label>
              <select id="currency-select" class="form-select font-mono" bind:value={defaultCurrency}>
                <option value="USD">USD ($) — United States Dollar</option>
                <option value="MYR">MYR (RM) — Malaysian Ringgit</option>
                <option value="SGD">SGD (S$) — Singapore Dollar</option>
                <option value="GBP">GBP (£) — British Pound Sterling</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="AUD">AUD (A$) — Australian Dollar</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 3. Payment Remittance & Document Sign-Off Seal -->
        <div class="card-surface">
          <div class="card-header">
            <h2 class="card-title">3. Settlement Remittance &amp; Authorized Seal</h2>
            <p class="card-subtitle">Wire transfer instructions, bank routing, standard payment terms, and your digital approval chop.</p>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="bank-input">Remittance Bank Name &amp; SWIFT/BIC</label>
              <input id="bank-input" type="text" class="form-input" bind:value={paymentBank} placeholder="e.g. Maybank (SWIFT: MBBEMYKL)" />
            </div>
            <div class="form-group">
              <label class="form-label" for="acc-no-input">Bank Account Number / IBAN</label>
              <input id="acc-no-input" type="text" class="form-input font-mono" bind:value={paymentAccountNo} placeholder="e.g. 5140-1234-5678" />
            </div>
            <div class="form-group">
              <label class="form-label" for="acc-name-input">Beneficiary / Account Holder Name</label>
              <input id="acc-name-input" type="text" class="form-input" bind:value={paymentAccountName} placeholder="e.g. HaNa Innovation" />
            </div>
            <div class="form-group">
              <label class="form-label" for="swift-qr-input">Direct Remittance QR / Payment Reference</label>
              <input id="swift-qr-input" type="text" class="form-input font-mono" bind:value={paymentSwiftOrQr} placeholder="e.g. DuitNow QR / Wise: payment@studio.com" />
            </div>
            <div class="form-group" style="grid-column: span 2;">
              <label class="form-label" for="terms-input">Standard Payment &amp; Settlement Terms</label>
              <input id="terms-input" type="text" class="form-input" bind:value={defaultPaymentTerms} placeholder="e.g. 50% Upfront Deposit • Net 14 Days • 2 Revision Rounds included" />
            </div>
          </div>

          <!-- Signature / Stamp Row -->
          <div class="avatar-manager-row" style="margin-top: 16px;">
            <div class="avatar-preview-wrap">
              <div class="signature-display">
                {#if digitalSignature}
                  <img src={digitalSignature} alt="Authorized Sign-off Seal" class="signature-img" />
                {:else}
                  <span class="signature-placeholder font-mono text-xs">NO SEAL</span>
                {/if}
              </div>
            </div>

            <div class="avatar-actions">
              <div class="avatar-btn-row">
                <input
                  type="file"
                  accept="image/png,image/webp"
                  bind:this={signatureFileInput}
                  onchange={handleSignatureSelected}
                  style="display: none;"
                />
                <button type="button" class="btn-secondary" onclick={triggerSignatureUpload}>
                  Upload Digital Signature / Chop
                </button>
                {#if digitalSignature}
                  <button type="button" class="btn-secondary danger" onclick={removeSignature}>
                    Remove Seal
                  </button>
                {/if}
              </div>
              <p class="avatar-hint">Transparent PNG or WEBP. Stamped onto approved Quotes, Proposals, and Proof Reviews.</p>
            </div>
          </div>

          <!-- Document Footer Notice -->
          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label" for="footer-notice-input">Document Footer Watermark / Atelier Colophon</label>
            <input id="footer-notice-input" type="text" class="form-input" bind:value={footerNotice} placeholder="e.g. Crafted with mindful focus & precision in Kanso Cre8." />
          </div>

          <div class="form-actions-row" style="margin-top: 20px;">
            <button
              type="button"
              class="btn-primary"
              onclick={handleProfileSave}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? 'Synchronizing with Vault...' : 'Save Studio Brand Dossier'}
            </button>
          </div>
        </div>

      </div>

    <!-- ═══════════ TAB 2: APPEARANCE & THEMES ═══════════ -->
    {:else if activeTab === 'appearance'}
      <div class="card-surface">
        <div class="card-header">
          <h2 class="card-title">Lighting &amp; Visual Atmosphere</h2>
          <p class="card-subtitle">Select your atelier lighting environment. Engineered with Linear / Geist design tokens, high-contrast E-Ink support, and 0ms repaint latency.</p>
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
                  <div class="preview-line" style="background: {t.id === 'light' || t.id === 'eink' ? '#18181B' : t.id === 'oceanic-light' ? '#064169' : '#FFFFFF'}; width: 45%;"></div>
                  <div class="preview-line" style="background: {t.id === 'light' || t.id === 'eink' ? '#64748B' : t.id === 'oceanic-light' ? '#93A3BC' : '#71717A'}; width: 70%;"></div>
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

    <!-- ═══════════ TAB 3: VAULT & FILE PATH MANAGEMENT ═══════════ -->
    {:else if activeTab === 'vault'}
      <div class="settings-grid">
        <!-- Card 1: Active Mount & Directory Control -->
        <div class="card-surface">
          <div class="card-header">
            <div class="card-header-badge-row">
              <h2 class="card-title">Active Vault Mount &amp; Directory Path</h2>
              <span class="storage-pill">Pure Markdown (Zero SQL)</span>
            </div>
            <p class="card-subtitle">Direct plain-text filesystem synchronization. Connect any fast local NVMe, Dropbox, or Synology Drive workspace.</p>
          </div>

          <!-- Live Mount Status Banner -->
          <div class="active-vault-banner">
            <div class="vault-mount-meta">
              <div class="vault-status-indicator">
                <span class="status-pulse-dot"></span>
                <span class="status-text">{vaultHealth?.workspaceExists !== false ? 'Mounted & Verified' : 'Checking Path...'}</span>
              </div>
              <div class="vault-path-text" title={currentVaultRoot || vaultStore.config.rootPath}>
                {currentVaultRoot || vaultStore.config.rootPath}
              </div>
            </div>

            <div class="vault-mount-tags">
              {#if vaultHealth?.cachedProjects}
                <span class="tag-chip">{vaultHealth.cachedProjects} Projects Indexed</span>
              {/if}
              <span class="tag-chip">Lossless UTF-8</span>
              <span class="tag-chip">Universal Cloud Sync</span>
            </div>
          </div>

          <!-- Custom Path Mount Form -->
          <div class="custom-mount-box">
            <label class="form-label" for="custom-vault-path">Switch or Mount Custom Vault Directory</label>
            <div class="mount-input-row">
              <input
                id="custom-vault-path"
                type="text"
                class="form-input flex-1"
                bind:value={customVaultInput}
                placeholder="e.g. D:\OneDrive\Völundr or /home/designer/AtelierVault"
              />
              <button
                type="button"
                class="btn-primary"
                onclick={() => handleMountVault(customVaultInput)}
                disabled={isMountingVault || !customVaultInput.trim()}
              >
                {isMountingVault ? 'Mounting...' : 'Mount & Rescan Vault'}
              </button>
            </div>
            <p class="mount-hint">
              Kanso Cre8 will instantly re-index all Markdown dossiers, project vaults, and bullet journals in real-time. Zero server migrations required.
            </p>
          </div>
        </div>

        <!-- Card 2: Interactive Canonical Vault Architecture Tree -->
        <div class="card-surface canonical-tree-card">
          <div class="card-header">
            <div class="card-header-badge-row">
              <h2 class="card-title">Canonical Kanso Zen Vault Layout</h2>
              <span class="storage-pill">Filesystem Architecture</span>
            </div>
            <p class="card-subtitle">Strict 5-domain pure Markdown structure. Every dossier, deliverable proof, quote, and note lives as a readable UTF-8 document.</p>
          </div>

          <div class="vault-tree-view">
            <!-- Root node -->
            <div class="tree-root-bar">
              <span class="tree-root-icon">📦</span>
              <span class="tree-root-path">{currentVaultRoot || 'Vault Root'}</span>
              <span class="tree-root-badge">Canonical Zen Specification</span>
            </div>

            <div class="tree-branches">
              <!-- Branch 1: _Clients -->
              <div class="tree-node-group">
                <button
                  type="button"
                  class="tree-node-header"
                  onclick={() => toggleNode('clients')}
                >
                  <span class="tree-chevron" class:expanded={expandedNodes['clients']}>▶</span>
                  <span class="folder-glyph">📁</span>
                  <span class="folder-name">_Clients/</span>
                  <span class="folder-role">Multi-Client Dossiers &amp; Brand Hub</span>
                  <span class="folder-count">5 Dossiers</span>
                </button>
                {#if expandedNodes['clients']}
                  <div class="tree-children">
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">ACME_AcmeCorp/</span>
                      <span class="leaf-desc">Acme Corporation dossier (HEX #38BDF8 · client.md)</span>
                    </div>
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">NEX_NexusStudio/</span>
                      <span class="leaf-desc">Nexus Studio dossier (HEX #8B5CF6 · client.md)</span>
                    </div>
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">LUM_LuminaLabs/</span>
                      <span class="leaf-desc">Lumina Labs dossier (HEX #10B981 · client.md)</span>
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Branch 2: _Finance -->
              <div class="tree-node-group">
                <button
                  type="button"
                  class="tree-node-header"
                  onclick={() => toggleNode('finance')}
                >
                  <span class="tree-chevron" class:expanded={expandedNodes['finance']}>▶</span>
                  <span class="folder-glyph">📁</span>
                  <span class="folder-name">_Finance/</span>
                  <span class="folder-role">Dual-Pane Markdown Financial Ledger</span>
                  <span class="folder-count">Quotes &amp; Invoices</span>
                </button>
                {#if expandedNodes['finance']}
                  <div class="tree-children">
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">Quotes/</span>
                      <span class="leaf-desc">Standard proposals with scoped deliverable milestones</span>
                    </div>
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">Invoices/</span>
                      <span class="leaf-desc">Plain markdown invoices synced with header billable chronometer</span>
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Branch 3: _Projects -->
              <div class="tree-node-group">
                <button
                  type="button"
                  class="tree-node-header"
                  onclick={() => toggleNode('projects')}
                >
                  <span class="tree-chevron" class:expanded={expandedNodes['projects']}>▶</span>
                  <span class="folder-glyph">📁</span>
                  <span class="folder-name">_Projects/</span>
                  <span class="folder-role">Standardized 5-Folder Creative Vaults</span>
                  <span class="folder-count">Annual Structure</span>
                </button>
                {#if expandedNodes['projects']}
                  <div class="tree-children">
                    <div class="tree-leaf">
                      <button
                        type="button"
                        class="tree-sub-header"
                        onclick={() => toggleNode('projects-2026')}
                      >
                        <span class="tree-chevron small" class:expanded={expandedNodes['projects-2026']}>▶</span>
                        <span class="folder-glyph">📁</span>
                        <span class="leaf-name font-semibold">2026/</span>
                        <span class="leaf-desc">Current production calendar</span>
                      </button>
                    </div>
                    {#if expandedNodes['projects-2026']}
                      <div class="tree-sub-children">
                        <div class="tree-leaf highlight">
                          <span class="folder-glyph">📁</span>
                          <span class="leaf-name font-bold">202609_0001D_ACME_MobileAppIllustration/</span>
                          <span class="leaf-desc">Active Acme Corp flagship project</span>
                        </div>
                        <div class="tree-sub-sub-children">
                          <div class="tree-leaf mini"><span class="sub-leaf-glyph">├── 📁</span> <span class="leaf-code">01_BRIEF/</span> <span class="leaf-role">Client briefs, municipal contracts, thermal specs</span></div>
                          <div class="tree-leaf mini"><span class="sub-leaf-glyph">├── 📁</span> <span class="leaf-code">02_SOURCE/</span> <span class="leaf-role">Logos, vector typography, high-res assets</span></div>
                          <div class="tree-leaf mini"><span class="sub-leaf-glyph">├── 📁</span> <span class="leaf-code">03_COPY/</span> <span class="leaf-role">Bodycopy, terms, municipal slip text</span></div>
                          <div class="tree-leaf mini"><span class="sub-leaf-glyph">├── 📁</span> <span class="leaf-code">04_WIP/</span> <span class="leaf-role">Active Figma exports, vectors, working files</span></div>
                          <div class="tree-leaf mini"><span class="sub-leaf-glyph">└── 📁</span> <span class="leaf-code">05_DELIVERABLES/</span> <span class="leaf-role">Ready-to-print press files, client proofs &amp; PDFs</span></div>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>

              <!-- Branch 4: _Journal -->
              <div class="tree-node-group">
                <button
                  type="button"
                  class="tree-node-header"
                  onclick={() => toggleNode('journal')}
                >
                  <span class="tree-chevron" class:expanded={expandedNodes['journal']}>▶</span>
                  <span class="folder-glyph">📁</span>
                  <span class="folder-name">_Journal/</span>
                  <span class="folder-role">Bullet Journal (BuJo) Rapid Logging</span>
                  <span class="folder-count">Daily · Monthly · Yearly</span>
                </button>
                {#if expandedNodes['journal']}
                  <div class="tree-children">
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">Daily/</span>
                      <span class="leaf-desc">Rapid logs (• [ ] Task, [x] Done, [>] Migrated, * Priority)</span>
                    </div>
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">Monthly/</span>
                      <span class="leaf-desc">Completed deliverables, total hours, creative retrospectives</span>
                    </div>
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">Yearly/</span>
                      <span class="leaf-desc">Annual creative vision, revenue milestones &amp; highlights</span>
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Branch 5: _Notes -->
              <div class="tree-node-group">
                <button
                  type="button"
                  class="tree-node-header"
                  onclick={() => toggleNode('notes')}
                >
                  <span class="tree-chevron" class:expanded={expandedNodes['notes']}>▶</span>
                  <span class="folder-glyph">📁</span>
                  <span class="folder-name">_Notes/</span>
                  <span class="folder-role">Atelier Zettelkasten Knowledge Engine</span>
                  <span class="folder-count">Atomic Notes + Scratchpad</span>
                </button>
                {#if expandedNodes['notes']}
                  <div class="tree-children">
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">01_Fleeting/</span>
                      <span class="leaf-desc">Instant creative brainstorms &amp; transient thoughts</span>
                    </div>
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">02_Literature/</span>
                      <span class="leaf-desc">Design books, typography notes, and case studies</span>
                    </div>
                    <div class="tree-leaf">
                      <span class="file-glyph">📁</span>
                      <span class="leaf-name">03_Permanent/</span>
                      <span class="leaf-desc">Atomic design principles, brand rules &amp; studio laws</span>
                    </div>
                    <div class="tree-leaf highlight">
                      <span class="file-glyph">📄</span>
                      <span class="leaf-name font-bold">Scratchpad.md</span>
                      <span class="leaf-desc">Instant clipboard capture buffer &amp; transient scratch notes</span>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- ═══════════ TAB 4: PREFERENCES ═══════════ -->
    {:else if activeTab === 'preferences'}
      <div class="card-surface">
        <div class="card-header">
          <h2 class="card-title">Studio Production Defaults</h2>
          <p class="card-subtitle">Configure opening workspace views, baseline hourly billing velocity, and creative chronometer behavior.</p>
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
          <label class="form-label" for="rate-input">Baseline Hourly Billing Rate ($ USD / hr)</label>
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
            Save Studio Defaults
          </button>
        </div>
      </div>

    <!-- ═══════════ TAB 5: SHORTCUTS ═══════════ -->
    {:else if activeTab === 'shortcuts'}
      <div class="card-surface">
        <div class="card-header">
          <h2 class="card-title">Keyboard Accelerators &amp; HUD Hotkeys</h2>
          <p class="card-subtitle">Tactile keyboard shortcuts designed for flow state and zero-clutter execution.</p>
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
          <h2 class="card-title">Studio Key &amp; Vault Access</h2>
          <p class="card-subtitle">Update your standalone studio password stored in local vault configuration.</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="current-pw-input">Current Studio Key</label>
          <input
            id="current-pw-input"
            type="password"
            class="form-input"
            bind:value={currentPassword}
            placeholder="••••••••"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="new-pw-input">New Studio Key</label>
          <input
            id="new-pw-input"
            type="password"
            class="form-input"
            bind:value={newPassword}
            placeholder="Minimum 6 characters"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="confirm-pw-input">Confirm New Studio Key</label>
          <input
            id="confirm-pw-input"
            type="password"
            class="form-input"
            bind:value={confirmPassword}
            placeholder="Repeat new studio key"
          />
        </div>

        <div class="form-actions-row">
          <button
            type="button"
            class="btn-primary"
            onclick={handlePasswordSave}
            disabled={isSavingPassword}
          >
            {isSavingPassword ? 'Updating Studio Key...' : 'Update Studio Key'}
          </button>
        </div>
      </div>

    <!-- ═══════════ TAB 6: STUDIO EDITION & LICENSE ═══════════ -->
    {:else if activeTab === 'license'}
      <div class="settings-grid">
        <!-- License Status Card -->
        <div class="card-surface license-edition-card">
          <div class="card-header">
            <div class="license-header-flex">
              <div>
                <div class="edition-badge-wrap">
                  {#if licenseStore.isPro}
                    <span class="edition-badge pro">KANSO STUDIO PRO · PERPETUAL</span>
                  {:else}
                    <span class="edition-badge zen">KANSO ZEN · FREE SANCTUARY</span>
                  {/if}
                </div>
                <h2 class="card-title" style="margin-top: 6px;">Studio Edition &amp; Offline Perpetual License</h2>
              </div>
              <div class="offline-badge-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>100% Offline Cryptographic Validation</span>
              </div>
            </div>
            <p class="card-subtitle">
              {#if licenseStore.isPro}
                Your studio is licensed under a one-time perpetual license. Commercial operations, unlimited clients, YAML invoice generation, and custom rate calculators are permanently unlocked.
              {:else}
                You are operating under the free Kanso Zen sanctuary tier. Personal journaling, atomic notes, copywriting studio, and lo-fi focus radio are free forever. Commercial operations require an offline studio key.
              {/if}
            </p>
          </div>

          {#if licenseStore.isPro}
            <div class="active-license-details">
              <div class="license-info-row">
                <div class="info-block">
                  <span class="info-label">REGISTERED LICENSEE</span>
                  <span class="info-value">{licenseStore.licensee}</span>
                </div>
                <div class="info-block">
                  <span class="info-label">LICENSE TIER</span>
                  <span class="info-value">Studio Pro (Perpetual)</span>
                </div>
                <div class="info-block">
                  <span class="info-label">ACTIVATION DATE</span>
                  <span class="info-value">{licenseStore.issuedDate || '2026-09-14'}</span>
                </div>
              </div>

              <div class="info-block key-block">
                <span class="info-label">ACTIVE CRYPTOGRAPHIC KEY</span>
                <div class="key-display-box">
                  <code>{licenseStore.licenseKey}</code>
                </div>
              </div>

              <div class="license-actions-row">
                <button
                  type="button"
                  class="btn-secondary danger-action"
                  onclick={() => licenseStore.deactivate()}
                >
                  Deactivate / Revert to Free Zen Tier
                </button>
              </div>
            </div>
          {:else}
            <!-- Activation Form -->
            <div class="license-activation-form">
              <div class="form-group">
                <label class="form-label" for="settings-license-key">Enter Offline Perpetual Key</label>
                <div class="license-input-wrapper">
                  <input
                    id="settings-license-key"
                    type="text"
                    class="form-input key-input font-mono"
                    bind:value={licenseInputKey}
                    placeholder="KANSO-PRO-XXXX-XXXX-VERIFIED"
                  />
                  <button
                    type="button"
                    class="btn-primary"
                    disabled={!licenseInputKey.trim() || licenseStore.isLoading}
                    onclick={async () => {
                      const ok = await licenseStore.activate(licenseInputKey);
                      if (ok) licenseInputKey = '';
                    }}
                  >
                    {licenseStore.isLoading ? 'Verifying...' : 'Activate Studio Pro'}
                  </button>
                </div>
                <span class="form-hint">
                  Keys are validated offline using cryptographic checksums. No internet connection or server verification required.
                </span>
              </div>

              <div class="quick-fill-row">
                <span class="quick-fill-label">Evaluation / Testing:</span>
                <button
                  type="button"
                  class="quick-fill-btn"
                  onclick={() => { licenseInputKey = 'KANSO-PRO-STUDIO-2026-ALPHA-VERIFIED'; }}
                >
                  Quick-fill Master Studio Alpha Key
                </button>
              </div>
            </div>

            <!-- Free vs Pro Comparison Grid -->
            <div class="comparison-section">
              <h3 class="comparison-title">Sanctuary vs. Commerce Feature Matrix</h3>
              <div class="matrix-grid">
                <div class="matrix-card">
                  <div class="matrix-header zen">
                    <h4>Kanso Zen</h4>
                    <span class="matrix-price">Free Forever</span>
                  </div>
                  <ul class="matrix-list">
                    <li>✓ Bullet Journal (Daily, Monthly, Yearly)</li>
                    <li>✓ Atelier Notes (Fleeting, Literature, Permanent)</li>
                    <li>✓ Bi-Directional Backlinks &amp; Graph</li>
                    <li>✓ Retro Cassette Focus Radio &amp; Lo-Fi Streams</li>
                    <li>✓ Copywriting Studio &amp; Readability Telemetry</li>
                    <li>✓ 100% Plain Markdown Storage</li>
                    <li class="disabled">✗ Limited to 1 Active Client</li>
                    <li class="disabled">✗ No PDF Invoice &amp; Quote Generation</li>
                  </ul>
                </div>

                <div class="matrix-card featured">
                  <div class="matrix-header pro">
                    <h4>Kanso Studio Pro</h4>
                    <span class="matrix-price">$39 One-Time Perpetual</span>
                  </div>
                  <ul class="matrix-list">
                    <li>✓ Everything in Kanso Zen</li>
                    <li>✓ <strong>Unlimited Client Dossiers &amp; Hub</strong></li>
                    <li>✓ <strong>Dual-Pane YAML Invoice &amp; Quote Studio</strong></li>
                    <li>✓ <strong>Print-Ready A4/Letter PDF Generation</strong></li>
                    <li>✓ <strong>Tactile Billable Chronometer &amp; Earnings Ticker</strong></li>
                    <li>✓ <strong>Standardized 5-Folder Project Scaffolding</strong></li>
                    <li>✓ <strong>Studio Brand Profile Auto-Stamping</strong></li>
                    <li>✓ <strong>100% Offline Forever — Zero Subscriptions</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>

    <!-- ═══════════ TAB 7: ABOUT KANSO CRE8 ═══════════ -->
    {:else if activeTab === 'about'}
      <div class="settings-grid">
        <!-- Hero Card -->
        <div class="card-surface about-hero-card">
          <div class="about-hero-content">
            <div class="about-emblem-badge">
              <span class="emblem-kanji">簡素</span>
              <span class="emblem-tag">ZEN VAULT</span>
            </div>
            <div class="about-titles">
              <div class="about-title-row">
                <h2 class="about-hero-title">Kanso Cre8</h2>
                <span class="version-badge">v0.1.0-zen</span>
              </div>
              <p class="about-hero-subtitle">The Mindful Creative Vault — an offline-first, local-first creative operations, client hub, and knowledge engine for freelance designers.</p>
            </div>
          </div>

          <!-- Git Repository Link Box -->
          <div class="git-repository-box">
            <div class="git-repo-left">
              <div class="git-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </div>
              <div class="git-repo-meta">
                <span class="git-repo-title">Official Git Repository</span>
                <span class="git-repo-url">https://github.com/manaphassan/Kanso-Cre8</span>
              </div>
            </div>

            <div class="git-repo-actions">
              <button type="button" class="btn-secondary" onclick={copyGitUrl}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy URL</span>
              </button>
              <a
                href="https://github.com/manaphassan/Kanso-Cre8"
                target="_blank"
                rel="noreferrer"
                class="btn-primary link-out"
              >
                <span>View on GitHub</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- 4 Creative Pillars Bento -->
        <div class="pillars-bento-grid">
          <div class="pillar-card">
            <div class="pillar-icon">📂</div>
            <h3 class="pillar-title">Pure Markdown Storage</h3>
            <p class="pillar-desc">Zero SQL or SQLite binary files. 100% human-readable UTF-8 files and YAML frontmatter openable anytime in VS Code or Obsidian with zero database lock-in.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon">⏱️</div>
            <h3 class="pillar-title">Tactile Billable Chronometer</h3>
            <p class="pillar-desc">Real-time design rate chronometer with live accrued dollar ticker, active client swatch 1-click copy, and seamless 1-click append to draft invoice markdown manifests.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon">📻</div>
            <h3 class="pillar-title">Mechanical Retro Focus Audio</h3>
            <p class="pillar-desc">Faithful dual-spool mechanical cassette deck rotating at 33 RPM, integrated Web Audio real-time DSP, Lo-Fi streams (AnimeFM, Initial D), Side A/B flips, and favorite station tuner presets.</p>
          </div>

          <div class="pillar-card">
            <div class="pillar-icon">📐</div>
            <h3 class="pillar-title">24pt Typography Handoff</h3>
            <p class="pillar-desc">Strict mathematical hierarchy: Red Hat Display for expressive titles &ge; 24pt, and Nunito for UI clarity &lt; 24pt. Zero font mixing within a single line.</p>
          </div>
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
    max-width: 100%;
    margin: 0;
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
    font-family: var(--font-display);
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

  :global([data-theme="eink"]) .tab-btn.active {
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

  .studio-logo-display {
    border-radius: 12px;
  }

  /* Signature & Seal Display */
  .signature-display {
    width: 140px;
    height: 52px;
    border: 1px dashed var(--kanso-border);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--kanso-surface);
    overflow: hidden;
    flex-shrink: 0;
  }

  .signature-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .signature-placeholder {
    font-size: 11px;
    color: var(--kanso-text-muted);
    font-weight: 700;
  }

  /* Live Stationery Preview Card */
  .stationery-preview-card {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.04) 0%, rgba(16, 185, 129, 0.03) 100%), var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    padding: 20px;
    border-radius: 12px;
  }

  .stationery-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .preview-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .preview-badge {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 3px 8px;
    border-radius: 4px;
  }

  .preview-sub {
    font-size: 12.5px;
    color: var(--kanso-text-muted);
  }

  .currency-badge {
    font-size: 11px;
    font-family: monospace;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-secondary);
  }

  .stationery-sheet-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--kanso-canvas);
    border: 1px dashed var(--kanso-border);
    border-radius: 10px;
    padding: 16px 20px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .sheet-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .sheet-logo-monogram {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 20px;
    font-weight: 800;
    overflow: hidden;
    flex-shrink: 0;
    border: 1.5px solid var(--kanso-border);
  }

  .sheet-logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sheet-title-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sheet-studio-name {
    font-size: 17px;
    font-weight: 800;
    color: var(--kanso-text-primary);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .sheet-tagline {
    font-size: 12px;
    color: var(--kanso-text-muted);
    font-style: italic;
    margin: 0;
  }

  .sheet-meta-row {
    display: flex;
    gap: 10px;
    font-size: 11.5px;
    color: var(--kanso-text-muted);
    margin-top: 4px;
    flex-wrap: wrap;
  }

  .sheet-reg-tag {
    font-family: monospace;
    font-weight: 700;
    color: var(--kanso-accent);
  }

  .sheet-loc-tag {
    color: var(--kanso-text-secondary);
  }

  .sheet-contact-tag {
    color: var(--kanso-text-muted);
  }

  .sheet-header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }

  .doc-type-pill {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #10B981;
    background: rgba(16, 185, 129, 0.12);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .sheet-doc-no {
    font-size: 16px;
    font-weight: 800;
    color: var(--kanso-text-primary);
  }

  .sheet-bank-pill {
    font-size: 11px;
    color: var(--kanso-text-muted);
  }

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
    font-size: 12px;
    font-weight: 800;
    padding: 2px 7px;
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
  .font-bold { font-weight: 700; }

  /* Card Header Badge Row */
  .card-header-badge-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .storage-pill {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 3px 10px;
    border-radius: 9999px;
  }

  /* Active Vault Banner */
  .active-vault-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 10px;
    flex-wrap: wrap;
  }

  .vault-mount-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 260px;
    flex: 1;
  }

  .vault-status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: #10B981;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 10px #10B981;
  }

  .vault-path-text {
    font-family: monospace;
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    word-break: break-all;
  }

  .vault-mount-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tag-chip {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    padding: 4px 10px;
    border-radius: 6px;
  }

  /* Custom Mount Box */
  .custom-mount-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--kanso-border);
  }

  .mount-input-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .flex-1 {
    flex: 1;
    min-width: 240px;
  }

  .mount-hint {
    font-size: 12.5px;
    color: var(--kanso-text-muted);
    margin: 0;
    line-height: 1.45;
  }

  /* Canonical Tree Visualizer */
  .canonical-tree-card {
    gap: 16px;
  }

  .vault-tree-view {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 10px;
    overflow: hidden;
    font-family: var(--font-ui);
  }

  .tree-root-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    background: var(--kanso-surface);
    border-bottom: 1px solid var(--kanso-border);
    font-size: 13.5px;
    font-weight: 700;
  }

  .tree-root-icon {
    font-size: 16px;
  }

  .tree-root-path {
    font-family: monospace;
    color: var(--kanso-text-primary);
  }

  .tree-root-badge {
    margin-left: auto;
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.1);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .tree-branches {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tree-node-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tree-node-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: all 0.14s ease;
    font-family: inherit;
  }

  .tree-node-header:hover {
    background: var(--kanso-surface);
    border-color: var(--kanso-border);
  }

  .tree-chevron {
    font-size: 10px;
    color: var(--kanso-text-muted);
    transition: transform 0.16s ease;
    display: inline-block;
  }

  .tree-chevron.expanded {
    transform: rotate(90deg);
  }

  .tree-chevron.small {
    font-size: 8px;
  }

  .folder-glyph, .file-glyph {
    font-size: 14px;
    flex-shrink: 0;
  }

  .folder-name {
    font-family: monospace;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .folder-role {
    font-size: 12.5px;
    color: var(--kanso-text-muted);
    margin-left: 6px;
  }

  .folder-count {
    margin-left: auto;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .tree-children {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-left: 24px;
    border-left: 1px dashed var(--kanso-border);
    margin-left: 14px;
    margin-top: 2px;
  }

  .tree-sub-children {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-left: 20px;
    border-left: 1px dashed var(--kanso-border);
    margin-left: 12px;
  }

  .tree-sub-sub-children {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 16px;
    margin-top: 2px;
  }

  .tree-leaf {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 5px;
    font-size: 13px;
  }

  .tree-leaf:hover {
    background: var(--kanso-surface);
  }

  .tree-leaf.highlight {
    background: rgba(56, 189, 248, 0.05);
    border: 1px solid rgba(56, 189, 248, 0.15);
  }

  .tree-leaf.mini {
    padding: 3px 6px;
    font-size: 12px;
  }

  .leaf-name {
    font-family: monospace;
    color: var(--kanso-text-primary);
  }

  .leaf-desc {
    font-size: 12px;
    color: var(--kanso-text-muted);
    margin-left: 4px;
  }

  .sub-leaf-glyph {
    font-family: monospace;
    color: var(--kanso-text-muted);
    opacity: 0.6;
  }

  .leaf-code {
    font-family: monospace;
    font-weight: 700;
    color: var(--kanso-accent);
  }

  .leaf-role {
    color: var(--kanso-text-muted);
    margin-left: 4px;
  }

  .tree-sub-header {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    font-family: inherit;
    text-align: left;
  }

  .tree-sub-header:hover {
    background: var(--kanso-surface);
  }

  /* About Kanso Cre8 Page */
  .about-hero-card {
    gap: 24px;
    padding: 32px 28px;
    border: 1px solid var(--kanso-border);
  }

  .about-hero-content {
    display: flex;
    align-items: flex-start;
    gap: 24px;
    flex-wrap: wrap;
  }

  .about-emblem-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    border-radius: 16px;
    background: var(--kanso-canvas);
    border: 1.5px solid var(--kanso-border);
    flex-shrink: 0;
  }

  .emblem-kanji {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--kanso-text-primary);
    line-height: 1.1;
  }

  .emblem-tag {
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--kanso-accent);
  }

  .about-titles {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 280px;
  }

  .about-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .about-hero-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .version-badge {
    font-family: monospace;
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 3px 10px;
    border-radius: 9999px;
  }

  .about-hero-subtitle {
    font-family: var(--font-ui);
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--kanso-text-muted);
    margin: 0;
  }

  /* Git Repository Box */
  .git-repository-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 10px;
    flex-wrap: wrap;
  }

  .git-repo-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .git-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--kanso-text-primary);
    flex-shrink: 0;
  }

  .git-repo-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .git-repo-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--kanso-text-muted);
  }

  .git-repo-url {
    font-family: monospace;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--kanso-text-primary);
  }

  .git-repo-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .link-out {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
  }

  /* Pillars Bento Grid */
  .pillars-bento-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  @media (max-width: 768px) {
    .pillars-bento-grid {
      grid-template-columns: 1fr;
    }
  }

  .pillar-card {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pillar-icon {
    font-size: 24px;
    margin-bottom: 2px;
  }

  .pillar-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    margin: 0;
  }

  .pillar-desc {
    font-size: 13px;
    line-height: 1.5;
    color: var(--kanso-text-muted);
    margin: 0;
  }

  /* Studio Edition & Offline License Styles */
  .tab-pro-pill {
    font-family: var(--font-mono, monospace);
    font-size: 10px;
    font-weight: 800;
    color: #F59E0B;
    background: rgba(245, 158, 11, 0.14);
    border: 1px solid rgba(245, 158, 11, 0.3);
    padding: 1px 5px;
    border-radius: 4px;
    letter-spacing: 0.04em;
    margin-left: 4px;
  }

  .license-header-flex {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .edition-badge-wrap {
    display: inline-block;
  }

  .edition-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.06em;
    padding: 3px 9px;
    border-radius: 4px;
  }

  .edition-badge.pro {
    background: rgba(245, 158, 11, 0.12);
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.28);
  }

  .edition-badge.zen {
    background: rgba(56, 189, 248, 0.12);
    color: var(--kanso-accent);
    border: 1px solid rgba(56, 189, 248, 0.28);
  }

  .offline-badge-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #10B981;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.25);
    padding: 4px 12px;
    border-radius: 9999px;
  }

  .active-license-details {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .license-info-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 16px;
  }

  .info-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--kanso-text-muted);
  }

  .info-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .key-block {
    margin-top: 8px;
  }

  .key-display-box {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 4px;
  }

  .key-display-box code {
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    color: var(--kanso-accent);
    word-break: break-all;
  }

  .license-activation-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .license-input-wrapper {
    display: flex;
    gap: 10px;
    margin-top: 6px;
  }

  .key-input {
    flex: 1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .quick-fill-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .quick-fill-label {
    font-size: 12px;
    color: var(--kanso-text-muted);
  }

  .quick-fill-btn {
    background: transparent;
    border: 1px dashed var(--kanso-border);
    color: var(--kanso-accent);
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .quick-fill-btn:hover {
    background: rgba(56, 189, 248, 0.1);
    border-color: var(--kanso-accent);
  }

  .comparison-section {
    margin-top: 14px;
    border-top: 1px solid var(--kanso-border);
    padding-top: 20px;
  }

  .comparison-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--kanso-text-primary);
    margin: 0 0 14px 0;
  }

  .matrix-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }

  .matrix-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .matrix-card.featured {
    border-color: rgba(245, 158, 11, 0.4);
    background: rgba(245, 158, 11, 0.03);
  }

  .matrix-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    border-bottom: 1px solid var(--kanso-border);
    padding-bottom: 8px;
  }

  .matrix-header h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .matrix-price {
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-muted);
  }

  .matrix-header.pro .matrix-price {
    color: #F59E0B;
  }

  .matrix-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .matrix-list li {
    font-size: 13px;
    color: var(--kanso-text-primary);
    line-height: 1.4;
  }

  .matrix-list li.disabled {
    color: var(--kanso-text-muted);
    opacity: 0.6;
  }

  .danger-action {
    color: #EF4444;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .danger-action:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  /* E-Ink Monochrome Overrides */
  :global([data-theme="eink"]) .storage-pill,
  :global([data-theme="eink"]) .tree-root-badge,
  :global([data-theme="eink"]) .version-badge {
    background: #000000 !important;
    color: #FFFFFF !important;
    border: 1px solid #000000 !important;
  }

  :global([data-theme="eink"]) .active-vault-banner,
  :global([data-theme="eink"]) .vault-tree-view,
  :global([data-theme="eink"]) .git-repository-box,
  :global([data-theme="eink"]) .spec-item,
  :global([data-theme="eink"]) .pillar-card {
    border-color: #000000 !important;
  }

  :global([data-theme="eink"]) .status-pulse-dot {
    background: #000000 !important;
    box-shadow: none !important;
  }

  :global([data-theme="eink"]) .status-text {
    color: #000000 !important;
  }

  :global([data-theme="eink"]) .tree-leaf.highlight {
    background: #F0F0F0 !important;
    border-color: #000000 !important;
  }

  :global([data-theme="eink"]) .candidate-row.is-current {
    border-color: #000000 !important;
    background: #F0F0F0 !important;
  }
</style>
