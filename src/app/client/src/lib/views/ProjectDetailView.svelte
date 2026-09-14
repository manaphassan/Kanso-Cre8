<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { DeliverableItem, ProjectFrontmatter, ProjectComment } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentDialog from '$lib/components/ui/FluentDialog.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';
  import DeliverableLightbox from '$lib/components/features/DeliverableLightbox.svelte';
  import ProjectComments from '$lib/components/features/ProjectComments.svelte';
  import VaultIngesterModal from '$lib/components/features/VaultIngesterModal.svelte';
  import ShareLinkModal from '$lib/components/features/ShareLinkModal.svelte';
  import ProjectVersionTimelineModal from '$lib/components/features/ProjectVersionTimelineModal.svelte';
  import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte';
  import { clientService } from '$lib/services/clientService';
  import { timerStore } from '$lib/stores/timerStore.svelte';
  import { settingsStore, getCurrencySymbol } from '$lib/stores/settingsStore.svelte';

  interface Props {
    projectId?: string;
  }

  let { projectId = '' }: Props = $props();

  // View state
  type MainCanvasView = 'brief' | 'copywriting' | 'deliverables' | 'direction';
  let activeCanvasView = $state<MainCanvasView>('brief');
  let inspectorOpen = $state<boolean>(true);
  let showIngesterModal = $state<boolean>(false);
  let showShareModal = $state<boolean>(false);
  let showTimelineModal = $state<boolean>(false);
  let showMoreMenu = $state<boolean>(false);

  // Deliverables & Lightbox
  let selectedDeliverable = $state<DeliverableItem | null>(null);
  let lightboxOpen = $state<boolean>(false);
  let isSubmittingDecision = $state<boolean>(false);

  // Deletion State
  let showDeleteModal = $state<boolean>(false);
  let isDeleting = $state<boolean>(false);
  let isSavingDirection = $state<boolean>(false);
  let isEditingDirection = $state<boolean>(false);

  const isAdminUser = $derived.by(() => {
    const role = (appState.currentUser?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('director') || role.includes('lead') || role.includes('manager') || role.includes('executive');
  });

  async function handleDeleteProject() {
    if (!p) return;
    isDeleting = true;
    try {
      await ApiClient.deleteProject(p.id);
      appState.addToast(`Project ${p.jobId || p.title} and subfolders deleted successfully.`, 'success');
      showDeleteModal = false;
      await projectStore.loadProjects();
      await projectStore.loadDashboard();
      appState.navigate('projects');
    } catch (err: any) {
      appState.addToast(`Failed to delete project: ${err.message}`, 'error');
    } finally {
      isDeleting = false;
    }
  }

  // Markdown Bodies & Frontmatter
  let currentReadmeBody = $state<string>('');
  let currentCopyBody = $state<string>('');
  let copyFilePath = $state<string>('');
  let copyStats = $state<{ words: number; chars: number; readingTimeMin: number }>({ words: 0, chars: 0, readingTimeMin: 1 });
  let currentFrontmatter = $state<ProjectFrontmatter>({});
  let projectComments = $state<ProjectComment[]>([]);
  let isLoadingCopy = $state<boolean>(false);
  let lastLoadedHash = $state<string | null>(null);

  const p = $derived(projectStore.selectedProject);

  const clientProfile = $derived.by(() => {
    if (!p) return null;
    return clientService.getClientByCode(p.brand || (p as any).clientCode || 'ACME') || null;
  });

  const projectLoggedHours = $derived.by(() => {
    const activeCurrency = clientProfile?.currency || settingsStore.settings.currency || 'MYR';
    const symbol = getCurrencySymbol(activeCurrency);
    if (!p) return { totalSeconds: 0, formatted: '0h 0m', totalEarned: 0, formattedEarned: `${symbol} 0.00`, symbol };
    const logs = timerStore.timeLogs.filter(l => l.projectId === p.id || l.clientCode === p.brand);
    const totalSecs = logs.reduce((acc, l) => acc + (l.durationSeconds || 0), 0);
    const totalEarned = logs.reduce((acc, l) => acc + (l.earnedAmount || 0), 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return {
      totalSeconds: totalSecs,
      formatted: `${hrs}h ${mins}m`,
      totalEarned,
      formattedEarned: `${symbol} ${totalEarned.toFixed(2)}`,
      symbol
    };
  });

  function toggleProjectTimer() {
    if (!p) return;
    if (timerStore.isRunning && timerStore.projectId === p.id) {
      const log = timerStore.stop();
      if (log) {
        appState.addToast(`Logged ${log.durationFormatted} (${log.earnedFormatted}) for "${p.title}"`, 'success');
      }
    } else {
      const rate = clientProfile?.defaultHourlyRate || 120;
      timerStore.start({
        projectId: p.id,
        projectTitle: p.title,
        clientCode: p.brand || 'ACME',
        hourlyRate: rate
      });
      appState.addToast(`Started live timer for "${p.title}"`, 'info');
    }
  }

  const isTimerActive = $derived(Boolean(p && timerStore.isRunning && timerStore.projectId === p.id));

  // Real-time synchronization when SSE or store updates selectedProject
  $effect(() => {
    const proj = projectStore.selectedProject;
    if (proj) {
      const vHash = `${proj.id || ''}_${proj.versionHash || ''}_${proj.status || ''}_${proj.priority || ''}`;
      if (vHash !== lastLoadedHash) {
        lastLoadedHash = vHash;
        currentReadmeBody = proj.readmeBody || proj.briefMarkdown || '';
        currentFrontmatter = {
          status: proj.status,
          designer: proj.designer,
          brand: proj.brand,
          manager: proj.manager,
          department: proj.department,
          deadline: proj.deadline,
          priority: proj.priority,
          tags: proj.tags || [],
          creative_direction: proj.creativeDirection || {}
        };
        projectComments = (proj as any).comments || [];
      }
    }
  });

  // Staff Roster & Manager Selection
  interface StaffMember {
    staffId: string;
    username: string;
    name: string;
    role: string;
    department?: string;
    avatar?: string;
    avatarColor?: string;
  }
  let staffList = $state<StaffMember[]>([]);
  let isUpdatingManager = $state<boolean>(false);
  let selectedManager = $state<string>('Unassigned');

  function getInitials(name?: string): string {
    if (!name) return 'DS';
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return trimmed.substring(0, 2).toUpperCase();
  }

  // Filter to strictly managerial and leadership roles
  const managerList = $derived.by(() => {
    return staffList.filter(staff => {
      const roleStr = (staff.role || '').toLowerCase();
      return (
        roleStr.includes('manager') ||
        roleStr.includes('director') ||
        roleStr.includes('admin') ||
        roleStr.includes('head') ||
        roleStr.includes('lead') ||
        roleStr.includes('ceo') ||
        roleStr.includes('executive')
      );
    });
  });

  const designerInfo = $derived.by(() => {
    if (!p) return null;
    const key = (p.designer || p.designerName || '').toLowerCase();
    if (!key || key === 'unassigned') return null;
    return staffList.find(s => 
      (s.username && s.username.toLowerCase() === key) ||
      (s.name && s.name.toLowerCase() === key) ||
      (s.staffId && s.staffId.toLowerCase() === key)
    ) || null;
  });

  const designerAvatarSrc = $derived.by(() => {
    return designerInfo?.avatar || (typeof localStorage !== 'undefined' ? (localStorage.getItem(`ss_cam_avatar_${designerInfo?.staffId}`) || (appState.currentUser?.staffId === designerInfo?.staffId ? (appState.currentUser.avatar || '') : '')) : '');
  });

  const managerInfo = $derived.by(() => {
    const key = (selectedManager || (p ? p.manager : '') || '').toLowerCase();
    if (!key || key === 'unassigned') return null;
    return staffList.find(s => 
      (s.name && s.name.toLowerCase() === key) ||
      (s.username && s.username.toLowerCase() === key) ||
      (s.staffId && s.staffId.toLowerCase() === key)
    ) || null;
  });

  const managerAvatarSrc = $derived.by(() => {
    return managerInfo?.avatar || (typeof localStorage !== 'undefined' ? (localStorage.getItem(`ss_cam_avatar_${managerInfo?.staffId}`) || (appState.currentUser?.staffId === managerInfo?.staffId ? (appState.currentUser.avatar || '') : '')) : '');
  });

  $effect(() => {
    if (p && p.manager && p.manager !== 'Unassigned') {
      selectedManager = p.manager;
    } else {
      selectedManager = 'Unassigned';
    }
  });

  async function loadStaffList() {
    try {
      const res = await ApiClient.getStaffAccounts();
      if (res && res.users) {
        staffList = res.users;
      }
    } catch {
      try {
        const res2 = await ApiClient.getStaffRoster();
        if (res2 && res2.roster) {
          staffList = res2.roster;
        }
      } catch (e) {
        console.warn('[ProjectDetailView] loadStaffList error:', e);
      }
    }
  }

  async function handleManagerChange(newManager: string) {
    if (!p) return;
    isUpdatingManager = true;
    selectedManager = newManager;
    try {
      await ApiClient.updateProject(p.id, { manager: newManager });
      currentFrontmatter.manager = newManager;
      if (projectStore.selectedProject) {
        projectStore.selectedProject.manager = newManager;
      }
      appState.addToast(`Reviewer updated to ${newManager === 'Unassigned' ? 'Unassigned' : newManager}`, 'success');
      await projectStore.loadProjectDetail(p.id);
    } catch (err: any) {
      appState.addToast(`Failed to update reviewer: ${err.message}`, 'error');
      selectedManager = p.manager || 'Unassigned';
    } finally {
      isUpdatingManager = false;
    }
  }

  let targetId = $derived(projectId || appState.routeParams.id || '');
  let lastLoadedId = $state<string | null>(null);

  onMount(() => {
    loadStaffList();
  });

  onDestroy(() => {
    // Guard: if the component unmounts mid-load (e.g. user navigates away),
    // ensure loadingDetail is reset so the next visit starts clean.
    projectStore.loadingDetail = false;
  });

  $effect(() => {
    const id = targetId;
    if (id && id !== lastLoadedId) {
      lastLoadedId = id;
      loadProject(id);
    }
  });

  async function loadProject(id: string) {
    const TIMEOUT_MS = 15000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Project load timed out after 15s. The NAS may be slow — please try again.')), TIMEOUT_MS)
    );
    try {
      await Promise.race([projectStore.loadProjectDetail(id), timeoutPromise]);
    } catch (err: any) {
      // loadProjectDetail already handles its own errors via toast.
      // Timeout errors need explicit cleanup.
      if (err.message?.includes('timed out')) {
        projectStore.loadingDetail = false;
        appState.addToast(err.message, 'error');
      }
    }
    if (projectStore.selectedProject) {
      currentReadmeBody = projectStore.selectedProject.readmeBody || projectStore.selectedProject.briefMarkdown || '';
      currentFrontmatter = {
        status: projectStore.selectedProject.status,
        designer: projectStore.selectedProject.designer,
        brand: projectStore.selectedProject.brand,
        manager: projectStore.selectedProject.manager,
        department: projectStore.selectedProject.department,
        deadline: projectStore.selectedProject.deadline,
        priority: projectStore.selectedProject.priority,
        tags: projectStore.selectedProject.tags || [],
        creative_direction: projectStore.selectedProject.creativeDirection || {}
      };
      projectComments = (projectStore.selectedProject as any).comments || [];
    }

    // Preload Copywriting Studio file
    await loadCopywriting(id);
  }

  async function loadCopywriting(id: string) {
    isLoadingCopy = true;
    try {
      const res = await ApiClient.getCopywritingMarkdown(id);
      if (res && res.copywriting) {
        currentCopyBody = res.copywriting.body || '';
        copyFilePath = res.copywriting.filePath || '';
        copyStats = res.copywriting.stats || { words: 0, chars: 0, readingTimeMin: 1 };
      }
    } catch (e) {
      console.warn('[ProjectDetailView] loadCopywriting warning:', e);
    } finally {
      isLoadingCopy = false;
    }
  }

  async function saveMarkdownBrief(newBody: string) {
    if (!p) return;
    try {
      const hash = p.versionHash || null;
      const res = await ApiClient.updateBrief(p.id, newBody, hash);
      appState.addToast('Creative Brief saved to Vault (README.md)', 'success');
      currentReadmeBody = newBody;
      if (projectStore.selectedProject) {
        projectStore.selectedProject.readmeBody = newBody;
        projectStore.selectedProject.briefMarkdown = newBody;
        if (res?.versionHash) {
          projectStore.selectedProject.versionHash = res.versionHash;
          lastLoadedHash = `${projectStore.selectedProject.id || ''}_${res.versionHash}_${projectStore.selectedProject.status || ''}_${projectStore.selectedProject.priority || ''}`;
        }
      }
    } catch (err: any) {
      appState.addToast(`Failed to save brief: ${err.message}`, 'error');
    }
  }

  async function saveCopywritingMarkdown(newBody: string) {
    if (!p) return;
    try {
      const res = await ApiClient.updateCopywritingMarkdown(p.id, newBody);
      appState.addToast('Copywriting saved to Vault (03_COPY/COPY.md)', 'success');
      currentCopyBody = newBody;
      if (res.copywriting?.stats) {
        copyStats = res.copywriting.stats;
      }
    } catch (err: any) {
      appState.addToast(`Failed to save copy: ${err.message}`, 'error');
    }
  }

  function extractColorChips(paletteText?: string): string[] {
    if (!paletteText) return [];
    const hexMatches = paletteText.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g);
    return hexMatches || [];
  }

  async function saveCreativeDirection() {
    if (!p) return;
    isSavingDirection = true;
    try {
      const res = await ApiClient.updateCreativeDirection(p.id, currentFrontmatter.creative_direction || {});
      if (res?.creativeDirection && p) {
        p.creativeDirection = res.creativeDirection;
      }
      appState.addToast('Creative direction saved to README.md', 'success');
      isEditingDirection = false;
    } catch (err: any) {
      appState.addToast(`Failed to save creative direction: ${err.message}`, 'error');
    } finally {
      isSavingDirection = false;
    }
  }

  async function updateStatus(newStatus: string) {
    if (!p) return;
    try {
      await ApiClient.updateProject(p.id, { ...currentFrontmatter, status: newStatus as any });
      currentFrontmatter.status = newStatus as any;
      if (projectStore.selectedProject) {
        projectStore.selectedProject.status = newStatus as any;
      }
      appState.addToast(`Project status updated to ${newStatus.toUpperCase()}`, 'info');
    } catch (err: any) {
      appState.addToast(`Failed to update status: ${err.message}`, 'error');
    }
  }

  async function handleQuickDecision(decision: 'approved' | 'revision_requested') {
    if (!p || isSubmittingDecision) return;
    isSubmittingDecision = true;
    try {
      await ApiClient.submitDecision(p.id, {
        decision,
        comment: decision === 'approved' ? 'Formal manager approval via studio dashboard.' : 'Revisions requested on creative deliverables.'
      });
      appState.addToast(
        decision === 'approved' ? 'Project Approved & Signed Off' : 'Revision Requested recorded in audit log',
        decision === 'approved' ? 'success' : 'warning'
      );
      await loadProject(p.id);
    } catch (err: any) {
      appState.addToast(`Decision failed: ${err.message}`, 'error');
    } finally {
      isSubmittingDecision = false;
    }
  }

  function openLightbox(d: DeliverableItem) {
    selectedDeliverable = {
      ...d,
      project: d.project || {
        jobId: p?.jobId || p?.id || '',
        title: p?.title || '',
        brand: p?.brand || '',
        designer: p?.designer || '',
        status: p?.status || '',
        priority: p?.priority || '',
        deadline: p?.deadline || ''
      }
    };
    lightboxOpen = true;
  }

  function getCompanyFullName(code?: string): string {
    if (!code) return 'Acme Corporation';
    const c = code.toUpperCase().trim();
    if (c === 'ACME' || c === 'AC') return 'Acme Corporation';
    if (c === 'NEX' || c === 'NX') return 'Nexus Studio';
    if (c === 'LUM' || c === 'LM') return 'Lumina Labs';
    return `${code} Client Unit`;
  }
