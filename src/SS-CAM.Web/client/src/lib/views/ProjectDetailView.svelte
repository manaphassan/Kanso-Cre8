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

  interface Props {
    projectId?: string;
  }

  let { projectId = '' }: Props = $props();

  // View state
  type MainCanvasView = 'brief' | 'copywriting' | 'deliverables' | 'direction';
  let activeCanvasView = $state<MainCanvasView>('brief');
  let inspectorTab = $state<'properties' | 'discussion'>('properties');
  let inspectorOpen = $state<boolean>(true);
  let showIngesterModal = $state<boolean>(false);
  let showShareModal = $state<boolean>(false);
  let showTimelineModal = $state<boolean>(false);

  // Deliverables & Lightbox
  let selectedDeliverable = $state<DeliverableItem | null>(null);
  let lightboxOpen = $state<boolean>(false);
  let isSubmittingDecision = $state<boolean>(false);

  // Deletion State
  let showDeleteModal = $state<boolean>(false);
  let isDeleting = $state<boolean>(false);

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
      appState.addToast('Creative Brief saved to Synology NAS (README.md)', 'success');
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
      appState.addToast('Copywriting saved to NAS (03_COPYWRITING/COPY.md)', 'success');
      currentCopyBody = newBody;
      if (res.copywriting?.stats) {
        copyStats = res.copywriting.stats;
      }
    } catch (err: any) {
      appState.addToast(`Failed to save copy: ${err.message}`, 'error');
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
        comment: decision === 'approved' ? 'Formal manager approval via portal.' : 'Revisions requested on creative deliverables.'
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
    if (!code) return 'SuamiSihat Holding Sdn Bhd';
    const c = code.toUpperCase().trim();
    if (c === 'SSH' || c === 'SS') return 'SuamiSihat Holding Sdn Bhd';
    if (c === 'SSC') return 'SuamiSihat Healthcare Sdn Bhd';
    if (c === 'SSW') return 'SuamiSihat Wellness Sdn Bhd';
    if (c === 'SSE' || c === 'SSL') return 'SuamiSihat Ecommerce Sdn Bhd';
    if (c === 'SST') return 'SuamiSihat Technology Sdn Bhd';
    return `${code} Operating Unit`;
  }
</script>

