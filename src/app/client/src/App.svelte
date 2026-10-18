<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { ApiClient } from '$lib/services/api';
  import Toast from '$lib/components/ui/Toast.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { IconName } from '$lib/components/ui/Icon.svelte';
  import DashboardView from '$lib/views/DashboardView.svelte';
  import ProjectsView from '$lib/views/ProjectsView.svelte';
  import ProjectDetailView from '$lib/views/ProjectDetailView.svelte';
  import ClientsMoneyView from '$lib/views/ClientsMoneyView.svelte';
  import NotesView from '$lib/views/NotesView.svelte';
  import MiniCassetteDock from '$lib/components/radio/MiniCassetteDock.svelte';
  import RadioDrawer from '$lib/components/radio/RadioDrawer.svelte';
  import SettingsView from '$lib/views/SettingsView.svelte';
  import ClientReviewView from '$lib/views/ClientReviewView.svelte';
  import JournalView from '$lib/views/JournalView.svelte';
  import NotificationDrawer from '$lib/components/features/NotificationDrawer.svelte';
  import CommandPaletteModal from '$lib/components/features/CommandPaletteModal.svelte';
  import HeaderTimerWidget from '$lib/components/features/HeaderTimerWidget.svelte';
  import QuickScratchpadModal from '$lib/components/features/QuickScratchpadModal.svelte';
  import ZenMicroBar from '$lib/components/features/ZenMicroBar.svelte';
  import VaultSwitcherModal from '$lib/components/features/VaultSwitcherModal.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';

  let commandPaletteOpen = $state(false);
  let scratchpadOpen = $state(false);
  let vaultSwitcherOpen = $state(false);

  interface NavItem {
    id: string;
    label: string;
    route: string;
    icon: IconName;
    shortcut: string;
    matchRoutes?: string[];
  }

  // Canonical 6-Item Navigation System (kanso-ui-minimal)
  const navItems: NavItem[] = [
    { id: 'deck', label: 'Deck', route: 'dashboard', icon: 'dashboard', shortcut: '⌘1', matchRoutes: ['dashboard'] },
    { id: 'projects', label: 'Projects', route: 'projects', icon: 'folder', shortcut: '⌘2', matchRoutes: ['projects', 'project-detail', 'deliverables', 'copy-studio'] },
    { id: 'journal', label: 'Journal', route: 'journal', icon: 'calendar', shortcut: '⌘3', matchRoutes: ['journal'] },
    { id: 'notes', label: 'Notes', route: 'notes', icon: 'file', shortcut: '⌘4', matchRoutes: ['notes', 'zettel'] },
    { id: 'finance', label: 'Clients & Money', route: 'clients', icon: 'wallet', shortcut: '⌘5', matchRoutes: ['clients', 'invoices'] },
    { id: 'settings', label: 'Settings', route: 'settings', icon: 'settings', shortcut: '⌘6', matchRoutes: ['settings', 'profile'] }
  ];

  function isActive(item: NavItem): boolean {
    return item.matchRoutes ? item.matchRoutes.includes(appState.currentRoute) : appState.currentRoute === item.route;
  }

  const pageTitles: Record<string, string> = {
    dashboard: 'Studio Deck',
    projects: 'Projects',
    'project-detail': 'Project Workspace',
    deliverables: 'Review Queue',
    journal: 'Bullet Journal',
    clients: 'Clients & Brand Hub',
    invoices: 'Quotes & Invoices',
    notes: 'Atelier Notes',
    zettel: 'Atelier Notes',
    radio: 'Focus Radio',
    'copy-studio': 'Copywriting Studio',
    settings: 'Studio Settings',
    profile: 'Studio Settings'
  };

  const currentTitle = $derived(
    appState.currentRoute === 'project-detail' && appState.routeParams.id
      ? appState.routeParams.id
      : (pageTitles[appState.currentRoute] ?? 'Studio Deck')
  );

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && appState.isZenMode) {
      e.preventDefault();
      appState.exitZenMode();
      return;
    }

    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (!isCmdOrCtrl) return;
    const key = e.key.toLowerCase();

    // Ctrl+Shift+Z: Toggle Quiet Mode / Zen Atelier Mode
    if (e.shiftKey && key === 'z') {
      e.preventDefault();
      appState.toggleZenMode();
      return;
    }

    // Ctrl+1 to Ctrl+6: Canonical 6 Navigation Items
    if (key === '1') { e.preventDefault(); appState.navigate('dashboard'); return; }
    if (key === '2') { e.preventDefault(); appState.navigate('projects'); return; }
    if (key === '3') { e.preventDefault(); appState.navigate('journal'); return; }
    if (key === '4') { e.preventDefault(); appState.navigate('notes'); return; }
    if (key === '5') { e.preventDefault(); appState.navigate('clients'); return; }
    if (key === '6') { e.preventDefault(); appState.navigate('settings'); return; }

    // Ctrl+O: Vault Switcher
    if (key === 'o') {
      e.preventDefault();
      vaultSwitcherOpen = !vaultSwitcherOpen;
      return;
    }

    // Ctrl+Shift+K: Quick Scratchpad
    if (e.shiftKey && key === 'k') {
      e.preventDefault();
      scratchpadOpen = !scratchpadOpen;
      return;
    }

    // Ctrl+K: Command Palette
    if (!e.shiftKey && key === 'k') {
      e.preventDefault();
      commandPaletteOpen = !commandPaletteOpen;
      return;
    }

    // Ctrl+Alt+T or Ctrl+Shift+T: Toggle Billable Timer Play/Pause
    if ((e.altKey || e.shiftKey) && key === 't') {
      e.preventDefault();
      if (timerStore.isRunning) {
        timerStore.pause();
        appState.addToast('Billable timer paused', 'info');
      } else if (timerStore.isPaused) {
        timerStore.resume();
        appState.addToast('Billable timer resumed', 'info');
      } else {
        timerStore.start();
        appState.addToast('Billable timer started', 'info');
      }
      return;
    }
  }

  onMount(() => {
    // Notify native desktop launcher to dissolve the native splash screen
    if ((window as any).chrome?.webview) {
      try {
        (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'SPLASH_DISMISS' }));
        (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'SET_THEME', theme: appState.theme }));
      } catch (e) {
        console.warn('WebView2 postMessage failed', e);
      }
    }

    // Smoothly dissolve boot splash screen once workspace is mounted
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (typeof (window as any).dismissKansoSplash === 'function') {
          (window as any).dismissKansoSplash();
        }
      }, 500);
    });

    function handleRouteFromHash() {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('review') || window.location.search.includes('token=')) {
        appState.currentRoute = 'review';
        return;
      }
      if (!hash || hash === 'login') { appState.currentRoute = 'dashboard'; return; }
      const parts = hash.split('/');
      let route = parts[0];
      if (route === 'zettel') route = 'notes';
      if (route === 'radio') {
        appState.radioDrawerOpen = true;
        route = 'dashboard';
      }
      const id = parts[1] ? decodeURIComponent(parts[1]) : undefined;
      appState.currentRoute = (route && route !== 'login') ? route : 'dashboard';
      appState.routeParams = id ? { id } : {};
    }

    window.addEventListener('hashchange', handleRouteFromHash);
    handleRouteFromHash();

    (async () => {
      if (appState.currentRoute !== 'review') {
        await appState.loadCurrentUser();
      }
    })();

    // Initialize real-time SSE listener
    const closeSse = ApiClient.initEventStream((event, data) => {
      if (event === 'connection:status') {
        appState.sseStatus = data.status;
        if (data.status === 'connected') {
          appState.lastSyncedAt = new Date();
        }
      } else if (event === 'workspace:updated' || event === 'project:updated') {
        appState.lastSyncedAt = new Date();
        projectStore.loadProjects();
        vaultStore.scanVault();
        if (appState.currentRoute === 'dashboard') {
          projectStore.loadDashboard();
        } else if (appState.currentRoute === 'project-detail' && appState.routeParams.id) {
          projectStore.loadProjectDetail(appState.routeParams.id);
        } else if (appState.currentRoute === 'deliverables') {
          projectStore.loadDeliverables();
        }
        window.dispatchEvent(new CustomEvent('workspace:updated', { detail: data }));
      } else if (event === 'project:decision') {
        appState.lastSyncedAt = new Date();
        appState.addToast(`${data.reviewer} marked ${data.projectId} as ${(data.decision || '').replace('_', ' ')}`, 'info', 'Decision Updated');
        projectStore.loadProjects();
        if (appState.currentRoute === 'dashboard') {
          projectStore.loadDashboard();
        } else if (appState.currentRoute === 'project-detail' && appState.routeParams.id === data.projectId) {
          projectStore.loadProjectDetail(data.projectId);
        }
        window.dispatchEvent(new CustomEvent('workspace:updated', { detail: data }));
      } else if (event === 'comment:added') {
        appState.lastSyncedAt = new Date();
        if (data.comment?.author !== appState.currentUser?.name) {
          appState.addToast(`${data.comment?.author}: ${data.comment?.content?.substring(0, 40) || ''}...`, 'info', 'New Comment');
        }
        if (appState.currentRoute === 'project-detail' && appState.routeParams.id === data.projectId) {
          projectStore.loadProjectDetail(data.projectId);
        }
      } else if (event === 'comment:resolved') {
        appState.lastSyncedAt = new Date();
        if (appState.currentRoute === 'project-detail' && appState.routeParams.id === data.projectId) {
          projectStore.loadProjectDetail(data.projectId);
        }
      }
    });

    return () => {
      closeSse();
    };
  });
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if appState.currentRoute === 'review'}
  <ClientReviewView />
{:else}
  <div class="app-shell" class:zen-mode-active={appState.isZenMode}>
    <!-- ═══ 6-ITEM SIDEBAR + MINI-CASSETTE DOCK ═════════════════════════ -->
    <aside class="app-sidebar" aria-label="Main Navigation">
      <div class="sidebar-header">
        <button
          class="brand-btn"
          onclick={() => appState.navigate('dashboard')}
          title="Kanso Cre8 Studio Deck (⌘1)"
          aria-label="Kanso Cre8 Home"
        >
          <svg class="brand-mark" viewBox="0 0 128 128" width="28" height="28" aria-hidden="true">
            <rect width="128" height="128" rx="28" fill="#131816" stroke="#252F29" stroke-width="2"/>
            <text x="63" y="66" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="900" font-size="48" fill="#00E5FF" opacity="0.5" letter-spacing="1">簡素</text>
            <text x="65" y="66" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="900" font-size="48" fill="#FF1744" opacity="0.5" letter-spacing="1">簡素</text>
            <text x="64" y="66" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="900" font-size="48" fill="#F4F3EE" letter-spacing="1">簡素</text>
            <text x="64" y="104" text-anchor="middle" font-family="'Red Hat Display', 'Inter', sans-serif" font-weight="900" font-size="24" fill="#FF5722" letter-spacing="3">CRE8</text>
          </svg>
          <span class="brand-text">Kanso Cre8</span>
        </button>
      </div>

      <nav class="sidebar-nav">
        {#each navItems as item}
          <button
            class="nav-item-btn"
            class:active={isActive(item)}
            onclick={() => appState.navigate(item.route)}
            title="{item.label} ({item.shortcut})"
            aria-label="{item.label} ({item.shortcut})"
          >
            <span class="nav-icon">
              <Icon name={item.icon} size={18} />
            </span>
            <span class="nav-label">{item.label}</span>
            <kbd class="nav-kbd">{item.shortcut}</kbd>
          </button>
        {/each}
      </nav>

      <div class="sidebar-footer">
        <MiniCassetteDock />
      </div>
    </aside>

    <!-- ═══ MAIN VIEWPORT ═══════════════════════════════════════════════ -->
    <div class="app-main">
      <!-- ═══ PRECISION STUDIO INSTRUMENT HEADER ═════════════════════════ -->
      <header class="app-header">
        <div class="header-left">
          <div class="header-breadcrumbs">
            <span class="bc-root">Kanso Cre8</span>
            <span class="bc-sep" aria-hidden="true">/</span>
            <span class="bc-current">{currentTitle}</span>
            {#if appState.currentRoute === 'project-detail' && appState.routeParams.id}
              <span class="bc-sep" aria-hidden="true">/</span>
              <span class="bc-subview">{appState.routeParams.id}</span>
            {/if}
          </div>
        </div>

        <div class="header-center">
          <HeaderTimerWidget />
        </div>

        <div class="header-right">
          <button
            class="header-search-btn"
            onclick={() => (commandPaletteOpen = true)}
            aria-label="Open Command Palette (Ctrl K)"
            title="Command Palette (Ctrl+K)"
          >
            <Icon name="search" size={14} />
            <span class="search-placeholder">Jump to…</span>
            <kbd class="search-shortcut">⌘K</kbd>
          </button>

          <button
            class="icon-btn"
            onclick={() => (scratchpadOpen = true)}
            title="Quick Scratchpad (Ctrl+Shift+K)"
            aria-label="Quick Scratchpad"
          >
            <Icon name="edit" size={15} />
          </button>

          <button
            class="icon-btn zen-toggle-btn"
            class:active={appState.isZenMode}
            onclick={() => appState.toggleZenMode()}
            title="Quiet Mode / Zen Atelier Mode (Ctrl+Shift+Z)"
            aria-label="Toggle Quiet Mode"
          >
            <Icon name="sparkle" size={15} />
          </button>

          <button
            class="icon-btn"
            onclick={() => { appState.addToast('Rescanning workspace…', 'info'); projectStore.loadProjects(); projectStore.loadDashboard(); }}
            title="Rescan Workspace"
            aria-label="Rescan workspace"
          >
            <Icon name="refresh" size={15} />
          </button>
        </div>
      </header>

      <!-- ═══ VIEW PANE ═════════════════════════════════════════════════ -->
      <div class="page-body">
        <section class="view-pane layout-full">
          {#if appState.currentRoute === 'dashboard'}
            <DashboardView />
          {:else if appState.currentRoute === 'journal'}
            <JournalView />
          {:else if appState.currentRoute === 'projects'}
            <ProjectsView />
          {:else if appState.currentRoute === 'project-detail'}
            <ProjectDetailView projectId={appState.routeParams.id} />
          {:else if appState.currentRoute === 'deliverables'}
            <ProjectDetailView projectId={appState.routeParams.id || (projectStore.projects[0]?.id ?? '')} initialTab="deliverables" />
          {:else if appState.currentRoute === 'copy-studio'}
            <ProjectDetailView projectId={appState.routeParams.id || (projectStore.projects[0]?.id ?? '')} initialTab="copywriting" />
          {:else if appState.currentRoute === 'clients'}
            <ClientsMoneyView initialTab="clients" />
          {:else if appState.currentRoute === 'invoices'}
            <ClientsMoneyView initialTab="invoices" />
          {:else if appState.currentRoute === 'notes' || appState.currentRoute === 'zettel'}
            <NotesView />
          {:else if appState.currentRoute === 'settings' || appState.currentRoute === 'profile'}
            <SettingsView />
          {:else}
            <DashboardView />
          {/if}
        </section>
      </div>
    </div>
  </div>

  {#if appState.isZenMode}
    <ZenMicroBar
      currentTitle={currentTitle}
      onOpenScratchpad={() => (scratchpadOpen = true)}
    />
  {/if}

  <CommandPaletteModal
    bind:open={commandPaletteOpen}
    onClose={() => (commandPaletteOpen = false)}
  />

  <NotificationDrawer
    bind:open={appState.notificationDrawerOpen}
    onclose={() => (appState.notificationDrawerOpen = false)}
  />

  <QuickScratchpadModal
    bind:open={scratchpadOpen}
    onclose={() => (scratchpadOpen = false)}
  />

  <VaultSwitcherModal
    bind:open={vaultSwitcherOpen}
    onclose={() => (vaultSwitcherOpen = false)}
  />

  <RadioDrawer
    bind:open={appState.radioDrawerOpen}
    onclose={() => (appState.radioDrawerOpen = false)}
  />
{/if}

<Toast />

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--kanso-canvas);
    color: var(--kanso-text-primary);
  }

  /* Quiet Mode / Zen Atelier Mode */
  .app-shell.zen-mode-active .app-sidebar {
    display: none;
  }
  .app-shell.zen-mode-active .app-header {
    display: none;
  }
  .app-shell.zen-mode-active .app-main {
    width: 100vw;
    min-width: 100vw;
  }
  .app-shell.zen-mode-active .page-body {
    padding-bottom: 84px;
  }

  .icon-btn.zen-toggle-btn.active {
    color: var(--kanso-accent);
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
  }

  /* ═══ SIDEBAR ═══════════════════════════════════════════════════════ */
  .app-sidebar {
    width: 230px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--kanso-surface);
    border-right: 1px solid var(--kanso-border);
    user-select: none;
    transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-header {
    height: 48px;
    display: flex;
    align-items: center;
    padding: 0 var(--kanso-space-3);
    border-bottom: 1px solid var(--kanso-border);
  }

  .brand-btn {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--kanso-text-primary);
    text-decoration: none;
    font-family: inherit;
  }

  .brand-mark {
    border-radius: var(--kanso-radius-sm);
    flex-shrink: 0;
  }

  .brand-text {
    font-family: var(--kanso-font-display);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }

  .sidebar-nav {
    flex: 1;
    padding: var(--kanso-space-2);
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .nav-item-btn {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    padding: var(--kanso-space-2) var(--kanso-space-3);
    border-radius: var(--kanso-radius-md);
    background: transparent;
    border: 1px solid transparent;
    color: var(--kanso-text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    text-align: left;
    width: 100%;
    box-sizing: border-box;
  }

  .nav-item-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }

  .nav-item-btn.active {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border-color: var(--kanso-border);
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-kbd {
    font-family: var(--kanso-font-mono);
    font-size: 10.5px;
    color: var(--kanso-text-muted);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    padding: 1px 4px;
    border-radius: 4px;
  }

  .sidebar-footer {
    padding: var(--kanso-space-2);
    border-top: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
  }

  /* ═══ RESPONSIVE SIDEBAR COLLAPSE (< 960px & ANDROID) ═══════════════ */
  @media (max-width: 960px) {
    .app-sidebar {
      width: 58px;
    }
    .brand-text, .nav-label, .nav-kbd {
      display: none;
    }
    .sidebar-header {
      justify-content: center;
      padding: 0;
    }
    .sidebar-nav {
      padding: var(--kanso-space-2) var(--kanso-space-1);
    }
    .nav-item-btn {
      justify-content: center;
      padding: var(--kanso-space-2) 0;
    }
    .sidebar-footer {
      padding: var(--kanso-space-1);
    }
    .sidebar-footer :global(.mini-track-btn),
    .sidebar-footer :global(.mini-arrow-btn),
    .sidebar-footer :global(.mini-freq-badge) {
      display: none;
    }
    .sidebar-footer :global(.mini-dock-container) {
      padding: 0 4px;
      justify-content: center;
    }
  }

  /* ═══ MAIN CONTENT AREA ═════════════════════════════════════════════ */
  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100vh;
    overflow: hidden;
    background: var(--kanso-canvas);
  }

  .app-header {
    height: 48px;
    flex-shrink: 0;
    background: var(--kanso-surface);
    border-bottom: 1px solid var(--kanso-border);
    padding: 0 var(--kanso-space-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--kanso-space-3);
    box-sizing: border-box;
  }

  .header-left {
    display: flex;
    align-items: center;
    min-width: 0;
    flex-shrink: 0;
  }

  .header-breadcrumbs {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    font-size: 13px;
  }

  .bc-root {
    color: var(--kanso-text-muted);
    font-weight: 500;
  }

  .bc-sep {
    color: var(--kanso-text-muted);
    opacity: 0.5;
  }

  .bc-current {
    color: var(--kanso-text-primary);
    font-weight: 600;
  }

  .bc-subview {
    color: var(--kanso-accent);
    font-weight: 500;
  }

  .header-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-width: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    flex-shrink: 0;
  }

  .header-search-btn {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    padding: 5px 10px;
    border-radius: var(--kanso-radius-md);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
  }

  .header-search-btn:hover {
    border-color: var(--kanso-accent);
    color: var(--kanso-text-primary);
  }

  .search-shortcut {
    font-family: var(--kanso-font-mono);
    font-size: 10px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--kanso-radius-md);
    background: transparent;
    border: 1px solid transparent;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .icon-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border-color: var(--kanso-border);
  }

  .page-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .view-pane {
    flex: 1;
    min-height: 0;
  }
</style>
