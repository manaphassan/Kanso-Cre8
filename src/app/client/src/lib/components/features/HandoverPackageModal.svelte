<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';
  import FluentIcons from '$lib/components/ui/FluentIcons.svelte';
  import type { DeliverableItem } from '$lib/types';

  interface Props {
    open?: boolean;
    project?: any;
    onClose?: () => void;
  }

  let {
    open = $bindable(false),
    project = null,
    onClose
  }: Props = $props();

  // Inclusion Options
  let includeManifest = $state<boolean>(true);
  let includeBrief = $state<boolean>(true);
  let includeCopy = $state<boolean>(true);
  let includeWip = $state<boolean>(false);

  // Selected file names (or relPaths)
  let selectedFileNames = $state<Record<string, boolean>>({});
  let linkCopied = $state<boolean>(false);
  let studioProfile = $state<any>(null);
  let isLoadingProfile = $state<boolean>(false);

  const projId = $derived(
    project?.id || project?.projectId || project?.jobId || ''
  );

  const projectTitle = $derived(
    project?.title || project?.projectTitle || 'Creative Project'
  );

  const projectBrand = $derived(
    project?.brand || project?.projectBrand || 'ACME'
  );

  const projectJobId = $derived(
    project?.jobId || project?.projectJobId || projId
  );

  // Deliverables list for this project
  const availableDeliverables = $derived.by<DeliverableItem[]>(() => {
    if (!project) return [];
    if (Array.isArray(project.deliverables) && project.deliverables.length > 0) {
      return project.deliverables;
    }
    // Fallback: match from projectStore
    const targetId = projId;
    return projectStore.deliverables.filter(d => {
      const pId = d.project?.id || d.projectId || d.project?.jobId || d.projectJobId;
      return pId === targetId;
    });
  });

  // Initialize all files as selected whenever modal opens with a project
  $effect(() => {
    if (open && availableDeliverables.length > 0) {
      const initial: Record<string, boolean> = {};
      for (const d of availableDeliverables) {
        const key = d.filename || d.id;
        initial[key] = true;
      }
      selectedFileNames = initial;
    }
  });

  // Fetch Studio Profile for Remittance Colophon
  $effect(() => {
    if (open && !studioProfile && !isLoadingProfile) {
      loadStudioProfile();
    }
  });

  async function loadStudioProfile() {
    try {
      isLoadingProfile = true;
      const res = await fetch('/api/system/studio-profile', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          studioProfile = data.profile;
        }
      }
    } catch (err) {
      console.warn('[HandoverPackageModal] Could not load studio profile:', err);
    } finally {
      isLoadingProfile = false;
    }
  }

  // Selected deliverables list
  const selectedDeliverables = $derived(
    availableDeliverables.filter(d => selectedFileNames[d.filename || d.id])
  );

  // Selected size in bytes
  const selectedSizeBytes = $derived(
    selectedDeliverables.reduce((acc, d) => acc + (d.sizeBytes || 0), 0)
  );

  function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function toggleSelectAll() {
    const allSelected = availableDeliverables.every(d => selectedFileNames[d.filename || d.id]);
    const next: Record<string, boolean> = {};
    for (const d of availableDeliverables) {
      next[d.filename || d.id] = !allSelected;
    }
    selectedFileNames = next;
  }

  function toggleFile(filename: string) {
    selectedFileNames = {
      ...selectedFileNames,
      [filename]: !selectedFileNames[filename]
    };
  }

  // Build Download URL
  const downloadUrl = $derived.by(() => {
    if (!projId) return '';
    const params = new URLSearchParams();
    if (includeWip) params.set('wip', 'true');
    if (!includeBrief) params.set('brief', 'false');
    if (!includeCopy) params.set('copy', 'false');
    if (!includeManifest) params.set('manifest', 'false');

    // If not all files are selected, pass explicit files list
    const selectedKeys = availableDeliverables
      .filter(d => selectedFileNames[d.filename || d.id])
      .map(d => d.filename || d.id);

    if (selectedKeys.length > 0 && selectedKeys.length < availableDeliverables.length) {
      params.set('files', selectedKeys.join(','));
    }

    const qs = params.toString();
    return `/api/projects/${encodeURIComponent(projId)}/export/zip${qs ? '?' + qs : ''}`;
  });

  async function copyDownloadLink() {
    if (!downloadUrl) return;
    const fullUrl = window.location.origin + downloadUrl;
    try {
      await navigator.clipboard.writeText(fullUrl);
      linkCopied = true;
      setTimeout(() => {
        linkCopied = false;
      }, 2500);
    } catch (err) {
      console.warn('Failed to copy link:', err);
    }
  }

  function triggerDownload() {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${projectJobId || 'HANDOVER'}_Client_Delivery.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      closeModal();
    }
  }

  function closeModal() {
    open = false;
    onClose?.();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="handover-backdrop" onclick={closeModal} role="dialog" aria-modal="true" aria-label="Client Handover Package" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="handover-modal" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <div class="handover-header">
        <div class="header-left">
          <div class="header-icon-box">
            <FluentIcons name="download" size={20} color="var(--kanso-accent, #38BDF8)" />
          </div>
          <div>
            <div class="header-badges">
              <span class="badge badge-job">{projectJobId}</span>
              <span class="badge badge-brand">{projectBrand}</span>
              <span class="badge badge-tag">OFFICIAL HANDOVER</span>
            </div>
            <h2 class="modal-title">Client Handover Package Builder</h2>
            <p class="modal-sub">Generate release ZIP with cryptographic SHA-256 manifest &amp; wire colophon.</p>
          </div>
        </div>
        <button class="close-btn" onclick={closeModal} aria-label="Close dialog">
          <FluentIcons name="close" size={16} />
        </button>
      </div>

      <!-- Body -->
      <div class="handover-body">
        <!-- Telemetry Bento -->
        <div class="telemetry-bento">
          <div class="bento-cell">
            <span class="bento-label">SELECTED ASSETS</span>
            <div class="bento-value">
              {selectedDeliverables.length} <span class="bento-sub">/ {availableDeliverables.length} files</span>
            </div>
          </div>
          <div class="bento-cell">
            <span class="bento-label">ESTIMATED ARCHIVE SIZE</span>
            <div class="bento-value">
              {formatBytes(selectedSizeBytes)}
            </div>
          </div>
          <div class="bento-cell">
            <span class="bento-label">DATA INTEGRITY</span>
            <div class="bento-value text-sky">
              SHA-256 <span class="bento-sub">Cryptographic Checksums</span>
            </div>
          </div>
          <div class="bento-cell">
            <span class="bento-label">FORMAT STANDARDS</span>
            <div class="bento-value text-green">
              Plain UTF-8 <span class="bento-sub">Markdown + HTML</span>
            </div>
          </div>
        </div>

        <!-- Section 1: Deliverables Selection -->
        <div class="section-container">
          <div class="section-header">
            <div class="section-title-group">
              <h3 class="section-title">1. Deliverable Output Files (05_DELIVERABLES/)</h3>
              <span class="section-hint">Select files to include in final press &amp; digital package</span>
            </div>
            <button class="action-link-btn" onclick={toggleSelectAll}>
              {availableDeliverables.every(d => selectedFileNames[d.filename || d.id]) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {#if availableDeliverables.length === 0}
            <div class="empty-files-box">
              <p>No deliverables registered for this project in <code>05_DELIVERABLES/</code>.</p>
            </div>
          {:else}
            <div class="deliverables-checklist">
              {#each availableDeliverables as d (d.filename || d.id)}
                {@const isChecked = !!selectedFileNames[d.filename || d.id]}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="file-row {isChecked ? 'checked' : ''}" 
                  onclick={() => toggleFile(d.filename || d.id)}
                >
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    class="file-checkbox"
                    onclick={(e) => e.stopPropagation()}
                    onchange={() => toggleFile(d.filename || d.id)}
                    aria-label="Select {d.filename}"
                  />
                  <div class="file-type-icon">
                    {#if d.isVideo || d.previewType === 'video'}
                      <FluentIcons name="video" size={14} color="#A78BFA" />
                    {:else if d.isPdf || d.previewType === 'pdf'}
                      <FluentIcons name="document" size={14} color="#EF4444" />
                    {:else if d.isImage || d.previewType === 'image'}
                      <FluentIcons name="image" size={14} color="#38BDF8" />
                    {:else}
                      <FluentIcons name="document" size={14} color="#94A3B8" />
                    {/if}
                  </div>
                  <div class="file-info">
                    <span class="file-name" title={d.filename}>{d.filename}</span>
                    <span class="file-meta">
                      {(d.ext || d.format || 'FILE').toUpperCase().replace('.', '')} · {d.sizeFormatted || formatBytes(d.sizeBytes || 0)}
                    </span>
                  </div>
                  <span class="status-pill status-{(d.status || 'pending')}">
                    {(d.status || 'pending').toUpperCase()}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Section 2: Vault Dossier Inclusions -->
        <div class="section-container">
          <div class="section-header">
            <div class="section-title-group">
              <h3 class="section-title">2. Vault Inclusions &amp; Verification Manifest</h3>
              <span class="section-hint">Standardized client handover documentation</span>
            </div>
          </div>

          <div class="inclusions-grid">
            <!-- DELIVERY.md Manifest -->
            <label class="inclusion-card {includeManifest ? 'active' : ''}">
              <div class="inc-check-col">
                <input type="checkbox" bind:checked={includeManifest} />
              </div>
              <div class="inc-text-col">
                <div class="inc-title">
                  <span>DELIVERY.md &amp; HTML Colophon</span>
                  <span class="badge badge-rec">RECOMMENDED</span>
                </div>
                <p class="inc-desc">Automated Markdown manifest with SHA-256 asset checksums, client dossier, and wire remittance instructions.</p>
              </div>
            </label>

            <!-- Project Brief -->
            <label class="inclusion-card {includeBrief ? 'active' : ''}">
              <div class="inc-check-col">
                <input type="checkbox" bind:checked={includeBrief} />
              </div>
              <div class="inc-text-col">
                <div class="inc-title">
                  <span>Project Brief (README.md)</span>
                </div>
                <p class="inc-desc">Includes scope definition, creative requirements, and deliverable targets from <code>01_BRIEF/</code>.</p>
              </div>
            </label>

            <!-- Copywriting -->
            <label class="inclusion-card {includeCopy ? 'active' : ''}">
              <div class="inc-check-col">
                <input type="checkbox" bind:checked={includeCopy} />
              </div>
              <div class="inc-text-col">
                <div class="inc-title">
                  <span>Approved Copywriting (COPY.md)</span>
                </div>
                <p class="inc-desc">Includes approved headlines, taglines, legal fine print, and localized translations from <code>03_COPYWRITING/</code>.</p>
              </div>
            </label>

            <!-- WIP / Production Sources -->
            <label class="inclusion-card {includeWip ? 'active' : ''}">
              <div class="inc-check-col">
                <input type="checkbox" bind:checked={includeWip} />
              </div>
              <div class="inc-text-col">
                <div class="inc-title">
                  <span>Raw Production Sources (04_PRODUCTION/)</span>
                  <span class="badge badge-warn">LARGE SIZE</span>
                </div>
                <p class="inc-desc">Includes editable vector layouts, layered sketches, and work-in-progress staging assets.</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Section 3: Studio Remittance Preview -->
        {#if studioProfile?.remittance?.bank_name || studioProfile?.remittance?.account_no}
          <div class="remittance-preview">
            <div class="remit-header">
              <span class="remit-title">Wire Remittance Stamped in Manifest Colophon</span>
              <span class="remit-source">_Team/_Config/studio_profile.json</span>
            </div>
            <div class="remit-grid">
              <div class="remit-item">
                <span class="remit-label">Bank:</span>
                <b>{studioProfile.remittance.bank_name || 'Maybank'}</b>
              </div>
              <div class="remit-item">
                <span class="remit-label">Account No:</span>
                <code class="remit-code">{studioProfile.remittance.account_no || '—'}</code>
              </div>
              {#if studioProfile.remittance.duitnow_id}
                <div class="remit-item">
                  <span class="remit-label">DuitNow ID:</span>
                  <code class="remit-code">{studioProfile.remittance.duitnow_id}</code>
                </div>
              {/if}
              {#if studioProfile.remittance.swift_code}
                <div class="remit-item">
                  <span class="remit-label">SWIFT / BIC:</span>
                  <code class="remit-code">{studioProfile.remittance.swift_code}</code>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Action Bar -->
      <div class="handover-footer">
        <div class="footer-left">
          <button 
            class="copy-link-btn" 
            onclick={copyDownloadLink} 
            disabled={!downloadUrl || selectedDeliverables.length === 0}
            title="Copy direct API download link for client sharing"
          >
            <FluentIcons name={linkCopied ? 'checkCircle' : 'copy'} size={14} color={linkCopied ? '#10B981' : 'currentColor'} />
            <span>{linkCopied ? 'Link Copied!' : 'Copy Direct Link'}</span>
          </button>
        </div>

        <div class="footer-right">
          <FluentButton appearance="subtle" onclick={closeModal}>Cancel</FluentButton>
          <button 
            class="download-package-btn" 
            onclick={triggerDownload} 
            disabled={!downloadUrl || selectedDeliverables.length === 0}
          >
            <FluentIcons name="download" size={15} />
            <span>Download Handover ZIP ({formatBytes(selectedSizeBytes)})</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .handover-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1980;
    padding: 20px;
    animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .handover-modal {
    width: 95%;
    max-width: 760px;
    max-height: 90vh;
    background: var(--kanso-canvas, #09090B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  }

  .handover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid var(--kanso-border, #27272A);
    background: var(--kanso-surface, #18181B);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .header-icon-box {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .header-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .badge-job {
    background: rgba(255, 255, 255, 0.1);
    color: var(--kanso-text-primary, #F4F4F5);
    font-family: monospace;
  }

  .badge-brand {
    background: rgba(56, 189, 248, 0.15);
    color: var(--kanso-accent, #38BDF8);
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .badge-tag {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .badge-rec {
    background: rgba(56, 189, 248, 0.15);
    color: var(--kanso-accent, #38BDF8);
    font-size: 9px;
  }

  .badge-warn {
    background: rgba(245, 158, 11, 0.15);
    color: #F59E0B;
    font-size: 9px;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }

  .modal-sub {
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
    margin: 2px 0 0 0;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--kanso-text-muted, #71717A);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: var(--kanso-text-primary, #F4F4F5);
    background: var(--kanso-surface-hover, #27272A);
  }

  .handover-body {
    padding: 20px 22px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Telemetry Bento */
  .telemetry-bento {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .bento-cell {
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bento-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--kanso-text-muted, #71717A);
    letter-spacing: 0.5px;
  }

  .bento-value {
    font-size: 15px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
  }

  .bento-sub {
    font-size: 11px;
    font-weight: 500;
    color: var(--kanso-text-muted, #71717A);
    display: block;
  }

  .text-sky { color: var(--kanso-accent, #38BDF8); }
  .text-green { color: #10B981; }

  /* Sections */
  .section-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    margin: 0;
  }

  .section-hint {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
    display: block;
    margin-top: 1px;
  }

  .action-link-btn {
    background: transparent;
    border: none;
    color: var(--kanso-accent, #38BDF8);
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .action-link-btn:hover {
    background: rgba(56, 189, 248, 0.1);
  }

  .empty-files-box {
    padding: 20px;
    text-align: center;
    background: var(--kanso-surface, #18181B);
    border: 1px dashed var(--kanso-border, #27272A);
    border-radius: 8px;
    font-size: 12px;
    color: var(--kanso-text-muted, #71717A);
  }

  /* Checklist */
  .deliverables-checklist {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    background: var(--kanso-surface, #18181B);
    padding: 6px;
  }

  .file-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.12s;
    user-select: none;
  }

  .file-row:hover {
    background: var(--kanso-surface-hover, #27272A);
  }

  .file-row.checked {
    background: rgba(56, 189, 248, 0.05);
  }

  .file-checkbox {
    accent-color: var(--kanso-accent, #38BDF8);
    cursor: pointer;
    width: 15px;
    height: 15px;
  }

  .file-type-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .file-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-primary, #F4F4F5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-meta {
    font-size: 10.5px;
    color: var(--kanso-text-muted, #71717A);
  }

  .status-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.4px;
  }

  .status-approved {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
  }

  .status-pending {
    background: rgba(245, 158, 11, 0.15);
    color: #F59E0B;
  }

  .status-revision,
  .status-rejected {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
  }

  /* Inclusions Grid */
  .inclusions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .inclusion-card {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    background: var(--kanso-surface, #18181B);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .inclusion-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .inclusion-card.active {
    border-color: rgba(56, 189, 248, 0.4);
    background: rgba(56, 189, 248, 0.04);
  }

  .inc-check-col input {
    accent-color: var(--kanso-accent, #38BDF8);
    cursor: pointer;
    margin-top: 3px;
  }

  .inc-text-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .inc-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .inc-desc {
    font-size: 11px;
    color: var(--kanso-text-muted, #71717A);
    margin: 0;
    line-height: 1.4;
  }

  /* Remittance Preview */
  .remittance-preview {
    background: rgba(24, 24, 27, 0.6);
    border: 1px solid var(--kanso-border, #27272A);
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .remit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .remit-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--kanso-text-primary, #F4F4F5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .remit-source {
    font-size: 10px;
    color: var(--kanso-text-muted, #71717A);
    font-family: monospace;
  }

  .remit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
    font-size: 11.5px;
  }

  .remit-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .remit-label {
    font-size: 10px;
    color: var(--kanso-text-muted, #71717A);
  }

  .remit-code {
    font-family: monospace;
    color: var(--kanso-accent, #38BDF8);
    font-size: 11px;
  }

  /* Footer */
  .handover-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 22px;
    border-top: 1px solid var(--kanso-border, #27272A);
    background: var(--kanso-surface, #18181B);
  }

  .copy-link-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid var(--kanso-border, #27272A);
    color: var(--kanso-text-primary, #F4F4F5);
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .copy-link-btn:hover:not(:disabled) {
    background: var(--kanso-surface-hover, #27272A);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .copy-link-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .download-package-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--kanso-accent, #38BDF8);
    color: #09090B;
    border: none;
    padding: 8px 18px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    box-shadow: 0 2px 10px rgba(56, 189, 248, 0.3);
  }

  .download-package-btn:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);
  }

  .download-package-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }
</style>
