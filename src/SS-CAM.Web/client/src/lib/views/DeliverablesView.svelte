<script lang="ts">
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { ApiClient } from '$lib/services/api';
  import type { DeliverableItem } from '$lib/types';
  import FluentCard from '$lib/components/ui/FluentCard.svelte';
  import FluentBadge from '$lib/components/ui/FluentBadge.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';
  import DeliverableLightbox from '$lib/components/features/DeliverableLightbox.svelte';
  import VaultIngesterModal from '$lib/components/features/VaultIngesterModal.svelte';
  import BatchResizerModal from '$lib/components/features/BatchResizerModal.svelte';
  import ShareLinkModal from '$lib/components/features/ShareLinkModal.svelte';
  import PreflightValidatorModal from '$lib/components/features/PreflightValidatorModal.svelte';

  let selectedDeliverable = $state<DeliverableItem | null>(null);
  let lightboxOpen = $state<boolean>(false);
  let showIngesterModal = $state<boolean>(false);
  let ingestTargetProject = $state<any>(null);

  // Modals for Resizer, Share Links, & Preflight
  let showResizerModal = $state<boolean>(false);
  let resizerTargetDeliverable = $state<DeliverableItem | null>(null);
  let showShareModal = $state<boolean>(false);
  let shareTargetProject = $state<any>(null);
  let showPreflightModal = $state<boolean>(false);
  let preflightTargetDeliverable = $state<DeliverableItem | null>(null);

  // DAM Filters & View Mode
  let filterStatus = $state<string>('all');
  let searchQuery = $state<string>('');
  let rawSearchInput = $state<string>('');
  let searchDebounceTimer: any = null;
  let filterBrand = $state<string>('all');
  let filterMediaClass = $state<string>('all');
  let filterAspectRatio = $state<string>('all');
  let viewMode = $state<'grid' | 'table'>('grid');

  function handleSearchChange(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    rawSearchInput = val;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchQuery = val;
    }, 120);
  }

  function handleClearSearch() {
    rawSearchInput = '';
    searchQuery = '';
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  }

  onMount(async () => {
    await projectStore.loadDeliverables();
  });

  function openLightbox(d: DeliverableItem) {
    selectedDeliverable = d;
    lightboxOpen = true;
  }

  function openResizer(d: DeliverableItem) {
    resizerTargetDeliverable = d;
    showResizerModal = true;
  }

  function openShare(d: DeliverableItem) {
    const projId = d.project?.id || d.projectId || d.project?.jobId || d.projectJobId;
    const project = projectStore.projects.find(p => p.id === projId || p.jobId === projId) || {
      id: projId,
      title: d.project?.title || d.projectTitle || 'Creative Deliverables'
    };
    shareTargetProject = project;
    showShareModal = true;
  }

  function openPreflight(d: DeliverableItem) {
    preflightTargetDeliverable = d;
    showPreflightModal = true;
  }

  const filteredDeliverables = $derived(
    projectStore.deliverables.filter(d => {
      const status = d.status || 'pending';
      const brand = d.project?.brand || d.projectBrand || 'SS';
      const filename = d.filename || '';
      const projTitle = d.project?.title || d.projectTitle || '';
      const jobId = d.project?.jobId || d.projectJobId || '';
      const designer = d.project?.designer || d.projectDesigner || '';
      const mediaClass = d.mediaClass || (d.isVideo ? 'video_master' : d.isPdf ? 'print_pdf' : 'raster_image');
      const ratio = d.aspectRatioEstimate || 'standard';

      if (filterStatus !== 'all' && status !== filterStatus) return false;
      if (filterBrand !== 'all' && brand !== filterBrand) return false;
      if (filterMediaClass !== 'all' && mediaClass !== filterMediaClass) return false;
      if (filterAspectRatio !== 'all' && ratio !== filterAspectRatio) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = filename.toLowerCase().includes(q) ||
                        projTitle.toLowerCase().includes(q) ||
                        jobId.toLowerCase().includes(q) ||
                        designer.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    })
  );

  const pendingCount = $derived(projectStore.deliverables.filter(d => (d.status || 'pending') === 'pending').length);
  const revisionCount = $derived(projectStore.deliverables.filter(d => d.status === 'revision').length);
  const approvedCount = $derived(projectStore.deliverables.filter(d => d.status === 'approved').length);
  const availableBrands = $derived(Array.from(new Set(projectStore.deliverables.map(d => d.project?.brand || d.projectBrand || 'SS'))).filter(Boolean));
