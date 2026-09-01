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
        <span class="header-meta">{projectStore.deliverables.length} Master Outputs</span>
      </div>
      <h1 class="view-title">Deliverables &amp; Assets</h1>
      <p class="view-subtitle">Inspect, approve, and download production-ready creative deliverables in real time.</p>
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
        <FluentIcons name="upload" size={13} />
        <span style="margin-left: 5px;">Ingest Deliverables</span>
      </FluentButton>

      <FluentButton appearance="secondary" size="sm" onclick={() => projectStore.loadDeliverables()}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
        <span style="margin-left: 5px;">Refresh</span>
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
      <span class="status-dot dot-pending"></span>
      <span class="kpi-label">Pending Sign-off</span>
      <span class="kpi-count">{pendingCount}</span>
    </button>
    <button class="kpi-pill pill-revision {filterStatus === 'revision' ? 'active' : ''}" onclick={() => filterStatus = 'revision'}>
      <span class="status-dot dot-revision"></span>
      <span class="kpi-label">Revision Required</span>
      <span class="kpi-count">{revisionCount}</span>
    </button>
    <button class="kpi-pill pill-approved {filterStatus === 'approved' ? 'active' : ''}" onclick={() => filterStatus = 'approved'}>
      <span class="status-dot dot-approved"></span>
      <span class="kpi-label">Approved &amp; Released</span>
      <span class="kpi-count">{approvedCount}</span>
    </button>
  </div>

  <!-- Filter & Search Toolbar -->
  <div class="deliverable-toolbar">
    <div class="search-box">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        placeholder="Search deliverables by name, job ID, designer..."
        value={rawSearchInput}
        oninput={handleSearchChange}
      />
      {#if rawSearchInput}
        <button class="clear-search" onclick={handleClearSearch} title="Clear search">✕</button>
      {/if}
    </div>

    <div class="filter-group">
      <!-- Media Class Filter -->
      <select bind:value={filterMediaClass} class="clean-select" aria-label="Filter Media Class">
        <option value="all">Format: All</option>
        <option value="raster_image">Images (PNG, JPG, WebP)</option>
        <option value="video_master">Videos (MP4, MOV)</option>
        <option value="print_pdf">PDF / Print</option>
        <option value="vector_graphics">Vectors (SVG, AI)</option>
      </select>

      <!-- Aspect Ratio Filter -->
      <select bind:value={filterAspectRatio} class="clean-select" aria-label="Filter Aspect Ratio">
        <option value="all">Ratio: All</option>
        <option value="1:1">1:1 Square (Feed)</option>
        <option value="9:16">9:16 Vertical (Reels)</option>
        <option value="16:9">16:9 Landscape</option>
        <option value="4:5">4:5 Portrait</option>
      </select>

      <!-- Brand Filter -->
      <select bind:value={filterBrand} class="clean-select" aria-label="Filter Brand">
        <option value="all">Brand: All ({availableBrands.length})</option>
        {#each availableBrands as b}
          <option value={b}>{b}</option>
        {/each}
      </select>

      <!-- View Mode Toggle -->
      <div class="view-mode-toggle">
        <button class="mode-btn {viewMode === 'grid' ? 'active' : ''}" onclick={() => viewMode = 'grid'} title="Grid Card View">
          <FluentIcons name="grid" size={13} />
        </button>
        <button class="mode-btn {viewMode === 'table' ? 'active' : ''}" onclick={() => viewMode = 'table'} title="Metadata Table View">
          <FluentIcons name="table" size={13} />
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
          <div class="del-card">
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
                <div class="media-placeholder video-bg">
                  <FluentIcons name="video" size={24} />
                  <span class="media-type-label">VIDEO</span>
                </div>
              {:else if d.isPdf || d.previewType === 'pdf'}
                <div class="media-placeholder pdf-bg">
                  <FluentIcons name="file" size={24} color="#EF4444" />
                  <span class="media-type-label">PDF</span>
                </div>
              {:else}
                <div class="media-placeholder file-bg">
                  <span class="media-type-label">{(d.ext || d.extension || (d.filename ? d.filename.split('.').pop() : '') || 'FILE').replace('.', '').toUpperCase()}</span>
                </div>
              {/if}

              <!-- Status Tag Overlay Top Left -->
              <span class="preview-status-badge status-{(d.status || 'pending')}">
                <span class="badge-dot"></span>
                {(d.status || 'pending')}
              </span>

              <!-- Format / Ratio Badge Top Right -->
              <span class="format-badge">
                {d.format || (d.ext ? d.ext.toUpperCase().replace('.', '') : 'ASSET')}
                {#if d.aspectRatioEstimate && d.aspectRatioEstimate !== 'standard'}
                  · {d.aspectRatioEstimate}
                {/if}
              </span>
            </div>

            <!-- Card Body -->
            <div class="del-body">
              <div class="del-top-meta">
                <span class="job-tag">{d.project?.jobId || d.projectJobId || '0000'}</span>
                <span class="brand-tag">{d.project?.brand || d.projectBrand || 'SS'}</span>
                <span class="proj-title-trunc" title={d.project?.title || d.projectTitle || ''}>
                  {d.project?.title || d.projectTitle || 'Creative Asset'}
                </span>
              </div>

              <h3 class="del-title" title={d.filename}>{d.filename}</h3>

              <div class="del-footer-row">
                <span class="meta-designer">
                  <FluentIcons name="user" size={11} />
                  <span>{d.project?.designer || d.projectDesigner || 'Unassigned'}</span>
                </span>
                <span class="meta-size">{d.sizeBytes ? (d.sizeBytes / (1024 * 1024)).toFixed(2) : '0.00'} MB</span>
              </div>

              <!-- Quick Action Bar -->
              <div class="del-actions" onclick={(e) => e.stopPropagation()}>
                <button class="action-btn-pill" onclick={() => openLightbox(d)}>
                  <FluentIcons name="open" size={12} />
                  <span>Inspect</span>
                </button>

                <div class="action-icons-right">
                  {#if d.isImage || d.previewType === 'image'}
                    <button class="tool-icon-btn" title="Smart Social Resizer (1:1, 9:16, 16:9, 4:5)" onclick={() => openResizer(d)}>
                      <FluentIcons name="vector" size={12} />
                    </button>
                    <button class="tool-icon-btn" title="Print &amp; POSM Preflight Validator (DPI, Bleed &amp; CMYK)" onclick={() => openPreflight(d)}>
                      <FluentIcons name="printer" size={12} />
                    </button>
                  {/if}
                  <button class="tool-icon-btn" title="Generate Client Review Link" onclick={() => openShare(d)}>
                    <FluentIcons name="link" size={12} />
                  </button>
                  {#if d.downloadUrl}
                    <a href={d.downloadUrl} download={d.filename} class="tool-icon-btn" title="Download Output File">
                      <FluentIcons name="download" size={12} />
                    </a>
                  {/if}
                </div>
              </div>
            </div>
          </div>
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
    gap: 8px;
  }

  .kpi-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 20px;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-secondary);
    transition: all 0.15s ease;
  }

  .kpi-pill:hover {
    background: var(--surface-card-subtle, #F8FAFC);
    border-color: var(--brand-accent, #0078D4);
    color: var(--text-primary);
  }

  .kpi-pill.active {
    background: var(--brand-tint, rgba(0, 120, 212, 0.08));
    border-color: var(--brand-accent, #0078D4);
    color: var(--brand-primary, #0078D4);
  }

  .kpi-count {
    background: var(--surface-card-subtle);
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }
  .dot-pending { background: #F59E0B; }
  .dot-revision { background: #EF4444; }
  .dot-approved { background: #10B981; }

  /* Toolbar */
  .deliverable-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .search-box {
    flex: 1;
    min-width: 240px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    padding: 7px 12px;
    color: var(--text-secondary);
  }

  .search-box input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 13px;
  }

  .clear-search {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 11px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .clean-select {
    padding: 6px 12px;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 12.5px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    transition: all 0.12s;
  }
  .clean-select:hover {
    border-color: var(--brand-accent);
  }

  .view-mode-toggle {
    display: flex;
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    overflow: hidden;
    padding: 2px;
  }

  .mode-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.12s;
  }
  .mode-btn:hover { color: var(--text-primary); }
  .mode-btn.active {
    background: var(--brand-tint, rgba(0, 120, 212, 0.1));
    color: var(--brand-primary, #0078D4);
  }

  /* Grid & Cards */
  .deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 16px;
  }

  .del-card-wrapper {
    cursor: pointer;
  }

  .del-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: 12px;
    padding: 12px;
    transition: all 0.16s ease;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .del-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: var(--brand-accent);
  }

  .del-preview-box {
    height: 180px;
    background: #040812;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .del-preview-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.25s ease;
  }
  .del-card:hover .del-preview-box img {
    transform: scale(1.03);
  }

  .media-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    height: 100%;
  }
  .video-bg { background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color: #A78BFA; }
  .pdf-bg { background: linear-gradient(135deg, #450A0A 0%, #7F1D1D 100%); color: #FCA5A5; }
  .file-bg { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #94A3B8; }

  .media-type-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  .preview-status-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 3px 8px;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .preview-status-badge .badge-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  .status-approved { background: rgba(16, 185, 129, 0.9); color: #FFFFFF; }
  .status-revision { background: rgba(239, 68, 68, 0.9); color: #FFFFFF; }
  .status-pending { background: rgba(245, 158, 11, 0.9); color: #FFFFFF; }

  .format-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.65);
    color: #F8FAFC;
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
  }

  .del-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .del-top-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }

  .job-tag {
    font-family: var(--font-mono, monospace);
    font-weight: 700;
    color: var(--brand-accent, #0078D4);
    background: var(--brand-tint, rgba(0, 120, 212, 0.08));
    padding: 1px 5px;
    border-radius: 4px;
  }

  .brand-tag {
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--surface-card-subtle);
    padding: 1px 5px;
    border-radius: 4px;
  }

  .proj-title-trunc {
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .del-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 2px 0;
  }

  .del-footer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11.5px;
    color: var(--text-tertiary);
    font-weight: 500;
    padding: 4px 0 8px 0;
  }

  .meta-designer {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .del-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid var(--surface-card-border);
    margin-top: auto;
  }

  .action-btn-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--brand-primary, #0078D4);
    background: var(--brand-tint, rgba(0, 120, 212, 0.08));
    border: 1px solid rgba(0, 120, 212, 0.2);
    cursor: pointer;
    transition: all 0.12s;
  }
  .action-btn-pill:hover {
    background: var(--brand-primary, #0078D4);
    color: #FFFFFF;
  }

  .action-icons-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tool-icon-btn {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    text-decoration: none;
    transition: all 0.12s;
  }
  .tool-icon-btn:hover {
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
