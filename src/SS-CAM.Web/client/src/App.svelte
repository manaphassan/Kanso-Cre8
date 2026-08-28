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
  import TeamView from '$lib/views/TeamView.svelte';
  import AdminView from '$lib/views/AdminView.svelte';
  import ProfileView from '$lib/views/ProfileView.svelte';
  import LoginView from '$lib/views/LoginView.svelte';
  import NotificationDrawer from '$lib/components/features/NotificationDrawer.svelte';

  let showDownloadModal = $state(false);

  onMount(async () => {
    await appState.loadCurrentUser();

    function handleRouteFromHash() {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) { appState.currentRoute = 'dashboard'; return; }
      const parts = hash.split('/');
      const route = parts[0];
      const id = parts[1] ? decodeURIComponent(parts[1]) : undefined;
      appState.currentRoute = route || 'dashboard';
      appState.routeParams = id ? { id } : {};
    }

    window.addEventListener('hashchange', handleRouteFromHash);
    handleRouteFromHash();
    window.addEventListener('auth:required', () => appState.navigate('login'));

    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-menu-wrapper')) {
        appState.userMenuOpen = false;
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
      if (event === 'workspace:updated' || event === 'project:updated') {
        projectStore.loadProjects();
        if (appState.currentRoute === 'dashboard') {
          projectStore.loadDashboard();
        } else if (appState.currentRoute === 'project-detail' && appState.routeParams.id) {
          projectStore.loadProjectDetail(appState.routeParams.id);
        }
      } else if (event === 'project:decision') {
        appState.addToast(`${data.reviewer} marked ${data.projectId} as ${(data.decision || '').replace('_', ' ')}`, 'info', 'Decision Updated');
        projectStore.loadProjects();
        if (appState.currentRoute === 'project-detail' && appState.routeParams.id === data.projectId) {
          projectStore.loadProjectDetail(data.projectId);
        }
      } else if (event === 'comment:added') {
        if (data.comment?.author !== appState.currentUser?.name) {
          appState.addToast(`${data.comment?.author}: ${data.comment?.content?.substring(0, 40) || ''}...`, 'info', 'New Project Comment');
        }
      }
    });

    return () => {
      closeSse();
    };
  });

  const pageConfig: Record<string, { title: string; layout: string; parent?: string }> = {
    dashboard:        { title: 'Dashboard',          layout: 'layout-full' },
    projects:         { title: 'Project Catalog',    layout: 'layout-page' },
    'project-detail': { title: 'Project Workspace',  layout: 'layout-full', parent: 'projects' },
    deliverables:     { title: 'Review Queue',        layout: 'layout-page' },
    team:             { title: 'Team & Workload',     layout: 'layout-page' },
    'copy-studio':    { title: 'Copywriting Studio',  layout: 'layout-page' },
    admin:            { title: 'Administration',      layout: 'layout-full' },
    profile:          { title: 'My Profile',          layout: 'layout-narrow' },
  };

  const currentConfig = $derived(pageConfig[appState.currentRoute] ?? { title: 'SS-CAM', layout: 'layout-page' });
  const currentTitle  = $derived(
    appState.currentRoute === 'project-detail' && appState.routeParams.id
      ? appState.routeParams.id
      : currentConfig.title
  );

  const breadcrumbs = $derived.by(() => {
    const crumbs: { label: string; route?: string }[] = [{ label: 'SS-CAM Portal' }];
    const cfg = pageConfig[appState.currentRoute];
    if (!cfg) return crumbs;
    if (cfg.parent) {
      const p = pageConfig[cfg.parent];
      crumbs.push({ label: p?.title ?? cfg.parent, route: cfg.parent });
    }
    crumbs.push({ label: currentTitle });
    return crumbs;
  });

  const dashIcon   = `<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>`;
  const folderIcon = `<path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>`;
  const reviewIcon = `<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>`;
  const teamIcon   = `<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>`;
  const pencilIcon = `<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>`;
  const adminIcon  = `<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/>`;

  const navGroups = [
    { section: 'Management & Visibility', items: [
      { route: 'dashboard',    label: 'Dashboard',          icon: dashIcon },
      { route: 'projects',     label: 'Project Catalog',    icon: folderIcon, matchRoutes: ['projects','project-detail'] },
      { route: 'deliverables', label: 'Review Queue',       icon: reviewIcon, badge: true },
    ]},
    { section: 'Coordination & Studio', items: [
      { route: 'team',         label: 'Team & Workload',    icon: teamIcon },
      { route: 'copy-studio',  label: 'Copywriting Studio', icon: pencilIcon },
    ]},
    { section: 'System & Governance', items: [
      { route: 'admin',        label: 'Administration',     icon: adminIcon },
    ]},
  ];

  function isActive(item: any) {
    return item.matchRoutes ? item.matchRoutes.includes(appState.currentRoute) : appState.currentRoute === item.route;
  }

  const userInitial = $derived((appState.currentUser?.name ?? 'U').charAt(0).toUpperCase());
  const isRail = $derived(appState.sidebarRail && appState.sidebarExpanded);