</script>

<svelte:window onclick={() => { showMoreMenu = false; }} />

<div class="project-workspace-container">
  {#if projectStore.loadingDetail}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading project workspace from Synology NAS…</p>
    </div>
  {:else if !p}
    <div class="empty-state">
      <h3>Project not found</h3>
      <p>The requested creative directory does not exist or has been moved.</p>
      <FluentButton appearance="primary" onclick={() => appState.navigate('projects')}>
        Return to Catalog
      </FluentButton>
    </div>
  {:else}
    <!-- ═══════════ MINIMAL & MODERN COMMAND HEADER ═══════════ -->
    <header class="task-command-header">
      <div class="task-breadcrumbs">
        <button type="button" class="crumb-link" onclick={() => appState.navigate('projects')}>Projects</button>
        <span class="crumb-sep">/</span>
        <span class="crumb-tag">{p.brand || 'ACME'}</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-current">{p.jobId || p.id}</span>
      </div>

      <div class="task-headline-row">
        <div class="headline-left">
          <div class="job-badge">{p.jobId || p.id}</div>
          <h1 class="task-title">{p.title}</h1>
        </div>

        <div class="headline-actions">
          <!-- Freelance Client Status Selector -->
          <div class="status-selector-wrap">
            <select
              class="status-select status-{currentFrontmatter.status || 'review'}"
              value={currentFrontmatter.status || 'review'}
              onchange={(e) => updateStatus((e.target as HTMLSelectElement).value)}
            >
              <option value="backlog">Backlog</option>
              <option value="in-progress">In Production</option>
              <option value="review">Client Proofing</option>
              <option value="revision">Revision Pending</option>
              <option value="approved">Client Approved</option>
              <option value="done">Delivered &amp; Invoiced</option>
            </select>
          </div>

          <!-- Tactile Billable Chronometer Trigger -->
          <button
            type="button"
            class="header-chronometer-btn"
            class:is-active={isTimerActive}
            onclick={toggleProjectTimer}
            title={isTimerActive ? 'Stop Live Timer' : 'Start Live Timer for this project'}
          >
            {#if isTimerActive}
              <span class="pulsing-record-dot"></span>
              <span class="ticker-text">{timerStore.formattedTime}</span>
              <span class="ticker-earned">({timerStore.formattedEarned})</span>
              <span class="btn-stop-text">■ Stop</span>
            {:else}
              <span class="btn-play-icon">▶</span>
              <span>Start Timer</span>
            {/if}
          </button>

          <!-- Action Outlines Group -->
          <div class="action-btn-group">
            <button
              class="action-btn-clean"
              onclick={() => (showIngesterModal = true)}
              title="Ingest raw files or deliverables to NAS"
            >
              <FluentIcons name="upload" size={13} />
              <span>Ingest</span>
            </button>

            <button
              class="action-btn-clean"
              onclick={() => (showShareModal = true)}
              title="Generate Client Review Link"
            >
              <FluentIcons name="link" size={13} />
              <span>Share</span>
            </button>

            <a
              href={`/api/projects/${encodeURIComponent(p.id)}/export`}
              download
              class="action-btn-clean"
              title="Export Handover ZIP"
            >
              <FluentIcons name="download" size={13} />
              <span>Export ZIP</span>
            </a>

            <!-- More Actions Dropdown -->
            <div class="more-menu-wrapper" onclick={(e) => e.stopPropagation()}>
              <button
                class="action-btn-clean icon-only"
                class:active={showMoreMenu}
                onclick={() => (showMoreMenu = !showMoreMenu)}
                title="More Actions"
                aria-label="More Actions"
              >
                <span style="font-weight: 800; font-size: 14px; line-height: 1;">···</span>
              </button>

              {#if showMoreMenu}
                <div class="more-dropdown-menu">
                  <a
                    href={`sscam://open?id=${encodeURIComponent(p.jobId || p.id)}`}
                    class="more-dropdown-item"
                    onclick={() => (showMoreMenu = false)}
                  >
                    <FluentIcons name="desktop" size={13} />
                    <span>Open in Desktop</span>
                  </a>

                  <button
                    class="more-dropdown-item"
                    onclick={() => { showTimelineModal = true; showMoreMenu = false; }}
                  >
                    <FluentIcons name="timeline" size={13} />
                    <span>Timeline &amp; Rollback</span>
                  </button>

                  {#if isAdminUser}
                    <div class="more-divider"></div>
                    <button
                      class="more-dropdown-item item-danger"
                      onclick={() => { showDeleteModal = true; showMoreMenu = false; }}
                    >
                      <FluentIcons name="delete" size={13} color="#EF4444" />
                      <span>Delete Project</span>
                    </button>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Toggle Inspector Button -->
            <button
              class="action-btn-clean icon-only"
              class:active={inspectorOpen}
              onclick={() => (inspectorOpen = !inspectorOpen)}
              title="Toggle Properties Panel"
              aria-label="Toggle Properties Panel"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM15 7h2v10h-2V7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Segmented View Switcher -->
      <div class="canvas-segmented-nav">
        <button
          class="canvas-nav-item"
          class:active={activeCanvasView === 'brief'}
          onclick={() => (activeCanvasView = 'brief')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          <span>Creative Brief</span>
        </button>

        <button
          class="canvas-nav-item"
          class:active={activeCanvasView === 'copywriting'}
          onclick={() => (activeCanvasView = 'copywriting')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          <span>Copywriting Studio</span>
          <span class="view-chip" title="{copyStats.words} words in 03_COPY/COPY.md">{copyStats.words} words</span>
        </button>

        <button
          class="canvas-nav-item"
          class:active={activeCanvasView === 'deliverables'}
          onclick={() => (activeCanvasView = 'deliverables')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          <span>Deliverables ({projectStore.activeDeliverables.length})</span>
        </button>

        <button
          class="canvas-nav-item"
          class:active={activeCanvasView === 'direction'}
          onclick={() => (activeCanvasView = 'direction')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.36 19.64 10.63 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
          <span>Creative Direction</span>
        </button>
      </div>
    </header>

    <!-- ═══════════ 2-COLUMN SPLIT WORKSPACE BODY ═══════════ -->
    <div class="task-workspace-grid" class:inspector-closed={!inspectorOpen}>
      <!-- ─── LEFT/MAIN CANVAS AREA (68%) ─── -->
      <main class="main-document-canvas">
        {#if activeCanvasView === 'brief'}
          <!-- Creative Brief Markdown Editor with full toolbar -->
          <MarkdownEditor
            title="README.md"
            saveLabel="Save Brief to Vault"
            bind:value={currentReadmeBody}
            onSave={saveMarkdownBrief}
          />
        {:else if activeCanvasView === 'copywriting'}
          <!-- Dedicated Copywriting Studio Markdown Editor -->
          {#if isLoadingCopy}
            <div class="loading-state">Loading 03_COPY/COPY.md from Vault…</div>
          {:else}
            <MarkdownEditor
              title="03_COPY / COPY.md"
              saveLabel="Save Copy to Vault"
              bind:value={currentCopyBody}
              onSave={saveCopywritingMarkdown}
            />
          {/if}
        {:else if activeCanvasView === 'deliverables'}
          <!-- Deliverables Masonry Gallery -->
          <div class="deliverables-gallery-container">
            <div class="gallery-header">
              <div class="gallery-title-group">
                <h3>Production Output Assets</h3>
                <span class="gallery-subtitle">Found in <code>05_DELIVERABLES/</code> in local creative vault</span>
              </div>
            </div>

            {#if projectStore.activeDeliverables.length === 0}
              <div class="empty-gallery">
                <div class="empty-icon-box">
                  <FluentIcons name="folder" size={36} color="rgba(255,255,255,0.2)" />
                </div>
                <p>No output media found in <code>05_DELIVERABLES</code> or <code>04_Production</code>.</p>
                <p class="empty-sub">Export output media (PNG, JPG, MP4, PDF) from Photoshop, Illustrator, or Blender into the project folder.</p>
              </div>
            {:else}
              <div class="deliverables-grid">
                {#each projectStore.activeDeliverables as d}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div class="deliverable-card" onclick={() => openLightbox(d)}>
                    <div class="del-preview-box">
                      {#if d.isImage || d.previewType === 'image'}
                        <img src={d.previewUrl} alt={d.filename} loading="lazy" />
                      {:else if d.isVideo || d.previewType === 'video'}
                        <div class="del-video-thumb">
                          <!-- svelte-ignore a11y_media_has_caption -->
                          <video src={d.streamUrl || d.previewUrl} preload="metadata" muted playsinline></video>
                          <span class="del-play-badge">
                            <FluentIcons name="video" size={12} />
                            <span style="margin-left: 4px;">VIDEO</span>
                          </span>
                        </div>
                      {:else if d.isPdf || d.previewType === 'pdf'}
                        <div class="del-pdf-thumb">
                          <FluentIcons name="file" size={24} color="#EF4444" />
                          <span class="del-thumb-text">PDF DOCUMENT</span>
                        </div>
                      {:else if d.isAudio || d.previewType === 'audio'}
                        <div class="del-audio-thumb">
                          <FluentIcons name="video" size={24} color="#8B5CF6" />
                          <span class="del-thumb-text">AUDIO TRACK</span>
                        </div>
                      {:else}
                        <div class="doc-badge">{d.ext ? d.ext.toUpperCase() : 'FILE'}</div>
                      {/if}
                      <span class="format-pill">{d.format || (d.ext ? d.ext.toUpperCase() : 'MEDIA')}</span>
                    </div>
                    <div class="del-details">
                      <div class="del-filename" title={d.filename}>{d.filename}</div>
                      <div class="del-meta-row">
                        <span>{d.sizeFormatted || (d.sizeBytes ? ((d.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB') : '0.00 MB')}</span>
                        <span class="status-tag status-{d.status || 'review'}">{d.status || 'review'}</span>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {:else if activeCanvasView === 'direction'}
          <!-- Creative Direction Panel -->
          <FluentCard elevated>
            <div class="form-section-header">
              <div class="header-titles">
                <h3>Creative &amp; Visual Direction Matrix</h3>
                <p>Core visual tone, typography mood, and brand guidelines for designers.</p>
              </div>

              <div class="header-actions">
                {#if !isEditingDirection}
                  <FluentButton appearance="secondary" size="sm" onclick={() => (isEditingDirection = true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    <span style="margin-left: 5px;">Edit Direction</span>
                  </FluentButton>
                {:else}
                  <div class="direction-action-group">
                    <FluentButton appearance="secondary" size="sm" onclick={() => (isEditingDirection = false)}>
                      Cancel
                    </FluentButton>
                    <FluentButton appearance="primary" size="sm" loading={isSavingDirection} onclick={saveCreativeDirection}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                      </svg>
                      <span style="margin-left: 5px;">Save Direction</span>
                    </FluentButton>
                  </div>
                {/if}
              </div>
            </div>

            {#if !isEditingDirection}
              <!-- ─── PREVIEW MODE (DEFAULT) ─── -->
              <div class="direction-preview-grid">
                <div class="preview-card">
                  <div class="preview-card-header">
                    <span class="preview-icon">🎨</span>
                    <span class="preview-title">Visual Concept / Style Direction</span>
                  </div>
                  <div class="preview-card-body">
                    {#if currentFrontmatter.creative_direction?.visual_concept}
                      <p class="preview-text highlight-concept">{currentFrontmatter.creative_direction.visual_concept}</p>
                    {:else}
                      <p class="preview-empty">No visual concept specified. Click "Edit Direction" to add.</p>
                    {/if}
                  </div>
                </div>

                <div class="preview-card">
                  <div class="preview-card-header">
                    <span class="preview-icon">🎯</span>
                    <span class="preview-title">Primary Color Palette Tokens</span>
                  </div>
                  <div class="preview-card-body">
                    {#if currentFrontmatter.creative_direction?.color_palette}
                      {@const chips = extractColorChips(currentFrontmatter.creative_direction.color_palette)}
                      <div class="palette-preview-wrap">
                        {#if chips.length > 0}
                          <div class="color-chips-row">
                            {#each chips as color}
                              <span class="color-swatch-dot" style="background-color: {color};" title={color}></span>
                            {/each}
                          </div>
                        {/if}
                        <p class="preview-text font-mono">{currentFrontmatter.creative_direction.color_palette}</p>
                      </div>
                    {:else}
                      <p class="preview-empty">No color palette tokens defined yet.</p>
                    {/if}
                  </div>
                </div>

                <div class="preview-card full-width">
                  <div class="preview-card-header">
                    <span class="preview-icon">👥</span>
                    <span class="preview-title">Target Audience Demographics &amp; Psychology</span>
                  </div>
                  <div class="preview-card-body">
                    {#if currentFrontmatter.creative_direction?.target_audience}
                      <div class="audience-content">{currentFrontmatter.creative_direction.target_audience}</div>
                    {:else}
                      <p class="preview-empty">No target audience profile documented yet. Click "Edit Direction" to add.</p>
                    {/if}
                  </div>
                </div>
              </div>
            {:else}
              <!-- ─── EDIT FORM MODE ─── -->
              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label" for="dir-visual-concept">Visual Concept / Style Direction</label>
                  <input
                    id="dir-visual-concept"
                    type="text"
                    class="form-input"
                    bind:value={currentFrontmatter.creative_direction!.visual_concept}
                    placeholder="e.g. Modern Bold Minimalist, Dark Neon Accent"
                  />
                </div>

                <div class="form-field">
                  <label class="form-label" for="dir-color-palette">Primary Color Palette Tokens</label>
                  <input
                    id="dir-color-palette"
                    type="text"
                    class="form-input"
                    bind:value={currentFrontmatter.creative_direction!.color_palette}
                    placeholder="e.g. Prussian Blue #022057, SS Blue #043388, Gold #D4AF37"
                  />
                </div>

                <div class="form-field full-width">
                  <label class="form-label" for="dir-target-audience">Target Audience Demographics &amp; Psychology</label>
                  <textarea
                    id="dir-target-audience"
                    class="form-textarea"
                    rows="4"
                    bind:value={currentFrontmatter.creative_direction!.target_audience}
                    placeholder="Demographics, pain points, desired emotional response..."
                  ></textarea>
                </div>
              </div>
            {/if}
          </FluentCard>
        {/if}
      </main>

      <!-- ─── RIGHT INSPECTOR PANEL: CLIENT & PRODUCTION SPECS (32%) ─── -->
      {#if inspectorOpen}
        <aside class="task-inspector-panel">
          <div class="inspector-zen-header">
            <div class="zen-header-titles">
              <span class="zen-title">Production &amp; Client Specs</span>
              <span class="zen-subtitle">Local Vault &amp; Direct Billing</span>
            </div>
            <button
              type="button"
              class="close-inspector-x"
              onclick={() => (inspectorOpen = false)}
              title="Collapse Inspector"
            >✕</button>
          </div>

          <div class="inspector-content">
            <div class="properties-sheet">
              <!-- Client Dossier Card -->
              <div class="spec-card">
                <div class="spec-card-header">
                  <span class="spec-card-title">Client Account</span>
                  <button
                    type="button"
                    class="spec-link-btn"
                    onclick={() => appState.navigate('clients')}
                    title="View client profile"
                  >
                    Client Profile →
                  </button>
                </div>
                <div class="client-dossier-box">
                  <div class="client-dossier-top">
                    <span class="client-color-circle" style="background-color: {clientProfile?.palette?.primary || 'var(--kanso-accent)'};"></span>
                    <div class="client-names">
                      <span class="client-full-name">{clientProfile?.name || p.brand || 'Acme Corporation'}</span>
                      <span class="client-code-tag">[{clientProfile?.code || p.brand || 'ACME'}]</span>
                    </div>
                  </div>
                  {#if clientProfile?.contactPerson}
                    <div class="client-contact-row">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <span>{clientProfile.contactPerson}</span>
                    </div>
                  {/if}
                  {#if clientProfile?.email}
                    <div class="client-contact-row">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                      <a href={`mailto:${clientProfile.email}`} class="client-email-link">{clientProfile.email}</a>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Billable Chronometer & Rate Card -->
              <div class="spec-card">
                <div class="spec-card-header">
                  <span class="spec-card-title">Time &amp; Direct Billing</span>
                  <span class="rate-badge">{projectLoggedHours.symbol} {clientProfile?.defaultHourlyRate || 150}/hr</span>
                </div>
                <div class="billing-summary-grid">
                  <div class="bill-stat">
                    <span class="bill-stat-label">Logged Time</span>
                    <span class="bill-stat-val">{projectLoggedHours.formatted}</span>
                  </div>
                  <div class="bill-stat">
                    <span class="bill-stat-label">Accrued Earned</span>
                    <span class="bill-stat-val font-mono highlight-earnings">{projectLoggedHours.formattedEarned}</span>
                  </div>
                </div>

                <button
                  type="button"
                  class="spec-timer-toggle-btn"
                  class:is-active={isTimerActive}
                  onclick={toggleProjectTimer}
                >
                  {#if isTimerActive}
                    <span class="pulsing-record-dot"></span>
                    <span>Tracking: {timerStore.formattedTime} · Stop</span>
                  {:else}
                    <span>▶ Start Live Timer</span>
                  {/if}
                </button>
              </div>

              <!-- Deliverables & Vault Assets Card -->
              <div class="spec-card">
                <div class="spec-card-header">
                  <span class="spec-card-title">Deliverables Scope</span>
                  <button
                    type="button"
                    class="spec-link-btn"
                    onclick={() => (activeCanvasView = 'deliverables')}
                  >
                    View Files ({projectStore.activeDeliverables.length}) →
                  </button>
                </div>
                <div class="scope-status-row">
                  <div class="scope-count-badge">
                    <FluentIcons name="folder" size={13} />
                    <span>{projectStore.activeDeliverables.length} files in <code>05_DELIVERABLES/</code></span>
                  </div>
                </div>
              </div>

              <!-- Canonical 5-Folder Vault Directory -->
              <div class="spec-card">
                <div class="spec-card-header">
                  <span class="spec-card-title">Canonical 5-Folder Vault</span>
                  <span class="vault-local-badge">Local Filesystem</span>
                </div>
                <div class="vault-directory-tree">
                  <div class="tree-item active-link" onclick={() => (activeCanvasView = 'brief')} role="button" tabindex="0">
                    <span class="tree-icon">📄</span>
                    <span class="tree-name">README.md</span>
                    <span class="tree-tag">YAML Specs</span>
                  </div>
                  <div class="tree-item">
                    <span class="tree-icon">📁</span>
                    <span class="tree-name">01_BRIEF/</span>
                    <span class="tree-tag">Assets &amp; Brief</span>
                  </div>
                  <div class="tree-item">
                    <span class="tree-icon">📁</span>
                    <span class="tree-name">02_SOURCE/</span>
                    <span class="tree-tag">Design Masters</span>
                  </div>
                  <div class="tree-item active-link" onclick={() => (activeCanvasView = 'copywriting')} role="button" tabindex="0">
                    <span class="tree-icon">📝</span>
                    <span class="tree-name">03_COPY/COPY.md</span>
                    <span class="tree-tag">Headlines</span>
                  </div>
                  <div class="tree-item">
                    <span class="tree-icon">📁</span>
                    <span class="tree-name">04_WIP/</span>
                    <span class="tree-tag">Draft Renders</span>
                  </div>
                  <div class="tree-item active-link" onclick={() => (activeCanvasView = 'deliverables')} role="button" tabindex="0">
                    <span class="tree-icon">📦</span>
                    <span class="tree-name">05_DELIVERABLES/</span>
                    <span class="tree-tag">{projectStore.activeDeliverables.length} exports</span>
                  </div>
                </div>
              </div>

              <!-- Client Review & Invoice Actions -->
              <div class="spec-card">
                <div class="spec-card-header">
                  <span class="spec-card-title">Client Review &amp; Settlement</span>
                </div>
                <div class="pipeline-actions-group">
                  <button
                    type="button"
                    class="pipeline-action-btn primary"
                    onclick={() => (showShareModal = true)}
                  >
                    <FluentIcons name="link" size={13} />
                    <span>Share Client Proof Link</span>
                  </button>

                  <button
                    type="button"
                    class="pipeline-action-btn secondary"
                    onclick={() => appState.navigate('invoice-studio')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                    <span>Generate Client Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      {/if}
    </div>

    <!-- Deliverable Lightbox Modal -->
    <DeliverableLightbox
      deliverable={selectedDeliverable}
      bind:open={lightboxOpen}
      onClose={() => (lightboxOpen = false)}
      onApprove={async (d) => {
        await ApiClient.submitDecision(p.id, { decision: 'approved', deliverableId: d.id });
        appState.addToast(`Deliverable ${d.filename} approved`, 'success');
        await loadProject(p.id);
      }}
      onRevision={async (d) => {
        await ApiClient.submitDecision(p.id, { decision: 'revision_requested', deliverableId: d.id });
        appState.addToast(`Revision requested for ${d.filename}`, 'warning');
        await loadProject(p.id);
      }}
    />

    <!-- Delete Confirmation Dialog -->
    <FluentDialog
      bind:open={showDeleteModal}
      title="Delete Project & Files"
      confirmText="Permanently Delete"
      confirmAppearance="danger"
      loading={isDeleting}
      onConfirm={handleDeleteProject}
      onClose={() => (showDeleteModal = false)}
    >
      <div class="delete-dialog-body">
        <div class="delete-warning-banner">
          <div class="warning-title">
            <FluentIcons name="warning" size={16} color="#EF4444" />
            <span style="margin-left: 6px;">Irreversible Filesystem Operation</span>
          </div>
          <p class="warning-text">
            This will permanently delete the project folder and <strong>all 5 subdirectories</strong> in the local creative vault:
          </p>
          <ul class="subfolder-list">
            <li><code>01_BRIEF_ASSETS/</code></li>
            <li><code>02_SOURCE_FILES/</code></li>
            <li><code>03_COPYWRITING/</code> (including COPY.md)</li>
            <li><code>04_WORK_IN_PROGRESS/</code></li>
            <li><code>05_DELIVERABLES/</code> (all exported mockups and files)</li>
          </ul>
        </div>
        <div class="delete-target-info">
          <span class="target-label">Target Project:</span>
          <span class="target-val"><strong>{p.jobId || p.id}</strong> — {p.title}</span>
        </div>
      </div>
    </FluentDialog>

    <!-- Vault Ingester Modal -->
    <VaultIngesterModal
      bind:open={showIngesterModal}
      projectId={p?.id}
      projectTitle={p?.title}
    />

    <!-- Share Link Modal -->
    <ShareLinkModal
      bind:open={showShareModal}
      projectId={p?.id}
      projectTitle={p?.title}
    />

    <!-- Version Timeline Modal -->
    <ProjectVersionTimelineModal
      bind:open={showTimelineModal}
      projectId={p?.id}
      projectTitle={p?.title}
      onRollbackSuccess={() => {
        if (projectId) projectStore.loadProjectById(projectId);
      }}
    />
  {/if}
</div>

<style>
  .project-workspace-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ═══ TASK COMMAND HEADER ══════════════════════════════════════ */
  .task-command-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg, 12px);
    padding: 16px 20px 0 20px;
    box-shadow: var(--shadow-sm);
  }

  .task-breadcrumbs {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    color: var(--text-tertiary);
  }

  .crumb-link {
    cursor: pointer;
    color: var(--text-secondary);
    font-weight: 600;
    background: transparent;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
  }
  .crumb-link:hover { color: var(--kanso-accent, #0078D4); }
  .crumb-sep { opacity: 0.4; }
  .crumb-tag {
    font-weight: 700;
    color: var(--text-brand, #043388);
    background: var(--brand-tint, #EBF4FE);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .crumb-current { font-weight: 600; color: var(--text-primary); }

  .task-headline-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .headline-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .job-badge {
    font-family: monospace;
    font-size: 12px;
    font-weight: 800;
    color: var(--text-brand, #043388);
    background: var(--brand-tint, #EBF4FE);
    border: 1px solid #BFDBFE;
    padding: 3px 8px;
    border-radius: 6px;
  }

  .task-title {
    font-size: 20px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .headline-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .approved-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 6px;
    background: rgba(16, 185, 129, 0.12);
    color: #10B981;
    border: 1px solid rgba(16, 185, 129, 0.25);
    font-size: 12px;
    font-weight: 700;
  }

  .action-btn-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .action-btn-clean {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    height: 30px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    cursor: pointer;
    text-decoration: none;
    transition: all 0.12s ease;
    font-family: inherit;
  }

  .action-btn-clean:hover, .action-btn-clean.active {
    background: var(--surface-card-subtle, #F8FAFC);
    color: var(--brand-primary, #0078D4);
    border-color: var(--brand-accent, #0078D4);
  }

  .action-btn-clean.icon-only {
    width: 30px;
    padding: 0;
    justify-content: center;
  }

  .more-menu-wrapper {
    position: relative;
    display: inline-block;
  }

  .more-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--surface-card, #FFFFFF);
    border: 1px solid var(--surface-card-border, #E2E8F0);
    border-radius: 8px;
    box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.15));
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 100;
    min-width: 170px;
  }

  .more-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.1s;
    font-family: inherit;
  }

  .more-dropdown-item:hover {
    background: var(--brand-tint, rgba(0, 120, 212, 0.08));
    color: var(--brand-primary, #0078D4);
  }

  .more-dropdown-item.item-danger {
    color: #EF4444;
  }

  .more-dropdown-item.item-danger:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #DC2626;
  }

  .more-divider {
    height: 1px;
    background: var(--surface-card-border);
    margin: 2px 0;
  }

  .status-select {
    padding: 5px 10px;
    height: 30px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    outline: none;
    border: 1px solid var(--surface-card-border);
  }
  .status-backlog { background: rgba(148, 163, 184, 0.15); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.3); }
  .status-in-progress { background: rgba(56, 189, 248, 0.15); color: var(--kanso-accent, #38BDF8); border-color: rgba(56, 189, 248, 0.35); }
  .status-review { background: rgba(245, 158, 11, 0.15); color: var(--kanso-warning, #F59E0B); border-color: rgba(245, 158, 11, 0.35); }
  .status-revision { background: rgba(239, 68, 68, 0.15); color: var(--kanso-danger, #EF4444); border-color: rgba(239, 68, 68, 0.35); }
  .status-approved { background: rgba(16, 185, 129, 0.15); color: var(--kanso-success, #10B981); border-color: rgba(16, 185, 129, 0.35); }
  .status-done { background: rgba(168, 85, 247, 0.15); color: #C084FC; border-color: rgba(168, 85, 247, 0.35); }

  /* Segmented Nav */
  .canvas-segmented-nav {
    display: flex;
    gap: 4px;
    border-top: 1px solid var(--surface-card-border);
    padding-top: 6px;
    overflow-x: auto;
  }

  .canvas-nav-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border: none;
    background: transparent;
    border-bottom: 2px solid transparent;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.14s;
    font-family: inherit;
    white-space: nowrap;
  }
  .canvas-nav-item:hover { color: var(--text-primary); }
  .canvas-nav-item.active {
    color: var(--brand-primary, #043388);
    border-bottom-color: var(--brand-primary, #043388);
    font-weight: 700;
  }

  .view-chip {
    font-size: 12px;
    font-weight: 800;
    background: var(--bg-app);
    padding: 2px 7px;
    border-radius: 4px;
    color: var(--text-tertiary);
  }

  /* ═══ 2-COLUMN SPLIT WORKSPACE GRID ════════════════════════════ */
  .task-workspace-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 16px;
    align-items: start;
    transition: grid-template-columns 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .task-workspace-grid.inspector-closed {
    grid-template-columns: 1fr;
  }

  .main-document-canvas {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  /* Right Inspector Panel */
  .task-inspector-panel {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg, 12px);
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: sticky;
    top: 72px;
    max-height: calc(100vh - 100px);
  }

  /* Header Chronometer Button */
  .header-chronometer-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--radius-md, 6px);
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .header-chronometer-btn:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-text-primary);
    border-color: var(--kanso-accent);
  }

  .header-chronometer-btn.is-active {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10B981;
    color: #10B981;
  }

  .header-chronometer-btn .ticker-text {
    font-family: var(--font-mono, monospace);
    font-weight: 700;
  }

  .header-chronometer-btn .ticker-earned {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    opacity: 0.85;
  }

  .header-chronometer-btn .btn-stop-text {
    font-size: 11px;
    font-weight: 800;
    margin-left: 2px;
  }

  .pulsing-record-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    animation: pulse 1.2s infinite;
  }

  /* Zen Inspector Header */
  .inspector-zen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--kanso-surface-hover);
    border-bottom: 1px solid var(--kanso-border);
  }

  .zen-header-titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .zen-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .zen-subtitle {
    font-size: 11px;
    color: var(--kanso-text-muted);
  }

  .close-inspector-x {
    border: none;
    background: transparent;
    color: var(--kanso-text-muted);
    cursor: pointer;
    font-size: 12px;
    padding: 4px;
    border-radius: 4px;
  }

  .close-inspector-x:hover {
    color: var(--kanso-text-primary);
  }

  /* Spec Cards inside Inspector */
  .spec-card {
    background: var(--kanso-canvas);
    border: 1px solid var(--kanso-border);
    border-radius: var(--radius-md, 8px);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .spec-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .spec-card-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--kanso-text-muted);
  }

  .spec-link-btn {
    border: none;
    background: transparent;
    color: var(--kanso-accent);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }

  .spec-link-btn:hover {
    text-decoration: underline;
  }

  .rate-badge {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-weight: 700;
    color: #10B981;
    background: rgba(16, 185, 129, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .vault-local-badge {
    font-size: 10.5px;
    color: var(--kanso-text-muted);
    background: var(--kanso-surface);
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid var(--kanso-border);
  }

  /* Client Dossier Box */
  .client-dossier-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .client-dossier-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .client-color-circle {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .client-names {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .client-full-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .client-code-tag {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    color: var(--kanso-text-muted);
  }

  .client-contact-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    color: var(--kanso-text-muted);
  }

  .client-email-link {
    color: var(--kanso-accent);
    text-decoration: none;
  }

  .client-email-link:hover {
    text-decoration: underline;
  }

  /* Billing Summary Grid */
  .billing-summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: 6px;
    padding: 8px 10px;
  }

  .bill-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bill-stat-label {
    font-size: 10.5px;
    color: var(--kanso-text-muted);
  }

  .bill-stat-val {
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .highlight-earnings {
    color: #10B981;
  }

  .spec-timer-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 6px;
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .spec-timer-toggle-btn:hover {
    border-color: var(--kanso-accent);
    color: var(--kanso-accent);
  }

  .spec-timer-toggle-btn.is-active {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10B981;
    color: #10B981;
  }

  /* Scope row */
  .scope-status-row {
    font-size: 12px;
  }

  .scope-count-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--kanso-text-primary);
  }

  /* Vault Directory Tree */
  .vault-directory-tree {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: var(--font-mono, monospace);
    font-size: 11.5px;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 4px;
    color: var(--kanso-text-muted);
  }

  .tree-item.active-link {
    cursor: pointer;
    color: var(--kanso-text-primary);
  }

  .tree-item.active-link:hover {
    background: var(--kanso-surface-hover);
    color: var(--kanso-accent);
  }

  .tree-name {
    flex: 1;
  }

  .tree-tag {
    font-size: 10px;
    color: var(--kanso-text-muted);
    font-family: inherit;
  }

  /* Pipeline Action Buttons */
  .pipeline-actions-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .pipeline-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
  }

  .pipeline-action-btn.primary {
    background: var(--kanso-accent);
    color: #09090B;
  }

  .pipeline-action-btn.primary:hover {
    filter: brightness(1.1);
  }

  .pipeline-action-btn.secondary {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    color: var(--kanso-text-primary);
  }

  .pipeline-action-btn.secondary:hover {
    background: var(--kanso-surface-hover);
    border-color: var(--kanso-accent);
  }

  .prop-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--surface-card-border);
  }

  .prop-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .prop-value {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .user-val {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }
  .user-avatar img.avatar-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
  .mgr-avatar { background: #0284C7; }

  .user-val-selectable {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    width: 100%;
  }

  .prop-manager-select {
    flex: 1;
    font-size: 12.5px;
    font-weight: 600;
    font-family: inherit;
    color: var(--text-primary);
    background: var(--bg-app);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    padding: 5px 8px;
    cursor: pointer;
    outline: none;
    transition: all 0.14s ease;
  }
  .prop-manager-select:hover:not(:disabled) {
    border-color: var(--brand-accent, #0078D4);
    background: var(--surface-card);
  }
  .prop-manager-select:focus {
    border-color: var(--brand-primary, #043388);
    box-shadow: 0 0 0 2px rgba(4, 51, 136, 0.15);
  }
  .prop-manager-select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .brand-chip {
    font-weight: 800;
    font-size: 12px;
    color: var(--text-brand, #043388);
    background: var(--brand-tint, #EBF4FE);
    padding: 2px 7px;
    border-radius: 4px;
  }
  .brand-full { font-size: 12.5px; color: var(--text-secondary); }

  .priority-chip {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .priority-urgent { background: rgba(239, 68, 68, 0.15); color: var(--kanso-danger, #EF4444); border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 800; }
  .priority-high { background: rgba(245, 158, 11, 0.15); color: var(--kanso-warning, #F59E0B); border: 1px solid rgba(245, 158, 11, 0.35); }
  .priority-medium { background: rgba(56, 189, 248, 0.15); color: var(--kanso-accent, #38BDF8); border: 1px solid rgba(56, 189, 248, 0.35); }
  .priority-low { background: var(--kanso-surface-hover, #27272A); color: var(--kanso-text-muted, #71717A); border: 1px solid var(--kanso-border, #3F3F46); font-weight: 700; }

  .approvals-mini-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 4px;
  }

  .mini-app-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mini-app-card {
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--bg-app);
    border: 1px solid var(--surface-card-border);
  }
  .mini-app-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 700;
  }
  .decision-approved .mini-app-decision { color: #047857; }
  .decision-revision_requested .mini-app-decision { color: #B91C1C; }
  .mini-app-time { font-size: 12px; color: var(--text-tertiary); font-weight: normal; }
  .mini-app-actor { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
  .no-approvals-text { font-size: 12px; color: var(--text-tertiary); margin: 0; }

  /* Deliverables Gallery */
  .deliverables-gallery-container {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg, 12px);
    padding: 20px;
    box-shadow: var(--shadow-sm);
  }

  .gallery-header {
    margin-bottom: 16px;
  }
  .gallery-title-group h3 {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 2px 0;
  }
  .gallery-subtitle {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }

  .deliverable-card {
    background: var(--surface-card-subtle, #F8FAFC);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.14s;
    display: flex;
    flex-direction: column;
  }
  .deliverable-card:hover {
    transform: translateY(-2px);
    border-color: var(--brand-accent);
    box-shadow: var(--shadow-md);
  }

  .del-preview-box {
    height: 140px;
    background: var(--bg-app);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .del-preview-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s ease;
  }
  .deliverable-card:hover .del-preview-box img {
    transform: scale(1.04);
  }

  .del-video-thumb,
  .del-pdf-thumb,
  .del-audio-thumb {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #0B1120;
    color: #FFFFFF;
    position: relative;
  }
  .del-video-thumb video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.75;
  }
  .del-play-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(4px);
  }
  .del-thumb-icon {
    font-size: 30px;
    margin-bottom: 2px;
  }
  .del-thumb-text {
    font-size: 12px;
    font-weight: 800;
    color: #94A3B8;
    letter-spacing: 0.5px;
  }

  .doc-badge {
    font-size: 16px;
    font-weight: 900;
    color: var(--text-tertiary);
    background: var(--surface-card);
    padding: 8px 14px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
  }

  .format-pill {
    position: absolute;
    bottom: 6px;
    right: 6px;
    font-size: 12px;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.7);
    color: #FFFFFF;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .del-details {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .del-filename {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .del-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .status-tag {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 3px;
  }

  .empty-gallery {
    text-align: center;
    padding: 48px 16px;
    background: var(--bg-app);
    border-radius: 8px;
    border: 1px dashed var(--surface-card-border);
  }
  .empty-gallery .empty-icon { font-size: 32px; margin-bottom: 8px; }
  .empty-gallery p { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
  .empty-gallery .empty-sub { font-size: 12px; color: var(--text-secondary); margin: 0; }

  /* Creative Direction Section */
  .form-section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  .header-titles h3 {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 2px 0;
  }
  .header-titles p {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .direction-action-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Direction Preview Grid (Default View) */
  .direction-preview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .preview-card {
    background: var(--bg-app);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md, 8px);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-sizing: border-box;
  }
  .preview-card.full-width {
    grid-column: 1 / -1;
  }
  .preview-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .preview-icon {
    font-size: 15px;
  }
  .preview-title {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .preview-card-body {
    min-height: 24px;
  }
  .preview-text {
    margin: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.55;
  }
  .highlight-concept {
    color: var(--brand-primary, #043388);
    font-weight: 700;
    font-size: 14px;
  }
  .palette-preview-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .color-chips-row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .color-swatch-dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.85);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    display: inline-block;
    flex-shrink: 0;
  }
  .audience-content {
    font-size: 13px;
    line-height: 1.65;
    color: var(--text-primary);
    white-space: pre-wrap;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    padding: 14px 16px;
  }
  .preview-empty {
    margin: 0;
    font-size: 12.5px;
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* Creative Direction Edit Form */
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 16px;
  }
  .form-field.full-width { grid-column: 1 / -1; }

  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
    outline: none;
    line-height: 1.5;
  }
  .form-input:focus, .form-textarea:focus {
    border-color: var(--brand-accent);
  }

  .loading-state, .empty-state {
    text-align: center;
    padding: 64px 20px;
    color: var(--text-secondary);
  }

  @media (max-width: 860px) {
    .task-workspace-grid {
      grid-template-columns: 1fr;
    }
    .task-inspector-panel {
      position: static;
      max-height: none;
    }
  }

  /* ═══ DELETE DIALOG ═════════════════════════════════════════════ */
  .delete-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: var(--text-primary);
  }
  .delete-warning-banner {
    background: rgba(196, 43, 28, 0.08);
    border: 1px solid var(--color-danger, #C42B1C);
    border-radius: var(--radius-md, 8px);
    padding: 14px;
  }
  .warning-title {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--color-danger, #C42B1C);
    margin-bottom: 6px;
  }
  .warning-text {
    font-size: 0.85rem;
    color: var(--text-primary);
    margin: 0 0 8px 0;
    line-height: 1.4;
  }
  .subfolder-list {
    margin: 0;
    padding-left: 18px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .subfolder-list code {
    font-family: var(--font-mono);
    color: var(--color-danger, #C42B1C);
    background: rgba(196, 43, 28, 0.06);
    padding: 1px 4px;
    border-radius: 3px;
  }
  .delete-target-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md, 8px);
    font-size: 0.88rem;
  }
  .target-label {
    font-weight: 600;
    color: var(--text-secondary);
  }
  .target-val {
    color: var(--text-primary);
  }
</style>
