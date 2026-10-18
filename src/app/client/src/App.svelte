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
  import VaultStartupGate from '$lib/components/vault/VaultStartupGate.svelte';
  import KeyboardOnboardingModal from '$lib/components/features/KeyboardOnboardingModal.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { vaultStore } from '$lib/stores/vaultStore.svelte';

  let commandPaletteOpen = $state(false);
  let scratchpadOpen = $state(false);
  let vaultSwitcherOpen = $state(false);
  let keyboardOnboardingOpen = $state(false);
  let overflowMenuOpen = $state(false);

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
    if (e.key === 'Escape' && (appState.viewSwitcherOpen || overflowMenuOpen)) {
      appState.viewSwitcherOpen = false;
      overflowMenuOpen = false;
      return;
    }
    if (e.key === 'Escape' && appState.isZenMode) {
      e.preventDefault();
      appState.exitZenMode();
      return;
    }

    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (!isCmdOrCtrl) {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        const active = document.activeElement;
        const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable);
        if (!isInput) {
          e.preventDefault();
          keyboardOnboardingOpen = !keyboardOnboardingOpen;
        }
      }
      return;
    }
    const key = e.key.toLowerCase();

    // Ctrl+/ or Cmd+/: Toggle Shortcuts Cheatsheet
    if (key === '/') {
      e.preventDefault();
      keyboardOnboardingOpen = !keyboardOnboardingOpen;
      return;
    }

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

    // Show keyboard onboarding on first run if not dismissed
    try {
      const dismissed = localStorage.getItem('kanso.onboarding_dismissed');
      if (dismissed !== 'true') {
        setTimeout(() => {
          if (appState.currentRoute !== 'review') {
            keyboardOnboardingOpen = true;
          }
        }, 1200);
      }
    } catch (_) {}

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

<svelte:window onkeydown={handleGlobalKeydown} onclick={() => { appState.viewSwitcherOpen = false; overflowMenuOpen = false; }} />