</script>

{#if !appState.currentUser}
  <LoginView />
{:else}
  <div
    class="app-shell"
    class:sidebar-rail={isRail}
    class:sidebar-hidden={!appState.sidebarExpanded}
  >
    <!-- ═══ SIDEBAR ════════════════════════════════════════════════ -->
    <aside class="app-sidebar" class:is-rail={isRail}>

      <div class="sidebar-header" class:rail-header={isRail}>
        {#if !isRail}
          <img src="brand/suamisihat-logo-on-dark.svg" alt="SuamiSihat" class="sidebar-logo" />
          <span class="portal-pill">PORTAL</span>
        {:else}
          <div class="sidebar-logomark-wrap" title="SuamiSihat Portal">
            <img src="brand/ss-logomark.svg" alt="SuamiSihat Logomark" class="sidebar-logomark-svg" />
          </div>
        {/if}
      </div>

      <nav class="sidebar-nav" class:rail-nav={isRail} aria-label="Main Navigation">
        {#each navGroups as group}
          {#if !isRail}
            <div class="nav-section-label">{group.section}</div>
          {:else}
            <div class="nav-section-divider"></div>
          {/if}
          {#each group.items as item}
            {@const active = isActive(item)}
            {@const count  = item.badge ? projectStore.pendingReviewCount : 0}
            <a
              href="#{item.route}"
              class="nav-link"
              class:active
              class:rail-link={isRail}
              title={isRail ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {@html item.icon}
              </svg>
              {#if !isRail}
                <span class="nav-label">{item.label}</span>
              {/if}
              {#if count > 0}
                <span class="nav-badge" class:rail-badge={isRail}>{count}</span>
              {/if}
            </a>
          {/each}
        {/each}

        <div class="nav-spacer"></div>

        {#if !isRail}
          <div class="desktop-banner">
            <div class="banner-row">
              <span class="banner-pill">Desktop Client</span>
              <span class="banner-ver">v4.5.0</span>
            </div>
            <div class="banner-title">SS-CAM Desktop</div>
            <p class="banner-desc">Native Windows & Linux apps for creative workstations.</p>
            <a
              href="https://suamisihat.github.io/ss_cam/"
              class="banner-btn"
              target="_blank"
              rel="noreferrer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Download App ↗
            </a>
          </div>
        {:else}
          <a
            href="https://suamisihat.github.io/ss_cam/"
            class="nav-link rail-link"
            target="_blank"
            rel="noreferrer"
            title="Download SS-CAM App"
          >
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </a>
        {/if}
      </nav>
    </aside>

    <!-- ═══ MAIN ════════════════════════════════════════════════════ -->
    <div class="app-main">

      <!-- TOP HEADER -->
      <header class="app-header">
        <div class="header-left">
          <button class="icon-btn" onclick={() => appState.toggleSidebar()} title="Toggle Sidebar" aria-label="Toggle sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
          <nav class="breadcrumb" aria-label="Breadcrumb">
            {#each breadcrumbs as crumb, i}
              {#if i > 0}<span class="bc-sep" aria-hidden="true">›</span>{/if}
              {#if crumb.route && i < breadcrumbs.length - 1}
                <a href="#{crumb.route}" class="bc-link">{crumb.label}</a>
              {:else}
                <span class="bc-current" aria-current="page">{crumb.label}</span>
              {/if}
            {/each}
          </nav>
        </div>

        <div class="header-center">
          <div class="header-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="search-ico" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              class="search-input"
              type="search"
              placeholder="Search projects, deliverables, team…"
              bind:value={appState.globalSearch}
              aria-label="Global search"
            />
            {#if appState.globalSearch}
              <button class="search-clear" onclick={() => (appState.globalSearch = '')} aria-label="Clear search">×</button>
            {/if}
          </div>
        </div>

        <div class="header-right">

          <button
            class="icon-btn notif-btn"
            onclick={() => (appState.notificationDrawerOpen = !appState.notificationDrawerOpen)}
            title="Notifications & Activity"
            aria-label="Notifications & Activity"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            {#if appState.notificationCount > 0}
              <span class="notif-count">{appState.notificationCount > 9 ? '9+' : appState.notificationCount}</span>
            {/if}
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

          <!-- User Dropdown -->
          <div class="user-menu-wrapper">
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="user-chip"
              onclick={(e) => { e.stopPropagation(); appState.userMenuOpen = !appState.userMenuOpen; }}
              onkeydown={(e) => e.key === 'Enter' && (appState.userMenuOpen = !appState.userMenuOpen)}
              role="button"
              tabindex="0"
              aria-haspopup="menu"
              aria-expanded={appState.userMenuOpen}
            >
              <div class="user-avatar">{userInitial}</div>
              <div class="user-info">
                <span class="user-name">{appState.currentUser?.name ?? 'User'}</span>
                <span class="user-role-label">{appState.currentUser?.role}</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="chevron" class:open={appState.userMenuOpen} aria-hidden="true">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>

            {#if appState.userMenuOpen}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="user-dropdown" role="menu" onclick={(e) => e.stopPropagation()}>
                <div class="dd-header">
                  <div class="dd-avatar">{userInitial}</div>
                  <div>
                    <div class="dd-name">{appState.currentUser?.name}</div>
                    <div class="dd-meta">{appState.currentUser?.staffId} · {appState.currentUser?.role}</div>
                  </div>
                </div>
                <div class="dd-divider"></div>
                <button class="dd-item" onclick={() => { appState.userMenuOpen = false; appState.navigate('profile'); }} role="menuitem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  My Profile & Themes
                </button>
                <button class="dd-item" onclick={() => { appState.userMenuOpen = false; appState.navigate('admin'); }} role="menuitem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>
                  Administration
                </button>
                <div class="dd-divider"></div>
                <button class="dd-item danger" onclick={() => { appState.userMenuOpen = false; appState.logout(); }} role="menuitem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                  Sign Out
                </button>
              </div>
            {/if}
          </div>
        </div>
      </header>

      <!-- PAGE CONTENT -->
      <div class="page-body">
        <section class="view-pane {currentConfig.layout}">
          {#if appState.currentRoute === 'dashboard'}
            <DashboardView />
          {:else if appState.currentRoute === 'projects'}
            <ProjectsView />
          {:else if appState.currentRoute === 'project-detail'}
            <ProjectDetailView />
          {:else if appState.currentRoute === 'deliverables'}
            <DeliverablesView />
          {:else if appState.currentRoute === 'copy-studio'}
            <CopyStudioView />
          {:else if appState.currentRoute === 'team'}
            <TeamView />
          {:else if appState.currentRoute === 'admin'}
            <AdminView />
          {:else if appState.currentRoute === 'profile'}
            <ProfileView />
          {:else}
            <DashboardView />
          {/if}
        </section>
      </div>
    </div>
  </div>

  {#if appState.sidebarExpanded && !isRail}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="mobile-overlay" onclick={() => { appState.sidebarExpanded = false; }}></div>
  {/if}

  <NotificationDrawer
    bind:open={appState.notificationDrawerOpen}
    onclose={() => (appState.notificationDrawerOpen = false)}
  />

  <FluentDialog
    bind:open={showDownloadModal}
    title="Download SS-CAM Clients (v4.5.0)"
    onClose={() => (showDownloadModal = false)}
  >
    <div class="download-modal-content">
      <div class="download-platform-card">
        <div class="platform-header">
          <div class="platform-icon win-icon">🪟</div>
          <div class="platform-meta">
            <div class="platform-title">Windows Desktop Application</div>
            <div class="platform-desc">Single-file portable .exe with Fluent 2 Mica design (~5.6 MB)</div>
          </div>
        </div>
        <div class="platform-actions">
          <a
            href="https://suamisihat.github.io/ss_cam/"
            class="platform-download-btn win-btn"
            target="_blank"
            rel="noreferrer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download App (suamisihat.github.io) ↗
          </a>
        </div>
      </div>

      <div class="download-platform-card">
        <div class="platform-header">
          <div class="platform-icon linux-icon">🐧</div>
          <div class="platform-meta">
            <div class="platform-title">Linux Workstation (Fedora, Ubuntu, Pop!_OS, Arch)</div>
            <div class="platform-desc">One-line terminal installer & native desktop launcher</div>
          </div>
        </div>
        <div class="linux-terminal-box">
          <code>curl -fsSL https://raw.githubusercontent.com/SuamiSihat/ss_cam/SS-Master/installer/install-linux.sh | sudo bash</code>
          <button
            type="button"
            class="copy-cmd-btn"
            onclick={() => {
              navigator.clipboard.writeText('curl -fsSL https://raw.githubusercontent.com/SuamiSihat/ss_cam/SS-Master/installer/install-linux.sh | sudo bash');
              appState.addToast('Linux terminal installer command copied!', 'success');
            }}
          >
            Copy Command
          </button>
        </div>
      </div>

      <div class="download-platform-card">
        <div class="platform-header">
          <div class="platform-icon web-icon">🌐</div>
          <div class="platform-meta">
            <div class="platform-title">Synology NAS Docker Web Portal</div>
            <div class="platform-desc">Live production portal hosted on NAS (Docker Compose)</div>
          </div>
        </div>
        <div class="platform-actions">
          <a href="https://github.com/SuamiSihat/ss_cam/tree/SS-Master/src/SS-CAM.Web" class="platform-link-btn" target="_blank" rel="noreferrer">
            View Docker Setup Guide ↗
          </a>
        </div>
      </div>
    </div>

    {#snippet footer()}
      <FluentButton appearance="subtle" onclick={() => (showDownloadModal = false)}>
        Close
      </FluentButton>
    {/snippet}
  </FluentDialog>
{/if}

<FluentToast />

<style>
  /* ═══ SHELL ════════════════════════════════════════════════════ */
  .app-shell {
    display: grid;
    grid-template-columns: 260px 1fr;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    transition: grid-template-columns 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .app-shell.sidebar-rail   { grid-template-columns: 68px 1fr; }
  .app-shell.sidebar-hidden { grid-template-columns: 0px 1fr; }

  /* ═══ SIDEBAR ══════════════════════════════════════════════════ */
  .app-sidebar {
    background: var(--bg-sidebar);
    color: var(--sidebar-text);
    border-right: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
    width: 100%;
    box-sizing: border-box;
  }

  .sidebar-header {
    height: 56px;
    padding: 0 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--sidebar-border);
    box-sizing: border-box;
  }
  .sidebar-header.rail-header {
    padding: 0;
    justify-content: center;
  }
  .sidebar-logo {
    height: 26px;
    max-width: 148px;
    object-fit: contain;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,.25));
  }
  .sidebar-logomark-wrap {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sidebar-logomark-svg {
    width: 32px;
    height: 32px;
    object-fit: contain;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
    transition: transform 0.15s ease;
  }
  .sidebar-logomark-svg:hover {
    transform: scale(1.08);
  }
  .portal-pill {
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.8px;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(33,161,247,.18);
    color: #6DC6EC;
    border: 1px solid rgba(33,161,247,.35);
    white-space: nowrap;
  }

  .sidebar-nav {
    flex: 1;
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .sidebar-nav.rail-nav {
    padding: 12px 0;
    align-items: center;
  }
  .nav-section-label {
    font-size: 10px;
    font-weight: 800;
    color: var(--sidebar-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 14px 10px 4px 10px;
    white-space: nowrap;
  }
  .nav-section-divider {
    height: 1px;
    width: 36px;
    background: var(--sidebar-border);
    margin: 8px auto;
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    border-radius: 8px;
    color: var(--sidebar-text);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    transition: background .14s, color .14s;
    position: relative;
    white-space: nowrap;
    box-sizing: border-box;
  }
  .nav-link:hover  {
    background: rgba(255,255,255,.09);
    color: #fff;
  }
  .nav-link.active {
    background: var(--sidebar-active-bg);
    color: var(--sidebar-active-text);
    font-weight: 700;
    border-left: 3px solid var(--sidebar-active-indicator);
    padding-left: 9px;
  }

  /* Compact Mode Rail Item: perfectly centered 44x44 icon button with 12px margins */
  .nav-link.rail-link {
    width: 44px;
    height: 44px;
    margin: 3px auto;
    padding: 0;
    justify-content: center;
    border-radius: 8px;
    border-left: none !important;
    gap: 0;
  }
  .nav-link.rail-link.active {
    background: var(--sidebar-active-bg);
    color: #fff;
    box-shadow: 0 0 0 1px var(--sidebar-active-indicator);
  }

  .nav-icon  {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  .nav-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nav-badge {
    margin-left: auto;
    background: #EF4444;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 9999px;
    flex-shrink: 0;
  }
  .nav-badge.rail-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 0 4px;
    font-size: 9px;
    margin: 0;
  }
  .nav-spacer {
    flex: 1;
    min-height: 14px;
  }

  .desktop-banner {
    margin: 6px 4px 10px;
    padding: 12px 14px;
    background: linear-gradient(145deg, rgba(2,32,87,.85), rgba(4,51,136,.65));
    border: 1px solid rgba(33,161,247,.3);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-sizing: border-box;
  }
  .banner-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .banner-pill {
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(33,161,247,.22);
    color: #6DC6EC;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .banner-ver {
    font-size: 10.5px;
    color: rgba(255,255,255,.65);
    font-family: monospace;
  }
  .banner-title {
    font-size: 13.5px;
    font-weight: 800;
    color: #fff;
  }
  .banner-desc  {
    font-size: 11px;
    line-height: 1.35;
    color: rgba(255,255,255,.75);
    margin: 0 0 2px 0;
  }
  .banner-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: linear-gradient(90deg, #21A1F7, #0078D4);
    color: #fff;
    text-decoration: none;
    font-size: 11.5px;
    font-weight: 800;
    padding: 7px 10px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(33,161,247,.35);
    transition: transform .15s, box-shadow .15s;
    margin-top: 2px;
  }
  .banner-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(33,161,247,.55);
  }

  /* ═══ MAIN ══════════════════════════════════════════════════════ */
  .app-main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    min-width: 0;
    background: var(--bg-app);
  }

  /* ═══ HEADER ════════════════════════════════════════════════════ */
  .app-header {
    height: 56px;
    flex-shrink: 0;
    background: var(--surface-card);
    border-bottom: 1px solid var(--surface-card-border);
    padding: 0 24px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 200;
    box-shadow: var(--shadow-sm);
  }
  .header-left  { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .header-center { min-width: 0; display: flex; justify-content: center; }
  .header-right { display: flex; align-items: center; gap: 8px; }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
  }
  .bc-sep     { color: var(--text-tertiary); font-size: 12px; }
  .bc-link    { color: var(--text-secondary); text-decoration: none; font-weight: 600; white-space: nowrap; transition: color .14s; }
  .bc-link:hover { color: var(--brand-accent); }
  .bc-current {
    color: var(--text-primary);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 280px;
  }

  .header-search {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-app);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    padding: 0 12px;
    width: 100%;
    max-width: 460px;
    height: 36px;
    transition: border-color .15s, box-shadow .15s;
  }
  .header-search:focus-within {
    border-color: var(--brand-accent);
    box-shadow: 0 0 0 3px rgba(33,161,247,.15);
  }
  .search-ico   { color: var(--text-tertiary); flex-shrink: 0; }
  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    outline: none;
  }
  .search-input::placeholder { color: var(--text-tertiary); }
  .search-clear {
    border: none;
    background: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
  }
  .search-clear:hover { color: var(--text-primary); }

  .icon-btn {
    width: 36px;
    height: 36px;
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
    top: 3px;
    right: 3px;
    background: #EF4444;
    color: #fff;
    font-size: 9px;
    font-weight: 800;
    padding: 0 4px;
    border-radius: 9999px;
    min-width: 14px;
    height: 14px;
    line-height: 14px;
    text-align: center;
    border: 1.5px solid var(--surface-card);
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

  /* User Menu */
  .user-menu-wrapper { position: relative; }
  .user-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 4px;
    border-radius: 8px;
    cursor: pointer;
    transition: background .14s;
    border: 1px solid transparent;
  }
  .user-chip:hover { background: var(--surface-card-hover); border-color: var(--surface-card-border); }
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--brand-gradient);
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .user-info  { display: flex; flex-direction: column; }
  .user-name  { font-size: 12.5px; font-weight: 700; color: var(--text-primary); white-space: nowrap; }
  .user-role-label { font-size: 10.5px; color: var(--text-tertiary); white-space: nowrap; }
  .chevron { color: var(--text-tertiary); transition: transform .2s; flex-shrink: 0; }
  .chevron.open { transform: rotate(180deg); }

  .user-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 10px;
    box-shadow: var(--shadow-xl);
    min-width: 220px;
    z-index: 500;
    overflow: hidden;
    animation: dropIn .15s ease;
  }
  @keyframes dropIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dd-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: var(--bg-app);
  }
  .dd-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--brand-gradient);
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .dd-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
  .dd-meta { font-size: 11px; color: var(--text-secondary); }
  .dd-divider { height: 1px; background: var(--surface-card-border); }
  .dd-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition: background .12s;
    font-family: inherit;
  }
  .dd-item:hover { background: var(--surface-card-hover); }
  .dd-item.danger { color: var(--color-danger); }
  .dd-item.danger:hover { background: var(--color-danger-bg); }

  /* ═══ PAGE BODY ═════════════════════════════════════════════════ */
  .page-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
  }

  /* Layout Contracts with Generous Breathing Room */
  .view-pane {
    min-height: calc(100vh - 56px);
    box-sizing: border-box;
  }
  .view-pane.layout-page {
    padding: 28px 32px;
    max-width: 1480px;
    width: 100%;
    margin: 0 auto;
  }
  .view-pane.layout-full {
    padding: 28px 32px;
    max-width: 1600px;
    width: 100%;
    margin: 0 auto;
  }
  .view-pane.layout-narrow {
    padding: 36px 48px;
    max-width: 960px;
    margin: 0 auto;
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
    .bc-current      { max-width: 140px; }
    .view-pane.layout-page   { padding: 16px 18px; }
    .view-pane.layout-full   { padding: 16px 18px; }
    .view-pane.layout-narrow { padding: 16px 18px; }
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