<div class="clickup-task-container">
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
    <!-- ═══════════ CLICKUP-STYLE TOP COMMAND HEADER ═══════════ -->
    <header class="task-command-header">
      <div class="task-breadcrumbs">
        <span class="crumb-link" onclick={() => appState.navigate('projects')}>Projects</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-tag">{p.brand || 'SS'}</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-current">{p.jobId || p.id}</span>
      </div>

      <div class="task-headline-row">
        <div class="headline-left">
          <div class="job-badge">{p.jobId || p.id}</div>
          <h1 class="task-title">{p.title}</h1>
        </div>

        <div class="headline-actions">
          <!-- Status Dropdown Pill -->
          <div class="status-selector-wrap">
            <select
              class="status-select status-{currentFrontmatter.status || 'review'}"
              value={currentFrontmatter.status || 'review'}
              onchange={(e) => updateStatus((e.target as HTMLSelectElement).value)}
            >
              <option value="backlog">Backlog</option>
              <option value="in-progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="revision">Revision Required</option>
              <option value="approved">Approved</option>
              <option value="done">Completed</option>
            </select>
          </div>

          <!-- Quick Actions -->
          <FluentButton
            appearance="primary"
            size="sm"
            loading={isSubmittingDecision}
            onclick={() => handleQuickDecision('approved')}
          >
            <FluentIcons name="checkCircle" size={13} />
            <span style="margin-left: 5px;">Sign-Off</span>
          </FluentButton>

          <FluentButton
            appearance="secondary"
            size="sm"
            loading={isSubmittingDecision}
            onclick={() => handleQuickDecision('revision_requested')}
          >
            <FluentIcons name="warning" size={13} color="#F59E0B" />
            <span style="margin-left: 5px;">Request Revision</span>
          </FluentButton>

          <!-- Open in SS-CAM Desktop App -->
          <a
            href={`sscam://open?id=${encodeURIComponent(p.jobId || p.id)}`}
            class="desktop-open-btn"
            title="Open this project directly in SS-CAM Windows Desktop application"
          >
            <FluentIcons name="desktop" size={14} />
            <span>Open in Desktop</span>
          </a>

          <!-- Ingest Vault Assets Button -->
          <button
            class="ingest-vault-btn"
            onclick={() => (showIngesterModal = true)}
            title="Drag and drop raw files or deliverables to auto-sort into NAS vault"
          >
            <FluentIcons name="upload" size={14} />
            <span>Ingest Assets</span>
          </button>

          <!-- Client Share Link Button -->
          <button
            class="share-link-btn"
            onclick={() => (showShareModal = true)}
            title="Generate secure tokenized client review link for external approval"
          >
            <FluentIcons name="link" size={14} />
            <span>Share Link</span>
          </button>

          <!-- Version Timeline & Rollback Button -->
          <button
            class="timeline-btn"
            onclick={() => (showTimelineModal = true)}
            title="View revision milestones and rollback COPY.md or project state"
          >
            <FluentIcons name="timeline" size={14} />
            <span>Timeline &amp; Rollback</span>
          </button>

          <!-- Export Handover ZIP Button -->
          <a
            href={`/api/projects/${encodeURIComponent(p.id)}/export`}
            download
            class="export-handover-btn"
            title="Download client-ready creative handover ZIP with HTML summary sheet"
          >
            <FluentIcons name="download" size={14} />
            <span>Export Handover (ZIP)</span>
          </a>

          {#if isAdminUser}
            <FluentButton
              appearance="danger"
              size="sm"
              loading={isDeleting}
              onclick={() => (showDeleteModal = true)}
              title="Delete Project and all Subfolders from NAS"
            >
              <FluentIcons name="delete" size={13} />
              <span style="margin-left: 5px;">Delete Project</span>
            </FluentButton>
          {/if}

          <!-- Toggle Inspector Button -->
          <button
            class="icon-toggle-btn"
            class:active={inspectorOpen}
            onclick={() => (inspectorOpen = !inspectorOpen)}
            title="Toggle Right Inspector Panel"
            aria-label="Toggle Right Inspector Panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM15 7h2v10h-2V7z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Segmented View Switcher -->
      <div class="canvas-segmented-nav">
        <button
          class="canvas-nav-item"
          class:active={activeCanvasView === 'brief'}
          onclick={() => (activeCanvasView = 'brief')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          <span>Creative Brief (README.md)</span>
        </button>

        <button
          class="canvas-nav-item"
          class:active={activeCanvasView === 'copywriting'}
          onclick={() => (activeCanvasView = 'copywriting')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          <span>Copywriting Studio (COPY.md)</span>
          <span class="view-chip">{copyStats.words}w</span>
        </button>

        <button
          class="canvas-nav-item"
          class:active={activeCanvasView === 'deliverables'}
          onclick={() => (activeCanvasView = 'deliverables')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          <span>Deliverables Gallery ({projectStore.activeDeliverables.length})</span>
        </button>

        <button
          class="canvas-nav-item"
          class:active={activeCanvasView === 'direction'}
          onclick={() => (activeCanvasView = 'direction')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.36 19.64 10.63 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
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
            saveLabel="Save Brief to NAS"
            bind:value={currentReadmeBody}
            onSave={saveMarkdownBrief}
          />
        {:else if activeCanvasView === 'copywriting'}
          <!-- Dedicated Copywriting Studio Markdown Editor -->
          {#if isLoadingCopy}
            <div class="loading-state">Loading 03_COPYWRITING/COPY.md from NAS…</div>
          {:else}
            <MarkdownEditor
              title="03_COPYWRITING / COPY.md"
              saveLabel="Save Copy to NAS"
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
                <span class="gallery-subtitle">Found in <code>05_DELIVERABLES/</code> or <code>04_Production/</code> on Synology NAS</span>
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
              <h3>Creative &amp; Visual Direction Matrix</h3>
              <p>Core visual tone, typography mood, and brand guidelines for designers.</p>
            </div>

            <div class="form-grid">
              <div class="form-field">
                <label class="form-label">Visual Concept / Style Direction</label>
                <input
                  type="text"
                  class="form-input"
                  bind:value={currentFrontmatter.creative_direction!.visual_concept}
                  placeholder="e.g. Modern Bold Minimalist, Dark Neon Accent"
                />
              </div>

              <div class="form-field">
                <label class="form-label">Primary Color Palette Tokens</label>
                <input
                  type="text"
                  class="form-input"
                  bind:value={currentFrontmatter.creative_direction!.color_palette}
                  placeholder="e.g. Prussian Blue #022057, SS Blue #043388, Gold #D4AF37"
                />
              </div>

              <div class="form-field full-width">
                <label class="form-label">Target Audience Demographics &amp; Psychology</label>
                <textarea
                  class="form-textarea"
                  rows="3"
                  bind:value={currentFrontmatter.creative_direction!.target_audience}
                  placeholder="Demographics, pain points, desired emotional response..."
                ></textarea>
              </div>
            </div>

            <div class="form-actions">
              <FluentButton
                appearance="primary"
                onclick={async () => {
                  await ApiClient.updateCreativeDirection(p.id, currentFrontmatter.creative_direction!);
                  appState.addToast('Creative direction saved to README.md', 'success');
                }}
              >
                Save Creative Direction
              </FluentButton>
            </div>
          </FluentCard>
        {/if}
      </main>

      <!-- ─── RIGHT INSPECTOR PANEL (32%) ─── -->
      {#if inspectorOpen}
        <aside class="task-inspector-panel">
          <!-- Inspector Tabs -->
          <div class="inspector-tabs">
            <button
              class="inspector-tab"
              class:active={inspectorTab === 'properties'}
              onclick={() => (inspectorTab = 'properties')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z"/></svg>
              <span>Properties</span>
            </button>

            <button
              class="inspector-tab"
              class:active={inspectorTab === 'discussion'}
              onclick={() => (inspectorTab = 'discussion')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
              <span>Discussion ({projectComments.length})</span>
            </button>
          </div>

          <div class="inspector-content">
            {#if inspectorTab === 'properties'}
              <!-- Properties Form -->
              <div class="properties-sheet">
                <div class="prop-group">
                  <span class="prop-label">Assignee (Designer)</span>
                  <div class="prop-value user-val">
                    <div class="user-avatar" style="background: {designerInfo?.avatarColor || 'var(--brand-primary, #043388)'};">
                      {#if designerAvatarSrc}
                        <img
                          src={designerAvatarSrc}
                          alt={p.designerName || p.designer}
                          class="avatar-photo"
                          onerror={(e) => ((e.currentTarget as HTMLElement).style.display = 'none')}
                        />
                      {:else}
                        {getInitials(p.designerName || p.designer || 'DS')}
                      {/if}
                    </div>
                    <span class="user-name">{designerInfo?.name || p.designerName || p.designer || 'Unassigned'}</span>
                  </div>
                </div>

                <div class="prop-group">
                  <span class="prop-label">Reviewer</span>
                  <div class="prop-value user-val-selectable">
                    <div class="user-avatar mgr-avatar" style="background: {managerInfo?.avatarColor || '#0284C7'};">
                      {#if managerAvatarSrc}
                        <img
                          src={managerAvatarSrc}
                          alt={selectedManager}
                          class="avatar-photo"
                          onerror={(e) => ((e.currentTarget as HTMLElement).style.display = 'none')}
                        />
                      {:else}
                        {getInitials(selectedManager && selectedManager !== 'Unassigned' ? selectedManager : 'AD')}
                      {/if}
                    </div>
                    <select
                      class="prop-manager-select"
                      bind:value={selectedManager}
                      disabled={isUpdatingManager}
                      onchange={() => handleManagerChange(selectedManager)}
                      aria-label="Select Reviewer"
                    >
                      <option value="Unassigned">-- Unassigned --</option>
                      {#if managerList.length === 0}
                        {#if selectedManager && selectedManager !== 'Unassigned'}
                          <option value={selectedManager}>{selectedManager}</option>
                        {/if}
                      {:else}
                        {#each managerList as mgr}
                          <option value={mgr.name}>
                            {mgr.name} {mgr.role ? `· ${mgr.role}` : ''}
                          </option>
                        {/each}
                        {#if selectedManager && selectedManager !== 'Unassigned' && !managerList.some(m => m.name.toLowerCase() === selectedManager.toLowerCase())}
                          <option value={selectedManager}>{selectedManager} (Current)</option>
                        {/if}
                      {/if}
                    </select>
                  </div>
                </div>

                <div class="prop-group">
                  <span class="prop-label">Corporate Brand / Subsidiary</span>
                  <div class="prop-value">
                    <span class="brand-chip">{p.brand || 'SS'}</span>
                    <span class="brand-full">{getCompanyFullName(p.brand || p.client)}</span>
                  </div>
                </div>

                <div class="prop-group">
                  <span class="prop-label">Priority Level</span>
                  <div class="prop-value">
                    <span class="priority-chip priority-{p.priority || 'medium'}">
                      {p.priority || 'medium'}
                    </span>
                  </div>
                </div>

                <div class="prop-group">
                  <span class="prop-label">Campaign Deadline</span>
                  <div class="prop-value">
                    <FluentIcons name="calendar" size={13} />
                    <span style="margin-left: 6px;">{p.deadline ? String(p.deadline).split('T')[0] : '2026-08-30'}</span>
                  </div>
                </div>

                <div class="prop-group">
                  <span class="prop-label">Deliverables Storage</span>
                  <div class="prop-value">
                    <FluentIcons name="folder" size={13} />
                    <code style="margin-left: 6px;">{projectStore.activeDeliverables.length} files</code>
                  </div>
                </div>

                <!-- Approval Trail Summary -->
                <div class="approvals-mini-section">
                  <span class="prop-label">Recent Approvals &amp; Sign-Offs</span>
                  {#if p.approvals && p.approvals.length > 0}
                    <div class="mini-app-list">
                      {#each p.approvals.slice(0, 3) as a}
                        <div class="mini-app-card decision-{a.decision}">
                          <div class="mini-app-header">
                            <span class="mini-app-decision">{a.decision.replace('_', ' ').toUpperCase()}</span>
                            <span class="mini-app-time">{new Date(a.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div class="mini-app-actor">{a.reviewer} ({a.role})</div>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="no-approvals-text">No approval records yet.</p>
                  {/if}
                </div>
              </div>
            {:else}
              <!-- Threaded In-Project Comments inside Inspector -->
              <ProjectComments
                projectId={p.id}
                deliverables={projectStore.activeDeliverables}
                bind:comments={projectComments}
              />
            {/if}
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
            This will permanently delete the project folder and <strong>all 5 subdirectories</strong> on Synology NAS storage:
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
  .clickup-task-container {
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
  }
  .crumb-link:hover { color: var(--text-brand, #043388); }
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

  .desktop-open-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-card-subtle, #F8FAFC);
    color: var(--text-primary, #0F172A);
    border: 1px solid var(--surface-card-border, #CBD5E1);
    border-radius: var(--radius-sm, 6px);
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.14s ease;
  }
  .desktop-open-btn:hover {
    background: var(--brand-tint, #EBF4FE);
    border-color: var(--brand-accent, #21A1F7);
    color: var(--text-brand, #043388);
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
    gap: 10px;
  }

  .ingest-vault-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    background: rgba(33, 161, 247, 0.15);
    color: #21A1F7;
    border: 1px solid rgba(33, 161, 247, 0.3);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .ingest-vault-btn:hover {
    background: #21A1F7;
    color: #0F172A;
  }

  .share-link-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .share-link-btn:hover {
    background: #10B981;
    color: #0F172A;
  }

  .timeline-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    background: rgba(139, 92, 246, 0.15);
    color: #A78BFA;
    border: 1px solid rgba(139, 92, 246, 0.3);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .timeline-btn:hover {
    background: #8B5CF6;
    color: #FFFFFF;
  }

  .export-handover-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
    border: 1px solid var(--brand-primary, #043388);
    cursor: pointer;
    transition: all 0.15s;
  }
  .export-handover-btn:hover {
    background: #0640A8;
    color: #FFFFFF;
  }

  .status-select {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    outline: none;
    border: 1px solid var(--surface-card-border);
  }
  .status-backlog { background: #F1F5F9; color: #475569; }
  .status-in-progress { background: #EBF4FE; color: #043388; border-color: #BFDBFE; }
  .status-review { background: #FFFBEB; color: #B45309; border-color: #FDE68A; }
  .status-revision { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
  .status-approved { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
  .status-done { background: #F3E8FF; color: #7E22CE; border-color: #E9D5FF; }

  .icon-toggle-btn {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.12s;
  }
  .icon-toggle-btn:hover, .icon-toggle-btn.active {
    background: var(--surface-card);
    border-color: var(--brand-accent);
    color: var(--text-primary);
  }

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
    font-size: 10px;
    font-weight: 800;
    background: var(--bg-app);
    padding: 1px 5px;
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

  .inspector-tabs {
    display: flex;
    border-bottom: 1px solid var(--surface-card-border);
    background: var(--surface-card-subtle, #F8FAFC);
  }

  .inspector-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border: none;
    background: transparent;
    border-bottom: 2px solid transparent;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
    font-family: inherit;
  }
  .inspector-tab:hover { color: var(--text-primary); }
  .inspector-tab.active {
    color: var(--brand-primary, #043388);
    border-bottom-color: var(--brand-primary, #043388);
    font-weight: 700;
    background: var(--surface-card);
  }

  .inspector-content {
    padding: 16px;
    overflow-y: auto;
  }

  /* Properties Sheet */
  .properties-sheet {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .prop-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--surface-card-border);
  }

  .prop-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .prop-value {
    font-size: 13px;
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
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--brand-primary, #043388);
    color: #FFFFFF;
    font-size: 10px;
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
    font-size: 11px;
    color: var(--text-brand, #043388);
    background: var(--brand-tint, #EBF4FE);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .brand-full { font-size: 12px; color: var(--text-secondary); }

  .priority-chip {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 4px;
  }
  .priority-high { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
  .priority-medium { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
  .priority-low { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }

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
    font-size: 11px;
    font-weight: 700;
  }
  .decision-approved .mini-app-decision { color: #047857; }
  .decision-revision_requested .mini-app-decision { color: #B91C1C; }
  .mini-app-time { font-size: 10px; color: var(--text-tertiary); font-weight: normal; }
  .mini-app-actor { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
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
    font-size: 10px;
    font-weight: 800;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(4px);
  }
  .del-thumb-icon {
    font-size: 30px;
    margin-bottom: 2px;
  }
  .del-thumb-text {
    font-size: 9.5px;
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
    font-size: 9.5px;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.7);
    color: #FFFFFF;
    padding: 1px 5px;
    border-radius: 4px;
  }

  .del-details {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .del-filename {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .del-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .status-tag {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 5px;
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

  /* Creative Direction Form */
  .form-section-header h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px 0; }
  .form-section-header p { font-size: 12px; color: var(--text-secondary); margin: 0 0 16px 0; }

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
    margin-bottom: 4px;
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
    outline: none;
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
