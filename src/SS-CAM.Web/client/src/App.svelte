<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import FluentToast from '$lib/components/ui/FluentToast.svelte';
  import DashboardView from '$lib/views/DashboardView.svelte';
  import ProjectsView from '$lib/views/ProjectsView.svelte';
  import ProjectDetailView from '$lib/views/ProjectDetailView.svelte';
  import DeliverablesView from '$lib/views/DeliverablesView.svelte';
  import CopyStudioView from '$lib/views/CopyStudioView.svelte';
  import TeamView from '$lib/views/TeamView.svelte';
  import AdminView from '$lib/views/AdminView.svelte';
  import ProfileView from '$lib/views/ProfileView.svelte';
  import LoginView from '$lib/views/LoginView.svelte';

  onMount(async () => {
    // Check authentication
    await appState.loadCurrentUser();

    // Setup hash router
    function handleRouteFromHash() {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) {
        appState.currentRoute = 'dashboard';
        return;
      }
      const parts = hash.split('/');
      const route = parts[0];
      const id = parts[1] ? decodeURIComponent(parts[1]) : undefined;
      appState.currentRoute = route || 'dashboard';
      if (id) {
        appState.routeParams = { id };
      }
    }

    window.addEventListener('hashchange', handleRouteFromHash);
    handleRouteFromHash();

    // Listen for auth required events
    window.addEventListener('auth:required', () => {
      appState.navigate('login');
    });
  });

  const pageTitles: Record<string, string> = {
    dashboard: 'Executive Management Dashboard',
    projects: 'Project Catalog & Vault',
    'project-detail': 'Project Workspace',
    deliverables: 'Deliverables & Review Queue',
    team: 'Team Directory & Workload',
    'copy-studio': 'Copywriting & Script Matrix',
    admin: 'System Governance & Telemetry',
    profile: 'Profile & Themes',
    login: 'Sign In'
  };

  const currentTitle = $derived(pageTitles[appState.currentRoute] || 'SS-CAM Portal');
</script>