{#if appState.currentRoute === 'review'}
  <ClientReviewView />
{:else}
  <div class="app-shell" class:zen-mode-active={appState.isZenMode}>
    <!-- ═══ MAIN VIEWPORT (no sidebar: hamburger opens floating nav) ════ -->
    <div class="app-main">
      <!-- ═══ PRECISION STUDIO INSTRUMENT HEADER ═════════════════════════ -->
      <header class="app-header">
        <div class="header-left">
          <div class="nav-menu-wrapper">
            <button
              class="icon-btn hamburger-btn"
              class:active={appState.viewSwitcherOpen}
              onclick={(e) => { e.stopPropagation(); appState.viewSwitcherOpen = !appState.viewSwitcherOpen; }}
              title="Navigation"
              aria-label="Open navigation menu"
              aria-haspopup="menu"
              aria-expanded={appState.viewSwitcherOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            {#if appState.viewSwitcherOpen}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="nav-dropdown" role="menu" aria-label="Main Navigation" onclick={(e) => e.stopPropagation()}>
                <button
                  class="nav-brand-btn"
                  onclick={() => { appState.navigate('dashboard'); appState.viewSwitcherOpen = false; }}
                  aria-label="Kanso Cre8 Home"
                >
                  <svg class="brand-mark" viewBox="0 0 128 128" width="26" height="26" aria-hidden="true">
                    <rect width="128" height="128" rx="28" fill="#131816" stroke="#252F29" stroke-width="2"/>
                    <text x="64" y="66" text-anchor="middle" font-family="'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif" font-weight="900" font-size="48" fill="#F4F3EE" letter-spacing="1">簡素</text>
                    <text x="64" y="104" text-anchor="middle" font-family="'Red Hat Display', 'Inter', sans-serif" font-weight="900" font-size="24" fill="#FF5722" letter-spacing="3">CRE8</text>
                  </svg>
                  <span class="brand-text">Kanso Cre8</span>
                </button>

                <div class="nav-dropdown-list">
                  {#each navItems as item}
                    <button
                      class="nav-item-btn"
                      class:active={isActive(item)}
                      role="menuitem"
                      onclick={() => { appState.navigate(item.route); appState.viewSwitcherOpen = false; }}
                    >
                      <span class="nav-icon"><Icon name={item.icon} size={18} /></span>
                      <span class="nav-label">{item.label}</span>
                      <kbd class="nav-kbd">{item.shortcut}</kbd>
                    </button>
                  {/each}
                </div>

                <div class="nav-dropdown-footer">
                  <MiniCassetteDock />
                </div>
              </div>
            {/if}
          </div>

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

          <div class="overflow-menu-wrapper">
            <button
              class="icon-btn overflow-btn"
              class:active={overflowMenuOpen}
              onclick={(e) => { e.stopPropagation(); overflowMenuOpen = !overflowMenuOpen; }}
              title="More actions"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={overflowMenuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </button>

            {#if overflowMenuOpen}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_interactive_supports_focus -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <div class="overflow-dropdown" role="menu" tabindex="-1" aria-label="More actions" onclick={(e) => e.stopPropagation()}>
                <button
                  class="overflow-item-btn"
                  role="menuitem"
                  onclick={() => { appState.toggleZenMode(); overflowMenuOpen = false; }}
                >
                  <span class="overflow-icon"><Icon name="sparkle" size={15} /></span>
                  <span class="overflow-label">{appState.isZenMode ? 'Exit Quiet Mode' : 'Quiet Mode'}</span>
                  <kbd class="overflow-kbd">⌘⇧Z</kbd>
                </button>

                <button
                  class="overflow-item-btn"
                  role="menuitem"
                  onclick={() => { keyboardOnboardingOpen = true; overflowMenuOpen = false; }}
                >
                  <span class="overflow-icon"><Icon name="lightbulb" size={15} /></span>
                  <span class="overflow-label">Keyboard Shortcuts</span>
                  <kbd class="overflow-kbd">?</kbd>
                </button>

                <button
                  class="overflow-item-btn"
                  role="menuitem"
                  onclick={() => {
                    overflowMenuOpen = false;
                    appState.addToast('Rescanning workspace…', 'info');
                    projectStore.loadProjects();
                    projectStore.loadDashboard();
                  }}
                >
                  <span class="overflow-icon"><Icon name="refresh" size={15} /></span>
                  <span class="overflow-label">Rescan Workspace</span>
                </button>
              </div>
            {/if}
          </div>
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

  <VaultStartupGate />

  <KeyboardOnboardingModal
    bind:open={keyboardOnboardingOpen}
    onClose={() => (keyboardOnboardingOpen = false)}
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

  /* ═══ FLOATING NAV DROPDOWN (hamburger) ═════════════════════════════ */
  .header-left {
    gap: var(--kanso-space-3);
  }

  .nav-menu-wrapper {
    position: relative;
  }

  .hamburger-btn.active {
    color: var(--kanso-accent);
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
  }

  .nav-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 280px;
    max-width: calc(100vw - 24px);
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    z-index: 600;
    padding: var(--kanso-space-2);
    user-select: none;
    animation: navDropIn 0.15s ease;
  }

  @keyframes navDropIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .nav-brand-btn {
    display: flex;
    align-items: center;
    gap: var(--kanso-space-2);
    width: 100%;
    padding: var(--kanso-space-2) var(--kanso-space-3);
    margin-bottom: var(--kanso-space-1);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--kanso-border);
    border-radius: 0;
    cursor: pointer;
    color: var(--kanso-text-primary);
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

  .nav-dropdown-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-dropdown-footer {
    margin-top: var(--kanso-space-2);
    padding-top: var(--kanso-space-2);
    border-top: 1px solid var(--kanso-border);
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

  .overflow-menu-wrapper {
    position: relative;
  }

  .overflow-btn.active {
    color: var(--kanso-accent);
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-border);
  }

  .overflow-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 220px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg, 10px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    z-index: 600;
    padding: var(--kanso-space-1);
    display: flex;
    flex-direction: column;
    gap: 2px;
    user-select: none;
    animation: navDropIn 0.15s ease;
  }

  .overflow-item-btn {
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

  .overflow-item-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
  }

  .overflow-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .overflow-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .overflow-kbd {
    font-family: var(--kanso-font-mono);
    font-size: 10.5px;
    color: var(--kanso-text-muted);
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    padding: 1px 4px;
    border-radius: 4px;
  }

  .page-body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Single shared page frame: every view gets the same width and gutter. */
  .view-pane {
    flex: 1;
    min-height: 0;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--kanso-space-6, 24px);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
</style>
