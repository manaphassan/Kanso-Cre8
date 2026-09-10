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
    if (key === '4') { e.preventDefault(); appState.navigate('deliverables'); return; }
    if (key === '5') { e.preventDefault(); appState.navigate('invoices'); return; }
    if (key === '6') { e.preventDefault(); appState.navigate('zettel'); return; }
    if (key === '7') { e.preventDefault(); appState.navigate('clients'); return; }
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

  const dashIcon    = `<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>`;
  const journalIcon = `<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>`;
  const folderIcon  = `<path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>`;
  const reviewIcon  = `<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>`;
  const radioIcon   = `<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>`;
  const clientIcon  = `<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>`;
  const invoiceIcon = `<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>`;
  const zettelIcon  = `<path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>`;
  const teamIcon    = `<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>`;
  const pencilIcon  = `<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>`;
  const adminIcon   = `<path d="M19 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/>`;

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
      case 'deliverables': return '⌘4';
      case 'invoices': return '⌘5';
      case 'zettel': return '⌘6';
      case 'clients': return '⌘7';
      case 'radio': return '⌘8';
      case 'settings': return '⌘9';
      default: return '';
    }
  }

  const navGroups = [
    { section: 'Creative Operations', items: [
      { route: 'dashboard',    label: 'Studio Deck',        icon: dashIcon },
      { route: 'journal',      label: 'Bullet Journal',     icon: journalIcon },
      { route: 'projects',     label: 'Project Vaults',     icon: folderIcon, matchRoutes: ['projects','project-detail'] },
      { route: 'deliverables', label: 'Review Queue',       icon: reviewIcon, badge: true },
      { route: 'radio',        label: 'Focus Radio',        icon: radioIcon },
    ]},
    { section: 'Knowledge & Second Brain', items: [
      { route: 'zettel',       label: 'Atelier Notes',      icon: zettelIcon },
      { route: 'copy-studio',  label: 'Copywriting Studio', icon: pencilIcon },
    ]},
    { section: 'Client & Business Ops', items: [
      { route: 'clients',      label: 'Clients & Brands',   icon: clientIcon },
      { route: 'invoices',     label: 'Quotes & Invoices',  icon: invoiceIcon },
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

          <!-- Elegant Breadcrumbs -->
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
          <button class="header-search-btn" onclick={() => (commandPaletteOpen = true)} aria-label="Open Command Palette (Ctrl K)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="search-ico" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <span class="search-placeholder">Jump to…</span>
            <kbd class="search-shortcut">⌘K</kbd>
          </button>
        </div>

        <div class="header-right">
          <!-- Tri-Theme Segmented Pill (Dark / Light / E-Ink) -->
          <div class="tri-theme-pill" role="group" aria-label="Theme Switcher">
            <button
              class="theme-btn"
              class:active={appState.theme === 'dark'}
              onclick={() => appState.setTheme('dark')}
              title="Studio Obsidian (Dark)"
              aria-label="Dark Mode"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>

          <button
            class="icon-btn"
            onclick={() => { appState.addToast('Rescanning workspace…', 'info'); projectStore.loadProjects(); projectStore.loadDashboard(); }}
            title="Rescan Workspace"
            aria-label="Rescan workspace"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/>
            </svg>
            <span class="settings-btn-label">Settings</span>
          </button>
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
          <svg class="dock-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
          <svg class="dock-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {@html folderIcon}
          </svg>
          <span class="dock-text">Projects</span>
        </a>
        <a
          href="#deliverables"
          class="dock-link"
          class:active={appState.currentRoute === 'deliverables'}
          aria-label="Review Queue"
        >
          <div class="dock-icon-wrap">
            <svg class="dock-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {@html reviewIcon}
            </svg>
            {#if projectStore.pendingReviewCount > 0}
              <span class="dock-badge">{projectStore.pendingReviewCount}</span>
            {/if}
          </div>
          <span class="dock-text">Review</span>
        </a>
        <a
          href="#team"
          class="dock-link"
          class:active={appState.currentRoute === 'team'}
          aria-label="Team Workload"
        >
          <svg class="dock-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {@html teamIcon}
          </svg>
          <span class="dock-text">Team</span>
        </a>
        <a
          href="#settings"
          class="dock-link"
          class:active={appState.currentRoute === 'settings'}
          aria-label="Settings"
        >
          <svg class="dock-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .view-switcher-trigger:hover {
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
    gap: 6px;
    max-height: 480px;
    overflow-y: auto;
  }
  .dropdown-group-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--kanso-text-muted);
    padding: 6px 10px 4px;
  }
  .dropdown-item-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--kanso-text-primary);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
    font-family: inherit;
    text-align: left;
    font-size: 14.5px;
    font-weight: 600;
  }
  .dropdown-item-btn:hover {
    background: var(--kanso-surface-hover);
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