</script>

<div class="deliverables-view-container">
  <!-- View Header -->
  <div class="view-header">
    <div class="header-left">
      <div class="header-tag">
        <span class="badge-accent">Synology Vault</span>
        <span class="header-meta">{projectStore.deliverables.length} Total Master Outputs</span>
      </div>
      <h1 class="view-title">Deliverables & Review Queue</h1>
      <p class="view-subtitle">Inspect, approve, and manage creative outputs across campaign projects in real time</p>
    </div>

    <div class="header-actions">
      <FluentButton 
        appearance="primary" 
        size="sm" 
        onclick={() => { 
          ingestTargetProject = projectStore.projects[0] || null; 
          showIngesterModal = true; 
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
        </svg>
        <span>Ingest Deliverables</span>
      </FluentButton>

      <FluentButton appearance="secondary" size="sm" onclick={() => projectStore.loadDeliverables()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
        <span>Refresh Queue</span>
      </FluentButton>
    </div>
  </div>

  <!-- Summary KPI Bar -->
  <div class="deliverable-kpi-bar">
    <button class="kpi-pill {filterStatus === 'all' ? 'active' : ''}" onclick={() => filterStatus = 'all'}>
      <span class="kpi-label">All Deliverables</span>
      <span class="kpi-count">{projectStore.deliverables.length}</span>
    </button>
    <button class="kpi-pill pill-pending {filterStatus === 'pending' ? 'active' : ''}" onclick={() => filterStatus = 'pending'}>
      <span class="kpi-label">Pending Sign-off</span>
      <span class="kpi-count">{pendingCount}</span>
    </button>
    <button class="kpi-pill pill-revision {filterStatus === 'revision' ? 'active' : ''}" onclick={() => filterStatus = 'revision'}>
      <span class="kpi-label">Revision Required</span>
      <span class="kpi-count">{revisionCount}</span>
    </button>
    <button class="kpi-pill pill-approved {filterStatus === 'approved' ? 'active' : ''}" onclick={() => filterStatus = 'approved'}>
      <span class="kpi-label">Approved & Released</span>
      <span class="kpi-count">{approvedCount}</span>
    </button>
  </div>

  <!-- Filter & Search Toolbar -->
  <div class="deliverable-toolbar">
    <div class="search-box">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        placeholder="Filter deliverables by filename, job ID, designer..."
        value={rawSearchInput}
        oninput={handleSearchChange}
      />
      {#if rawSearchInput}
        <button class="clear-search" onclick={handleClearSearch}>✕</button>
      {/if}
    </div>

    <div class="filter-group">
      <!-- Media Class Filter -->
      <select bind:value={filterMediaClass} class="brand-select">
        <option value="all">All Media Formats</option>
        <option value="raster_image">Images (PNG, JPG, WebP)</option>
        <option value="video_master">Master Videos (MP4, MOV)</option>
        <option value="print_pdf">Print &amp; PDF Exports</option>
        <option value="vector_graphics">Vectors &amp; AI (SVG, AI)</option>
      </select>

      <!-- Aspect Ratio Filter -->
      <select bind:value={filterAspectRatio} class="brand-select">
        <option value="all">All Aspect Ratios</option>
        <option value="1:1">1:1 Square (Feed)</option>
        <option value="9:16">9:16 Vertical (Story / Reel)</option>
        <option value="16:9">16:9 Landscape (YouTube)</option>
        <option value="4:5">4:5 Portrait (Meta)</option>
      </select>

      <!-- Brand Filter -->
      <select bind:value={filterBrand} class="brand-select">
        <option value="all">All Brands ({availableBrands.length})</option>
        {#each availableBrands as b}
          <option value={b}>{b} Holding</option>
        {/each}
      </select>

      <!-- View Mode Toggle -->
      <div class="view-mode-toggle">
        <button class="mode-btn {viewMode === 'grid' ? 'active' : ''}" onclick={() => viewMode = 'grid'} title="Grid Card View">
          <FluentIcons name="grid" size={14} />
        </button>
        <button class="mode-btn {viewMode === 'table' ? 'active' : ''}" onclick={() => viewMode = 'table'} title="Metadata Table View">
          <FluentIcons name="table" size={14} />
        </button>
      </div>
    </div>
  </div>

  <!-- Main Deliverables Content -->
  {#if projectStore.isLoading}
    <div class="state-card">
      <div class="spinner-large"></div>
      <p class="state-title">Scanning Synology Vault Deliverables...</p>
      <p class="state-desc">Indexing high-resolution renders, mockups, and PDFs from active campaigns.</p>
    </div>
  {:else if filteredDeliverables.length === 0}
    <div class="state-card empty-state">
      <div class="empty-icon-box">
        <FluentIcons name="folder" size={36} color="rgba(255,255,255,0.2)" />
      </div>
      <p class="state-title">No deliverables match the active filter</p>
      <p class="state-desc">Try clearing your search query or selecting "All Deliverables".</p>
      <FluentButton appearance="secondary" size="sm" onclick={() => { filterStatus = 'all'; searchQuery = ''; filterBrand = 'all'; filterMediaClass = 'all'; filterAspectRatio = 'all'; }}>
        Reset Filters
      </FluentButton>
    </div>
  {:else if viewMode === 'grid'}
    <div class="deliverables-grid">
      {#each filteredDeliverables as d}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="del-card-wrapper" onclick={() => openLightbox(d)}>
          <FluentCard hoverLift padding="12px" class="del-card">
            <!-- Preview Box -->
            <div class="del-preview-box">
              {#if (d.isImage || d.previewType === 'image') && d.previewUrl}
                <img
                  src={d.previewUrl}
                  alt={d.filename}
                  loading="lazy"
                  onerror={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              {:else if d.isVideo || d.previewType === 'video'}
                <div class="media-badge-icon video-icon">
                  <FluentIcons name="video" size={14} />
                  <span style="margin-left: 4px;">VIDEO</span>
                </div>
              {:else if d.isPdf || d.previewType === 'pdf'}
                <div class="media-badge-icon pdf-icon">
                  <FluentIcons name="file" size={14} color="#EF4444" />
                  <span style="margin-left: 4px;">PDF</span>
                </div>
              {:else}
                <div class="doc-icon">{(d.ext || d.extension || (d.filename ? d.filename.split('.').pop() : '') || 'FILE').replace('.', '').toUpperCase()}</div>
              {/if}

              <!-- Status Tag Overlay -->
              <span class="preview-status-tag status-{(d.status || 'pending')}">
                {(d.status || 'pending').toUpperCase()}
              </span>

              {#if d.aspectRatioEstimate && d.aspectRatioEstimate !== 'standard'}
                <span class="ratio-pill">{d.aspectRatioEstimate}</span>
              {/if}
            </div>

            <!-- Card Body -->
            <div class="del-body">
              <div class="del-top">
                <span class="job-id">{d.project?.jobId || d.projectJobId || 'JOB'}</span>
                <span class="brand-pill">{d.project?.brand || d.projectBrand || 'SS'}</span>
              </div>

              <h3 class="del-title" title={d.filename}>{d.filename}</h3>
              <p class="del-proj-name" title={d.project?.title || d.projectTitle || 'Unknown Project'}>
                {d.project?.title || d.projectTitle || 'Unknown Project'}
              </p>

              <div class="del-meta-row">
                <span class="meta-designer">
                  <FluentIcons name="user" size={11} />
                  <span style="margin-left: 4px;">{d.project?.designer || d.projectDesigner || 'Unassigned'}</span>
                </span>
                <span class="meta-size">{d.sizeBytes ? (d.sizeBytes / (1024 * 1024)).toFixed(2) : '0.00'} MB</span>
              </div>

              <!-- Action Bar -->
              <div class="del-actions" onclick={(e) => e.stopPropagation()}>
                <FluentButton appearance="secondary" size="xs" onclick={() => openLightbox(d)}>
                  Inspect
                </FluentButton>
                {#if d.isImage || d.previewType === 'image'}
                  <button class="tool-icon-btn" title="Smart Social Resizer (1:1, 9:16, 16:9, 4:5)" onclick={() => openResizer(d)}>
                    <FluentIcons name="vector" size={13} />
                  </button>
                  <button class="tool-icon-btn" title="Print &amp; POSM Preflight Validator (DPI, Bleed &amp; CMYK)" onclick={() => openPreflight(d)}>
                    <FluentIcons name="printer" size={13} />
                  </button>
                {/if}
                <button class="tool-icon-btn" title="Generate Client Review Link" onclick={() => openShare(d)}>
                  <FluentIcons name="link" size={13} />
                </button>
                {#if d.downloadUrl}
                  <a href={d.downloadUrl} download={d.filename} class="download-link" title="Download Output File">
                    <FluentIcons name="download" size={13} />
                  </a>
                {/if}
              </div>
            </div>
          </FluentCard>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Compact Metadata Table Mode -->
    <div class="dam-table-card">
      <table class="dam-table">
        <thead>
          <tr>
            <th>Preview</th>
            <th>Filename</th>
            <th>Project / Job ID</th>
            <th>Format</th>
            <th>Aspect Ratio</th>
            <th>Size</th>
            <th>Status</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredDeliverables as d}
            <tr onclick={() => openLightbox(d)} class="table-row-clickable">
              <td class="table-thumb-col">
                {#if (d.isImage || d.previewType === 'image') && d.previewUrl}
                  <img src={d.previewUrl} alt={d.filename} class="table-thumb" />
                {:else if d.isVideo}
                  <span class="table-icon-pill">
                    <FluentIcons name="video" size={12} />
                    <span style="margin-left: 3px;">Video</span>
                  </span>
                {:else if d.isPdf}
                  <span class="table-icon-pill">
                    <FluentIcons name="file" size={12} color="#EF4444" />
                    <span style="margin-left: 3px;">PDF</span>
                  </span>
                {:else}
                  <span class="table-icon-pill">
                    <FluentIcons name="folder" size={12} />
                    <span style="margin-left: 3px;">File</span>
                  </span>
                {/if}
              </td>
              <td><span class="table-filename">{d.filename}</span></td>
              <td>
                <div class="table-proj-info">
                  <span class="job-id-sm">{d.project?.jobId || d.projectJobId || 'JOB'}</span>
                  <span class="proj-title-sm">{d.project?.title || d.projectTitle || ''}</span>
                </div>
              </td>
              <td><span class="format-badge">{d.format || d.ext}</span></td>
              <td><span class="ratio-badge">{d.aspectRatioEstimate || 'Auto'}</span></td>
              <td><span class="size-text">{d.sizeBytes ? (d.sizeBytes / (1024 * 1024)).toFixed(2) : '0.00'} MB</span></td>
              <td><span class="status-badge status-{(d.status || 'pending')}">{(d.status || 'pending').toUpperCase()}</span></td>
              <td style="text-align:right;" onclick={(e) => e.stopPropagation()}>
                <div class="table-actions">
                  {#if d.isImage || d.previewType === 'image'}
                    <button class="tool-icon-btn" title="Social Resizer" onclick={() => openResizer(d)}>
                      <FluentIcons name="vector" size={13} />
                    </button>
                    <button class="tool-icon-btn" title="Print Preflight" onclick={() => openPreflight(d)}>
                      <FluentIcons name="printer" size={13} />
                    </button>
                  {/if}
                  <button class="tool-icon-btn" title="Share Link" onclick={() => openShare(d)}>
                    <FluentIcons name="link" size={13} />
                  </button>
                  {#if d.downloadUrl}
                    <a href={d.downloadUrl} download={d.filename} class="download-link" title="Download">
                      <FluentIcons name="download" size={13} />
                    </a>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Review & Approval Lightbox Modal -->
  <DeliverableLightbox
    deliverable={selectedDeliverable}
    bind:open={lightboxOpen}
    onClose={() => lightboxOpen = false}
    onApprove={async (d) => {
      const projId = d.project?.id || d.projectId || d.project?.jobId || d.projectJobId;
      if (projId) {
        await ApiClient.submitDecision(projId, { decision: 'approved', deliverableId: d.id });
        appState.addToast(`Deliverable "${d.filename}" approved!`, 'success', 'Sign-Off Recorded');
        await projectStore.loadDeliverables();
      }
    }}
    onRevision={async (d) => {
      const projId = d.project?.id || d.projectId || d.project?.jobId || d.projectJobId;
      if (projId) {
        await ApiClient.submitDecision(projId, { decision: 'revision_requested', deliverableId: d.id });
        appState.addToast(`Revision requested for "${d.filename}"`, 'warning', 'Revision Logged');
        await projectStore.loadDeliverables();
      }
    }}
  />

  <!-- Vault Ingester Modal -->
  <VaultIngesterModal
    bind:open={showIngesterModal}
    projectId={ingestTargetProject?.id}
    projectTitle={ingestTargetProject?.title}
    onSuccess={() => projectStore.loadDeliverables()}
  />

  <!-- Batch Resizer Modal -->
  <BatchResizerModal
    bind:open={showResizerModal}
    deliverable={resizerTargetDeliverable}
    projectTitle={resizerTargetDeliverable?.project?.title || resizerTargetDeliverable?.projectTitle}
  />

  <!-- Share Link Modal -->
  <ShareLinkModal
    bind:open={showShareModal}
    projectId={shareTargetProject?.id}
    projectTitle={shareTargetProject?.title}
  />

  <!-- Print Preflight Validator Modal -->
  <PreflightValidatorModal
    bind:open={showPreflightModal}
    deliverable={preflightTargetDeliverable}
    projectTitle={preflightTargetDeliverable?.project?.title || preflightTargetDeliverable?.projectTitle}
  />
</div>

<style>
  .deliverables-view-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-bottom: 40px;
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
  }

  .header-tag {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .badge-accent {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(4, 51, 136, 0.15);
    color: var(--brand-accent);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(33, 161, 247, 0.3);
  }

  .header-meta {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-tertiary);
  }

  .view-title {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .view-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  /* Summary KPI Bar */
  .deliverable-kpi-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .kpi-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.15s ease;
  }

  .kpi-pill:hover {
    background: var(--surface-card-hover);
    border-color: var(--brand-accent);
    color: var(--text-primary);
  }

  .kpi-pill.active {
    background: rgba(33, 161, 247, 0.12);
    border-color: var(--brand-accent);
    color: var(--brand-accent);
  }

  .kpi-count {
    background: var(--surface-card-subtle);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11.5px;
    font-weight: 700;
  }

  .kpi-pill.pill-pending.active {
    background: rgba(217, 119, 6, 0.12);
    border-color: #D97706;
    color: #D97706;
  }
  .kpi-pill.pill-revision.active {
    background: rgba(239, 68, 68, 0.12);
    border-color: #EF4444;
    color: #EF4444;
  }
  .kpi-pill.pill-approved.active {
    background: rgba(16, 185, 129, 0.12);
    border-color: #10B981;
    color: #10B981;
  }

  /* Toolbar */
  .deliverable-toolbar {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 260px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    padding: 8px 14px;
    color: var(--text-secondary);
  }

  .search-box input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 13.5px;
  }

  .clear-search {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 12px;
  }

  .brand-select {
    padding: 8px 14px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  /* Grid & Cards */
  .deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 18px;
  }

  .del-card-wrapper {
    cursor: pointer;
  }

  .del-preview-box {
    height: 180px;
    background: #000000;
    border-radius: var(--radius-md);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .del-preview-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .doc-icon, .media-badge-icon {
    font-size: 16px;
    font-weight: 800;
    color: #FFFFFF;
    background: var(--brand-primary);
    padding: 12px 24px;
    border-radius: 8px;
    letter-spacing: 1px;
  }

  .video-icon { background: #7C3AED; }
  .pdf-icon { background: #DC2626; }

  .preview-status-tag {
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.5px;
    padding: 3px 8px;
    border-radius: 4px;
    backdrop-filter: blur(8px);
  }

  .status-approved { background: rgba(16, 185, 129, 0.85); color: #FFFFFF; }
  .status-revision { background: rgba(239, 68, 68, 0.85); color: #FFFFFF; }
  .status-pending { background: rgba(217, 119, 6, 0.85); color: #FFFFFF; }

  .del-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .del-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .job-id {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-accent);
  }

  .brand-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    color: var(--text-secondary);
  }

  .del-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 2px 0 0 0;
  }

  .del-proj-name {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 6px;
  }

  .del-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: var(--text-tertiary);
    font-weight: 600;
    padding: 6px 0;
    border-top: 1px solid var(--surface-card-border);
  }

  .del-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 8px;
  }

  .download-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 12px;
    transition: all 0.15s ease;
  }

  .download-link:hover {
    background: var(--surface-card-hover);
    color: var(--brand-accent);
    border-color: var(--brand-accent);
  }

  /* State Cards */
  .state-card {
    text-align: center;
    padding: 60px 20px;
    background: var(--surface-card);
    border: 1px dashed var(--surface-card-border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .empty-icon {
    font-size: 40px;
    margin-bottom: 4px;
  }

  .state-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .state-desc {
    font-size: 13px;
    color: var(--text-secondary);
    max-width: 420px;
    margin-bottom: 12px;
  }

  .tool-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--surface-card-subtle, rgba(255, 255, 255, 0.05));
    border: 1px solid var(--surface-card-border, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    color: #FFF;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s ease;
  }
  .tool-icon-btn:hover {
    background: rgba(33, 161, 247, 0.2);
    border-color: #38BDF8;
  }

  .view-mode-toggle {
    display: flex;
    background: var(--surface-card, #0F172A);
    border: 1px solid var(--surface-card-border, rgba(255, 255, 255, 0.15));
    border-radius: 6px;
    overflow: hidden;
  }
  .mode-btn {
    background: transparent;
    border: none;
    padding: 6px 10px;
    color: #94A3B8;
    cursor: pointer;
    font-size: 13px;
  }
  .mode-btn.active {
    background: #043388;
    color: #FFF;
  }

  .ratio-pill {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.75);
    color: #38BDF8;
    font-size: 9px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(56, 189, 248, 0.4);
    font-family: monospace;
  }

  /* DAM Table */
  .dam-table-card {
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow-x: auto;
  }

  .dam-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    text-align: left;
  }

  .dam-table th {
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #94A3B8;
  }

  .dam-table td {
    padding: 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #CBD5E1;
  }

  .table-row-clickable {
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .table-row-clickable:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .table-thumb-col { width: 50px; }
  .table-thumb {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .table-icon-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }

  .table-filename { font-weight: 700; color: #FFF; }
  .table-proj-info { display: flex; flex-direction: column; gap: 2px; }
  .job-id-sm { font-size: 11px; font-weight: 800; color: #38BDF8; font-family: monospace; }
  .proj-title-sm { font-size: 11px; color: #94A3B8; }

  .format-badge, .ratio-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    font-family: monospace;
  }
  .ratio-badge { color: #38BDF8; }

  .status-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .status-badge.status-pending { background: rgba(245, 158, 11, 0.2); color: #F59E0B; }
  .status-badge.status-revision { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
  .status-badge.status-approved { background: rgba(16, 185, 129, 0.2); color: #10B981; }

  .table-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
</style>