{#if appState.currentRoute === 'login'}
  <LoginView />
{:else}
  <div class="app-layout" class:sidebar-collapsed={!appState.sidebarExpanded}>
    <!-- ─── SIDEBAR NAVIGATION (30% SECONDARY LAYER) ─── -->
    <aside class="app-sidebar">
      <div class="sidebar-header">
        <img src="brand/suamisihat-logo-on-dark.svg" alt="SuamiSihat" class="sidebar-dark-logo" />
        <span class="portal-tag">PORTAL</span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-cat">Management & Visibility</div>
        <a
          href="#dashboard"
          class="nav-link"
          class:active={appState.currentRoute === 'dashboard'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
          <span>Dashboard</span>
        </a>

        <a
          href="#projects"
          class="nav-link"
          class:active={appState.currentRoute === 'projects' || appState.currentRoute === 'project-detail'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
          <span>Project Catalog</span>
        </a>

        <a
          href="#deliverables"
          class="nav-link"
          class:active={appState.currentRoute === 'deliverables'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          <span>Review Queue</span>
          {#if projectStore.pendingReviewCount > 0}
            <span class="review-badge">{projectStore.pendingReviewCount}</span>
          {/if}
        </a>

        <div class="nav-cat">Coordination & Studio</div>
        <a
          href="#team"
          class="nav-link"
          class:active={appState.currentRoute === 'team'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <span>Team & Workload</span>
        </a>

        <a
          href="#copy-studio"
          class="nav-link"
          class:active={appState.currentRoute === 'copy-studio'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          <span>Copywriting Studio</span>
        </a>

        <div class="nav-spacer"></div>

        <!-- ─── DESKTOP CLIENT BANNER (ABOVE SYSTEM & GOVERNANCE) ─── -->
        <div class="desktop-app-banner">
          <div class="banner-top">
            <span class="banner-pill">Desktop Client</span>
            <span class="banner-tag">v3.6.1</span>
          </div>
          <div class="banner-headline">SS-CAM Desktop</div>
          <p class="banner-desc">Native Windows desktop application for high-speed offline production.</p>
          <a
            href="https://github.com/SuamiSihat/ss_cam/releases"
            target="_blank"
            rel="noreferrer"
            class="banner-cta-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span>Download Latest Build</span>
          </a>
        </div>

        <!-- ─── SYSTEM & GOVERNANCE (MOVED TO BOTTOM) ─── -->
        <div class="nav-cat">System & Governance</div>
        <a
          href="#admin"
          class="nav-link"
          class:active={appState.currentRoute === 'admin'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>
          <span>Administration</span>
        </a>
      </nav>

      <!-- User Chip in Sidebar Footer -->
      <div class="sidebar-footer">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="user-chip" onclick={() => appState.navigate('profile')}>
          <div class="user-avatar">
            {appState.currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div class="user-details">
            <div class="user-name">{appState.currentUser?.name || 'Guest User'}</div>
            <div class="user-role">{appState.currentUser?.role || 'Viewer'}</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- ─── MAIN CONTENT VIEWPORT (60% FOUNDATION CANVAS) ─── -->
    <main class="app-main">
      <header class="app-header">
        <div class="header-left">
          <button class="toggle-btn" onclick={() => appState.toggleSidebar()} title="Toggle Sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <h1 class="header-title">{currentTitle}</h1>
        </div>

        <div class="header-right">
          <a
            href="https://assets.suamisihat.myds.me/"
            target="_blank"
            rel="noreferrer"
            class="brand-vault-link"
          >
            <span>Brand Assets Vault</span>
            <span style="font-size: 11px;">↗</span>
          </a>

          <button
            class="rescan-btn"
            onclick={() => {
              appState.addToast('Rescanning Synology workspace...', 'info');
              projectStore.loadProjects();
              projectStore.loadDashboard();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
            <span>Rescan</span>
          </button>
        </div>
      </header>

      <section class="view-content-pane">
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
    </main>
  </div>
{/if}

<FluentToast />

<style>
  .app-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    transition: grid-template-columns var(--transition-smooth);
  }

  .app-layout.sidebar-collapsed {
    grid-template-columns: 0 1fr;
  }

  .app-sidebar {
    background: var(--bg-sidebar);
    color: var(--sidebar-text);
    border-right: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-header {
    padding: 16px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--sidebar-border);
  }

  .sidebar-dark-logo {
    height: 28px;
    width: auto;
    max-width: 155px;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
  }

  .portal-tag {
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.8px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(33, 161, 247, 0.18);
    color: #6DC6EC;
    border: 1px solid rgba(33, 161, 247, 0.35);
  }

  .sidebar-nav {
    flex: 1;
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .nav-cat {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--sidebar-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 12px 10px 4px 10px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    color: var(--sidebar-text);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    transition: all var(--transition-fast);
  }
  .nav-link:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #FFFFFF;
  }
  .nav-link.active {
    background: var(--sidebar-active-bg);
    color: var(--sidebar-active-text);
    font-weight: 700;
    border-left: 3px solid var(--sidebar-active-indicator);
  }

  .review-badge {
    margin-left: auto;
    background: #EF4444;
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: var(--radius-pill);
  }

  .nav-spacer {
    flex: 1;
    min-height: 14px;
  }

  /* Desktop Ecosystem Download Banner */
  .desktop-app-banner {
    margin: 4px 6px 8px 6px;
    padding: 12px 14px;
    background: linear-gradient(145deg, rgba(2, 32, 87, 0.8) 0%, rgba(4, 51, 136, 0.6) 100%);
    border: 1px solid rgba(33, 161, 247, 0.3);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .banner-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .banner-pill {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(33, 161, 247, 0.25);
    color: #6DC6EC;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .banner-tag {
    font-size: 10.5px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.7);
    font-family: monospace;
  }

  .banner-headline {
    font-size: 13.5px;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: -0.2px;
  }

  .banner-desc {
    font-size: 11px;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.75);
    margin: 0 0 4px 0;
  }

  .banner-cta-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: linear-gradient(90deg, #21A1F7 0%, #0078D4 100%);
    color: #FFFFFF;
    text-decoration: none;
    font-size: 11.5px;
    font-weight: 800;
    padding: 7px 12px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(33, 161, 247, 0.35);
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .banner-cta-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(33, 161, 247, 0.55);
    color: #FFFFFF;
  }

  .sidebar-footer {
    padding: 12px 14px;
    border-top: 1px solid var(--sidebar-border);
  }

  .user-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: var(--radius-md);
    cursor: pointer;
    background: rgba(0, 0, 0, 0.15);
  }
  .user-chip:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--brand-accent);
    color: #022057;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-name { font-size: 12.5px; font-weight: 700; color: #FFFFFF; }
  .user-role { font-size: 11px; color: var(--sidebar-text-muted); }

  .app-main {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
    background: var(--bg-app);
  }

  .app-header {
    height: 56px;
    background: var(--surface-card);
    border-bottom: 1px solid var(--surface-card-border);
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: var(--shadow-sm);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toggle-btn {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
  }
  .toggle-btn:hover { background: var(--surface-card-hover); color: var(--text-primary); }

  .header-title {
    font-size: 16px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-vault-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-accent);
    background: var(--brand-tint);
    border: 1px solid rgba(4, 51, 136, 0.15);
    padding: 4px 10px;
    border-radius: var(--radius-md);
  }

  .rescan-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid var(--surface-card-border);
    padding: 4px 10px;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
  }
  .rescan-btn:hover { background: var(--surface-card-hover); color: var(--text-primary); }

  .view-content-pane {
    flex: 1;
    padding: 24px;
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
  }
</style>
