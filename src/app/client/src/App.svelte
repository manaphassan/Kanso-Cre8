<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentToast from '$lib/components/ui/FluentToast.svelte';
  import FluentDialog from '$lib/components/ui/FluentDialog.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import DashboardView from '$lib/views/DashboardView.svelte';
  import ProjectsView from '$lib/views/ProjectsView.svelte';
  import ProjectDetailView from '$lib/views/ProjectDetailView.svelte';
  import DeliverablesView from '$lib/views/DeliverablesView.svelte';
  import CopyStudioView from '$lib/views/CopyStudioView.svelte';
  import ClientsView from '$lib/views/ClientsView.svelte';
  import InvoiceStudioView from '$lib/views/InvoiceStudioView.svelte';
  import ZettelView from '$lib/views/ZettelView.svelte';
  import RadioView from '$lib/views/RadioView.svelte';
  import MiniCassetteDock from '$lib/components/radio/MiniCassetteDock.svelte';
  import TeamView from '$lib/views/TeamView.svelte';
  import AdminView from '$lib/views/AdminView.svelte';
  import SettingsView from '$lib/views/SettingsView.svelte';
  import ClientReviewView from '$lib/views/ClientReviewView.svelte';
  import JournalView from '$lib/views/JournalView.svelte';
  import NotificationDrawer from '$lib/components/features/NotificationDrawer.svelte';
  import CommandPaletteModal from '$lib/components/features/CommandPaletteModal.svelte';
  import HeaderTimerWidget from '$lib/components/features/HeaderTimerWidget.svelte';
  import QuickScratchpadModal from '$lib/components/features/QuickScratchpadModal.svelte';
  import { timerStore } from '$lib/stores/timerStore.svelte';

  let commandPaletteOpen = $state(false);
  let scratchpadOpen = $state(false);
  let serverVersion = $state('0.1.0');

  function handleGlobalKeydown(e: KeyboardEvent) {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (!isCmdOrCtrl) return;
    const key = e.key.toLowerCase();

    // Ctrl+1 to Ctrl+9: Command-First Instant View Jumps
    if (key === '1') { e.preventDefault(); appState.navigate('dashboard'); return; }
    if (key === '2') { e.preventDefault(); appState.navigate('projects'); return; }
    if (key === '3') { e.preventDefault(); appState.navigate('journal'); return; }
    if (key === '4') { e.preventDefault(); appState.navigate('clients'); return; }
    if (key === '5') { e.preventDefault(); appState.navigate('invoices'); return; }
    if (key === '6') { e.preventDefault(); appState.navigate('zettel'); return; }
    if (key === '7') { e.preventDefault(); appState.navigate('copy-studio'); return; }
    if (key === '8') { e.preventDefault(); appState.navigate('radio'); return; }
    if (key === '9') { e.preventDefault(); appState.navigate('settings'); return; }

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

    // Ctrl+Shift+J: Bullet Journal
    if (e.shiftKey && key === 'j') {
      e.preventDefault();
      appState.navigate('journal');
      return;
    }

    // Ctrl+Shift+I: Quotes & Invoices Studio
    if (e.shiftKey && key === 'i') {
      e.preventDefault();
      appState.navigate('invoices');
      return;
    }

    // Ctrl+Shift+T: Toggle Focus Chronometer
    if (e.shiftKey && key === 't') {
      e.preventDefault();
      if (timerStore.isRunning) {
        timerStore.stop();
        appState.addToast('Focus chronometer stopped & session logged', 'info');
      } else if (timerStore.isPaused) {
        timerStore.resume();
        appState.addToast('Focus chronometer resumed', 'info');
      } else {
        timerStore.start();
        appState.addToast('Focus chronometer started', 'info');
      }
      return;
    }
  }

  onMount(() => {
    function handleRouteFromHash() {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('review') || window.location.search.includes('token=')) {
        appState.currentRoute = 'review';
        return;
      }
      if (!hash || hash === 'login') { appState.currentRoute = 'dashboard'; return; }
      const parts = hash.split('/');
      const route = parts[0];
      const id = parts[1] ? decodeURIComponent(parts[1]) : undefined;
      appState.currentRoute = (route && route !== 'login') ? route : 'dashboard';
      appState.routeParams = id ? { id } : {};
    }

    window.addEventListener('hashchange', handleRouteFromHash);
    handleRouteFromHash();

    if (window.location.search.includes('nav=open')) {
      appState.viewSwitcherOpen = true;
    }

    (async () => {
      if (appState.currentRoute !== 'review') {
        await appState.loadCurrentUser();
      }
      try {
        const statusRes = await fetch('/api/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData?.version) serverVersion = statusData.version;
        }
      } catch { /* non-critical */ }
    })();

    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-menu-wrapper')) {
        appState.userMenuOpen = false;
      }
      if (!target.closest('.view-switcher-wrapper')) {
        appState.viewSwitcherOpen = false;
      }
    });

    function handleResize() {
      if (window.innerWidth < 900) {
        appState.sidebarExpanded = false;
        appState.sidebarRail = false;
      } else {
        if (!appState.sidebarExpanded && !appState.sidebarRail) {
          appState.sidebarExpanded = true;
        }
      }
    }
    window.addEventListener('resize', handleResize);
    handleResize();

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
        if (appState.currentRoute === 'dashboard') {
          projectStore.loadDashboard();
        } else if (appState.currentRoute === 'project-detail' && appState.routeParams.id) {
          projectStore.loadProjectDetail(appState.routeParams.id);
        } else if (appState.currentRoute === 'deliverables') {
          projectStore.loadDeliverables();
        }
        window.dispatchEvent(new CustomEvent('workspace:updated', { detail: data }));
      } else if (event === 'team:updated') {
        appState.lastSyncedAt = new Date();
        window.dispatchEvent(new CustomEvent('team:updated', { detail: data }));
      } else if (event === 'company:updated') {
        appState.lastSyncedAt = new Date();
        window.dispatchEvent(new CustomEvent('company:updated', { detail: data }));
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
          appState.addToast(`${data.comment?.author}: ${data.comment?.content?.substring(0, 40) || ''}...`, 'info', 'New Project Comment');
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

  // Clear Geometric Line Icon System (Lucide/Feather Studio Minimalist)
  const dashIcon    = `<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>`;
  const journalIcon = `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>`;
  const folderIcon  = `<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>`;
  const reviewIcon  = `<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`;
  const radioIcon   = `<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>`;
  const clientIcon  = `<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>`;
  const invoiceIcon = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>`;
  const zettelIcon  = `<path d="M16 3H5a2 2 0 0 0-2 2v11"/><rect x="8" y="7" width="13" height="14" rx="2"/><line x1="11" y1="12" x2="18" y2="12"/><line x1="11" y1="16" x2="16" y2="16"/>`;
  const teamIcon    = `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`;
  const pencilIcon  = `<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>`;
  const adminIcon   = `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`;

  const pageConfig: Record<string, { title: string; layout: string; icon: string; parent?: string }> = {
    dashboard:        { title: 'Studio Deck',          layout: 'layout-full', icon: dashIcon },
    journal:          { title: 'Bullet Journal',       layout: 'layout-full', icon: journalIcon },
    projects:         { title: 'Project Manager',      layout: 'layout-full', icon: folderIcon },
    'project-detail': { title: 'Project Workspace',    layout: 'layout-full', icon: folderIcon, parent: 'projects' },
    deliverables:     { title: 'Review Queue',          layout: 'layout-full', icon: reviewIcon },
    clients:          { title: 'Clients & Brand Hub',   layout: 'layout-full', icon: clientIcon },
    invoices:         { title: 'Quotes & Invoices',    layout: 'layout-full', icon: invoiceIcon },
    zettel:           { title: 'Atelier Notes',        layout: 'layout-full', icon: zettelIcon },
    radio:            { title: 'Focus Radio',          layout: 'layout-full', icon: radioIcon },
    'copy-studio':    { title: 'Copywriting Studio',    layout: 'layout-full', icon: pencilIcon },
    settings:         { title: 'Settings',             layout: 'layout-full', icon: adminIcon },
    profile:          { title: 'Settings',             layout: 'layout-full', icon: adminIcon },
  };

  const currentConfig = $derived(pageConfig[appState.currentRoute] ?? { title: 'Kanso Cre8', layout: 'layout-full', icon: dashIcon });
  const currentTitle  = $derived(
    appState.currentRoute === 'project-detail' && appState.routeParams.id
      ? appState.routeParams.id
      : currentConfig.title
  );

  const breadcrumbs = $derived.by(() => {
    const crumbs: { label: string; route?: string }[] = [{ label: 'Kanso Cre8' }];
    const cfg = pageConfig[appState.currentRoute];
    if (!cfg) return crumbs;
    if (cfg.parent) {
      const p = pageConfig[cfg.parent];
      crumbs.push({ label: p?.title ?? cfg.parent, route: cfg.parent });
    }
    crumbs.push({ label: currentTitle });
    return crumbs;
  });

  function getShortcutBadge(route: string): string {
    switch (route) {
      case 'dashboard': return '⌘1';
      case 'projects': return '⌘2';
      case 'journal': return '⌘3';
      case 'clients': return '⌘4';
      case 'invoices': return '⌘5';
      case 'zettel': return '⌘6';
      case 'copy-studio': return '⌘7';
      case 'radio': return '⌘8';
      case 'settings': return '⌘9';
      default: return '';
    }
  }

  const navGroups = [
    { section: 'Creative Operations', items: [
      { route: 'dashboard',    label: 'Studio Deck',        icon: dashIcon },
      { route: 'projects',     label: 'Project Vaults',     icon: folderIcon, matchRoutes: ['projects','project-detail'] },
      { route: 'journal',      label: 'Bullet Journal',     icon: journalIcon },
    ]},
    { section: 'Client & Business Ops', items: [
      { route: 'clients',      label: 'Clients & Brands',   icon: clientIcon },
      { route: 'invoices',     label: 'Quotes & Invoices',  icon: invoiceIcon },
    ]},
    { section: 'Knowledge & Atelier', items: [
      { route: 'zettel',       label: 'Atelier Notes',      icon: zettelIcon },
      { route: 'copy-studio',  label: 'Copywriting Studio', icon: pencilIcon },
    ]},
    { section: 'Focus & Audio', items: [
      { route: 'radio',        label: 'Focus Radio',        icon: radioIcon },
    ]},
    { section: 'System & Storage', items: [
      { route: 'settings',     label: 'Settings',           icon: adminIcon },
    ]},
  ];

  function isActive(item: any) {
    return item.matchRoutes ? item.matchRoutes.includes(appState.currentRoute) : appState.currentRoute === item.route;
  }

  const userInitial = $derived((appState.currentUser?.name ?? 'U').charAt(0).toUpperCase());
  const isRail = $derived(appState.sidebarRail && appState.sidebarExpanded);
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if appState.currentRoute === 'review'}
  <ClientReviewView />
{:else}
  <div class="app-shell">
    <!-- ═══ 100% CANVAS MAIN VIEWPORT ═══════════════════════════════════ -->
    <div class="app-main">

      <!-- ═══ 50px PRECISION STUDIO INSTRUMENT HEADER ═════════════════ -->
      <header class="app-header">
        <div class="header-left">
          <!-- Tactile K8 Brand Badge -->
          <button
            class="k8-badge-btn"
            onclick={() => appState.navigate('dashboard')}
            title="Kanso Cre8 Studio Deck (⌘1)"
            aria-label="Kanso Cre8 Home"
          >
            <span class="k8-text">K8</span>
          </button>

          <!-- Touch & Click Friendly Studio Navigator Dropdown & Breadcrumbs -->
          <div class="view-switcher-wrapper">
            <button
              class="view-switcher-trigger"
              class:active={appState.viewSwitcherOpen}
              onclick={(e) => { e.stopPropagation(); appState.viewSwitcherOpen = !appState.viewSwitcherOpen; }}
              title="Studio Navigation (Touch or Click to switch views)"
              aria-label="Studio Navigation Menu"
              aria-expanded={appState.viewSwitcherOpen}
            >
              <div class="header-breadcrumbs">
                <span class="bc-root">Kanso Cre8</span>
                <span class="bc-sep" aria-hidden="true">/</span>
                <span class="bc-current">{currentTitle}</span>
                {#if appState.currentRoute === 'project-detail' && appState.routeParams.id}
                  <span class="bc-sep" aria-hidden="true">/</span>
                  <span class="bc-subview">{appState.routeParams.id}</span>
                {/if}
              </div>
              <svg class="view-caret" class:open={appState.viewSwitcherOpen} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
            </button>

            {#if appState.viewSwitcherOpen}
              <div class="view-switcher-dropdown" role="menu" aria-label="Studio Views">
                <div class="dropdown-header">
                  <span class="dropdown-header-title">Studio Navigation</span>
                  <span class="dropdown-header-shortcut">Touch to Switch</span>
                </div>
                <div class="dropdown-grid">
                  {#each navGroups as group}
                    <div class="dropdown-group-label">{group.section}</div>
                    {#each group.items as item}
                      <button
                        class="dropdown-item-btn"
                        class:active={isActive(item)}
                        onclick={() => {
                          appState.navigate(item.route);
                          appState.viewSwitcherOpen = false;
                        }}
                      >
                        <span class="dropdown-item-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            {@html item.icon}
                          </svg>
                        </span>
                        <span class="dropdown-item-label">{item.label}</span>
                        {#if item.route === 'deliverables' && projectStore.pendingReviewCount > 0}
                          <span class="dropdown-item-count">{projectStore.pendingReviewCount}</span>
                        {/if}
                        <kbd class="dropdown-item-kbd">{getShortcutBadge(item.route)}</kbd>
                      </button>
                    {/each}
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <div class="header-center">
          <HeaderTimerWidget />
          <button class="header-search-btn" onclick={() => (commandPaletteOpen = true)} aria-label="Open Command Palette (Ctrl K)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="search-ico" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span class="search-placeholder">Jump to…</span>
            <kbd class="search-shortcut">⌘K</kbd>
          </button>
        </div>

        <div class="header-right">
          <!-- Studio Theme Segmented Pill (Kai-Zen / Dark / Light / E-Ink) -->
          <div class="tri-theme-pill" role="group" aria-label="Theme Switcher">
            <button
              class="theme-btn"
              class:active={appState.theme === 'oceanic' || appState.theme === 'oceanic-light'}
              onclick={() => appState.setTheme(appState.theme === 'oceanic' ? 'oceanic-light' : 'oceanic')}
              title="Kai-Zen (海禅 — Oceanic Zen)"
              aria-label="Kai-Zen Oceanic Theme"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12c.6 0 1.2-.5 2-1 1.4-.9 2.8-.9 4.2 0 1.4.9 2.8.9 4.2 0 1.4-.9 2.8-.9 4.2 0 .8.5 1.4 1 2 1"/><path d="M2 17c.6 0 1.2-.5 2-1 1.4-.9 2.8-.9 4.2 0 1.4.9 2.8.9 4.2 0 1.4-.9 2.8-.9 4.2 0 .8.5 1.4 1 2 1"/>
              </svg>
              <span class="theme-text">Kai-Zen</span>
            </button>
            <button
              class="theme-btn"
              class:active={appState.theme === 'dark'}
              onclick={() => appState.setTheme('dark')}
              title="Studio Obsidian (Dark)"
              aria-label="Dark Mode"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
              <span class="theme-text">Dark</span>
            </button>
            <button
              class="theme-btn"
              class:active={appState.theme === 'light'}
              onclick={() => appState.setTheme('light')}
              title="Atelier Paper (Light)"
              aria-label="Light Mode"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
              <span class="theme-text">Light</span>
            </button>
            <button
              class="theme-btn"
              class:active={appState.theme === 'eink'}
              onclick={() => appState.setTheme('eink')}
              title="Zen Monochrome (E-Ink)"
              aria-label="E-Ink Mode"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
              </svg>
              <span class="theme-text">E-Ink</span>
            </button>
          </div>

          <!-- Real-Time Vault Live Sync Pill -->
          <div
            class="live-sync-pill"
            class:connected={appState.sseStatus === 'connected'}
            class:reconnecting={appState.sseStatus === 'reconnecting'}
            title={appState.lastSyncedAt ? `Live SSE Synced with Synology Vault. Last event: ${appState.lastSyncedAt.toLocaleTimeString()}` : 'Connecting to live vault stream...'}
          >
            <span class="live-pulse-dot" aria-hidden="true"></span>
            <span class="live-label">
              {appState.sseStatus === 'connected' ? 'Live Synced' : appState.sseStatus === 'reconnecting' ? 'Reconnecting' : 'Syncing'}
            </span>
          </div>

          <!-- Quick Scratchpad Launcher -->
          <button
            class="icon-btn scratchpad-btn"
            onclick={() => (scratchpadOpen = true)}
            title="Quick Scratchpad (Ctrl+Shift+K)"
            aria-label="Quick Scratchpad"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
            </svg>
          </button>

          <button
            class="icon-btn"
            onclick={() => { appState.addToast('Rescanning workspace…', 'info'); projectStore.loadProjects(); projectStore.loadDashboard(); }}
            title="Rescan Workspace"
            aria-label="Rescan workspace"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
            </svg>
          </button>

          <!-- Settings Quick Action (⌘9) -->
          <button
            class="header-settings-btn"
            class:active={appState.currentRoute === 'settings'}
            onclick={() => appState.navigate('settings')}
            title="Studio Settings & Workspace Preferences (⌘9)"
            aria-label="Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span class="settings-btn-label">Settings</span>
        </div>
      </header>

      <!-- PAGE CONTENT -->
      <div class="page-body">
        <section class="view-pane {currentConfig.layout}">
          {#if appState.currentRoute === 'dashboard'}
            <DashboardView />
          {:else if appState.currentRoute === 'journal'}
            <JournalView />
          {:else if appState.currentRoute === 'projects'}
            <ProjectsView />
          {:else if appState.currentRoute === 'project-detail'}
            <ProjectDetailView projectId={appState.routeParams.id} />
          {:else if appState.currentRoute === 'deliverables'}
            <DeliverablesView />
          {:else if appState.currentRoute === 'clients'}
            <ClientsView />
          {:else if appState.currentRoute === 'invoices'}
            <InvoiceStudioView />
          {:else if appState.currentRoute === 'zettel'}
            <ZettelView />
          {:else if appState.currentRoute === 'radio'}
            <RadioView />
          {:else if appState.currentRoute === 'copy-studio'}
            <CopyStudioView />
          {:else if appState.currentRoute === 'team'}
            <TeamView />
          {:else if appState.currentRoute === 'admin'}
            <AdminView />
          {:else if appState.currentRoute === 'settings' || appState.currentRoute === 'profile'}
            <SettingsView />
          {:else}
            <DashboardView />
          {/if}
        </section>

        <!-- Persistent Retro Mini Cassette Dock -->
        {#if appState.currentRoute !== 'radio'}
          <div class="mini-cassette-dock-wrap">
            <MiniCassetteDock />
          </div>
        {/if}
      </div>

      <!-- ═══ MOBILE BOTTOM NAVIGATION DOCK (<768px) ═════════════════ -->
      <nav class="mobile-bottom-dock" aria-label="Mobile Navigation">
        <a
          href="#dashboard"
          class="dock-link"
          class:active={appState.currentRoute === 'dashboard'}
          aria-label="Dashboard"
        >
          <svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {@html dashIcon}
          </svg>
          <span class="dock-text">Deck</span>
        </a>
        <a
          href="#projects"
          class="dock-link"
          class:active={appState.currentRoute === 'projects' || appState.currentRoute === 'project-detail'}
          aria-label="Projects"
        >
          <svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {@html folderIcon}
          </svg>
          <span class="dock-text">Projects</span>
        </a>
        <a
          href="#journal"
          class="dock-link"
          class:active={appState.currentRoute === 'journal'}
          aria-label="Bullet Journal"
        >
          <svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {@html journalIcon}
          </svg>
          <span class="dock-text">Journal</span>
        </a>
        <a
          href="#invoices"
          class="dock-link"
          class:active={appState.currentRoute === 'invoices'}
          aria-label="Quotes and Invoices"
        >
          <svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {@html invoiceIcon}
          </svg>
          <span class="dock-text">Invoices</span>
        </a>
        <a
          href="#settings"
          class="dock-link"
          class:active={appState.currentRoute === 'settings'}
          aria-label="Settings"
        >
          <svg class="dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {@html adminIcon}
          </svg>
          <span class="dock-text">Settings</span>
        </a>
      </nav>
    </div>
  </div>

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


{/if}

<FluentToast />

<style>
  /* ═══ SHELL ════════════════════════════════════════════════════ */
  /* ═══ COMMAND-FIRST ZEN HUD SHELL ══════════════════════════════════ */
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    position: relative;
    background: var(--kanso-canvas);
    color: var(--kanso-text-primary);
  }

  /* ═══ FLOATING RETRO CASSETTE DOCK ═══════════════════════════════ */
  .mini-cassette-dock-wrap {
    position: fixed;
    bottom: 16px;
    right: 20px;
    z-index: 150;
    max-width: 380px;
    width: calc(100vw - 40px);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (max-width: 768px) {
    .mini-cassette-dock-wrap {
      bottom: 68px; /* sits above mobile bottom dock (56px) */
      right: 12px;
      left: 12px;
      width: auto;
      max-width: none;
    }
  }

  /* ═══ MAIN ══════════════════════════════════════════════════════ */
  .app-main {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100vh;
    overflow: hidden;
    min-width: 0;
    background: var(--kanso-canvas);
  }

  /* ═══ HEADER ════════════════════════════════════════════════════ */
  .app-header {
    height: 52px;
    flex-shrink: 0;
    background: var(--kanso-surface);
    border-bottom: 1px solid var(--kanso-border);
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 200;
    box-shadow: var(--shadow-sm);
    box-sizing: border-box;
  }
  .header-left  { display: flex; align-items: center; gap: 8px; min-width: 0; flex-shrink: 0; }
  .header-center { min-width: 0; display: flex; align-items: center; gap: 10px; flex: 1; justify-content: center; max-width: 720px; }
  .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

  /* Tactile K8 Brand Badge */
  .k8-badge-btn {
    width: 32px;
    height: 32px;
    border-radius: 7px;
    background: var(--kanso-accent-muted, rgba(222, 105, 75, 0.14));
    border: 1px solid rgba(222, 105, 75, 0.35);
    color: var(--kanso-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.14s ease, border-color 0.14s ease;
    flex-shrink: 0;
  }
  .k8-badge-btn:hover {
    transform: scale(1.06);
    border-color: var(--kanso-accent);
  }
  .k8-text {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  /* View Switcher */
  .view-switcher-wrapper {
    position: relative;
  }
  .view-switcher-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    height: 38px;
    border-radius: 8px;
    border: 1px solid var(--kanso-border);
    background: var(--kanso-surface);
    color: var(--kanso-text-primary);
    cursor: pointer;
    touch-action: manipulation;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .view-switcher-trigger:hover, .view-switcher-trigger.active {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
  }
  .view-icon-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--kanso-accent);
  }
  .view-title-text {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--kanso-text-primary);
    white-space: nowrap;
  }
  .view-caret {
    color: var(--kanso-text-muted);
    transition: transform 0.2s ease;
  }
  .view-caret.open {
    transform: rotate(180deg);
  }

  .bc-sep {
    color: var(--kanso-text-muted);
    font-size: 14px;
    margin: 0 2px;
  }
  .bc-subview {
    font-size: 14px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    white-space: nowrap;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* View Switcher Dropdown Popover */
  .view-switcher-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 340px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 12px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    z-index: 600;
    overflow: hidden;
    animation: dropIn 0.15s ease;
    padding: 8px;
  }
  .dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 10px;
    border-bottom: 1px solid var(--kanso-border);
    margin-bottom: 6px;
  }
  .dropdown-header-title {
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--kanso-text-muted);
  }
  .dropdown-header-shortcut {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--kanso-accent);
    background: rgba(56, 189, 248, 0.12);
    padding: 2px 8px;
    border-radius: 4px;
  }
  .dropdown-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 520px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
  .dropdown-group-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--kanso-text-muted);
    padding: 8px 10px 4px;
  }
  .dropdown-item-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    min-height: 44px;
    box-sizing: border-box;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--kanso-text-primary);
    cursor: pointer;
    touch-action: manipulation;
    transition: background 0.12s, color 0.12s;
    font-family: inherit;
    text-align: left;
    font-size: 14.5px;
    font-weight: 600;
  }
  .dropdown-item-btn:hover {
    background: var(--kanso-surface-hover);
  }
  .dropdown-item-btn:active {
    background: rgba(56, 189, 248, 0.2);
  }
  .dropdown-item-btn.active {
    background: rgba(56, 189, 248, 0.14);
    color: var(--kanso-accent);
  }
  .dropdown-item-icon {
    flex-shrink: 0;
  }
  .dropdown-item-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dropdown-item-count {
    font-size: 12px;
    font-weight: 700;
    background: #EF4444;
    color: #FFFFFF;
    padding: 2px 7px;
    border-radius: 9999px;
  }
  .dropdown-item-kbd {
    font-size: 12px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
  }

  /* Elegant Header Breadcrumbs */
  .header-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    user-select: none;
  }
  .bc-root {
    color: var(--kanso-text-muted);
    font-weight: 500;
  }
  .bc-sep {
    color: var(--kanso-border);
    font-size: 12px;
  }
  .bc-current {
    color: var(--kanso-text-primary);
    font-weight: 600;
    letter-spacing: -0.1px;
  }
  .bc-subview {
    color: var(--kanso-accent);
    font-weight: 600;
    font-family: var(--font-mono, monospace);
    font-size: 12.5px;
  }

  /* Tri-Theme Switcher Pill */
  .tri-theme-pill {
    display: inline-flex;
    align-items: center;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 2px;
    gap: 3px;
    height: 38px;
    box-sizing: border-box;
  }
  .theme-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--kanso-text-muted);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    transition: all 0.14s ease;
  }
  .theme-btn:hover {
    color: var(--kanso-text-primary);
    background: var(--kanso-surface-hover);
  }
  .theme-btn.active {
    background: var(--kanso-surface-active);
    color: var(--kanso-text-primary);
    font-weight: 700;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  [data-theme="eink"] .theme-btn.active {
    background: #000000;
    color: #FFFFFF;
  }

  .header-search-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: 8px;
    padding: 0 14px;
    width: 100%;
    max-width: 320px;
    height: 38px;
    cursor: pointer;
    text-align: left;
    transition: all .15s ease;
  }
  .header-search-btn:hover {
    border-color: var(--kanso-accent);
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }
  .search-ico { color: var(--kanso-text-muted); flex-shrink: 0; }
  .search-placeholder {
    flex: 1;
    color: var(--kanso-text-muted);
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .search-shortcut {
    font-size: 12px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-family: inherit;
  }

  .icon-btn {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 8px;
    cursor: pointer;
    transition: background .14s, color .14s;
  }
  .icon-btn:hover { background: var(--surface-card-hover); color: var(--text-primary); }

  .notif-btn { position: relative; }
  .notif-count {
    position: absolute;
    top: 2px;
    right: 2px;
    background: #EF4444;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    padding: 0 5px;
    border-radius: 9999px;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    border: 1.5px solid var(--surface-card);
  }

  /* Live Sync Pill */
  .live-sync-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.22);
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 700;
    color: #059669;
    user-select: none;
    transition: all 0.2s ease;
  }
  .live-sync-pill.reconnecting {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.25);
    color: #D97706;
  }
  .live-pulse-dot {
    width: 6.5px;
    height: 6.5px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    animation: livePulse 2s infinite;
  }
  .live-sync-pill.reconnecting .live-pulse-dot {
    background: #F59E0B;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
    animation: livePulse 0.8s infinite;
  }
  @keyframes livePulse {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.25); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.8; }
  }
  .live-label {
    letter-spacing: 0.2px;
  }

  .vault-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-accent);
    background: var(--brand-tint);
    border: 1px solid rgba(4,51,136,.12);
    padding: 5px 12px;
    border-radius: 8px;
    white-space: nowrap;
    transition: background .14s;
  }
  .vault-link:hover { background: #dbeeff; }

  /* Header Settings Action */
  .header-settings-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-muted);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .header-settings-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border-color: rgba(255, 255, 255, 0.2);
  }
  .header-settings-btn.active {
    background: rgba(56, 189, 248, 0.12);
    border-color: var(--kanso-accent);
    color: var(--kanso-accent);
  }
  .settings-btn-label {
    letter-spacing: -0.1px;
  }

  /* ═══ PAGE BODY ═════════════════════════════════════════════════ */
  .page-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }

  /* Layout Contracts: 100% Full Width & Maximum Creative Workspace */
  .view-pane {
    min-height: calc(100vh - 52px);
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 20px 24px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .view-pane.layout-fluid,
  .view-pane.layout-page,
  .view-pane.layout-full,
  .view-pane.layout-narrow {
    padding: 20px 24px;
    max-width: 100%;
    width: 100%;
    margin: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 52px);
    box-sizing: border-box;
  }

  /* Mobile bottom dock - strictly hidden on desktop */
  .mobile-bottom-dock {
    display: none;
  }
  .dock-icon {
    width: 20px;
    height: 20px;
  }

  /* Mobile overlay */
  .mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.4);
    z-index: 150;
    backdrop-filter: blur(2px);
  }

  /* ═══ RESPONSIVE ════════════════════════════════════════════════ */
  @media (max-width: 900px) {
    .app-shell { grid-template-columns: 1fr !important; }
    .app-sidebar {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: 260px !important;
      z-index: 300;
      overflow-y: auto;
      transform: translateX(-100%);
      transition: transform .25s cubic-bezier(0.4,0,0.2,1);
      box-shadow: var(--shadow-xl);
    }
    .app-shell:not(.sidebar-hidden) .app-sidebar { transform: translateX(0); }
    .mobile-overlay  { display: block; }
    .vault-link      { display: none; }
    .mobile-bottom-dock {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .mobile-bottom-dock {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 56px;
      background: var(--bg-sidebar);
      border-top: 1px solid var(--sidebar-border);
      align-items: center;
      justify-content: space-around;
      padding: 0 4px calc(env(safe-area-inset-bottom, 0px) + 2px) 4px;
      z-index: 900;
      backdrop-filter: blur(12px);
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
    }
    .dock-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      flex: 1;
      padding: 6px 2px;
      color: var(--sidebar-text-muted);
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: color 0.15s, background 0.15s;
      background: transparent;
      border: none;
      cursor: pointer;
      min-height: 44px;
    }
    .dock-link.active {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.12);
    }
    .dock-link.active .dock-icon {
      color: var(--brand-accent);
    }
    .dock-icon {
      width: 20px;
      height: 20px;
    }
    .dock-icon-wrap {
      position: relative;
      display: inline-flex;
    }
    .dock-badge {
      position: absolute;
      top: -4px;
      right: -8px;
      background: var(--color-danger);
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 800;
      min-width: 17px;
      height: 17px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
    }
    .dock-text {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .page-body {
      padding-bottom: 64px;
    }
  }

  @media (max-width: 600px) {
    .header-center { display: none; }
    .breadcrumb    { display: none; }
    .user-info     { display: none; }
    .chevron       { display: none; }
    .app-header    { padding: 0 16px; }
  }

  /* ═══ DOWNLOAD MODAL ═════════════════════════════════════════════ */
  .download-modal-content {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 6px 0;
  }
  .download-platform-card {
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .platform-header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .platform-icon {
    font-size: 1.8rem;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: var(--surface-card);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--surface-card-border);
    flex-shrink: 0;
  }
  .platform-meta {
    flex: 1;
    min-width: 0;
  }
  .platform-title {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text-primary);
  }
  .platform-desc {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 2px;
  }
  .platform-actions {
    display: flex;
    gap: 10px;
  }
  .platform-download-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--brand-primary);
    color: #ffffff;
    font-weight: 600;
    font-size: 0.85rem;
    padding: 9px 16px;
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background 0.15s, transform 0.15s;
  }
  .platform-download-btn:hover {
    background: var(--brand-secondary);
    transform: translateY(-1px);
    color: #ffffff;
  }
  .platform-link-btn {
    display: inline-flex;
    align-items: center;
    background: var(--surface-card);
    color: var(--brand-accent);
    border: 1px solid var(--surface-card-border);
    font-weight: 600;
    font-size: 0.85rem;
    padding: 8px 14px;
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background 0.15s;
  }
  .platform-link-btn:hover {
    background: var(--surface-card-hover);
  }
  .linux-terminal-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0F172A;
    border: 1px solid #1E293B;
    border-radius: var(--radius-md);
    padding: 10px 14px;
    gap: 12px;
    overflow-x: auto;
  }
  .linux-terminal-box code {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: #38BDF8;
    white-space: nowrap;
  }
  .copy-cmd-btn {
    background: #1E293B;
    color: #F8FAFC;
    border: 1px solid #334155;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .copy-cmd-btn:hover {
    background: #334155;
  }
</style>
