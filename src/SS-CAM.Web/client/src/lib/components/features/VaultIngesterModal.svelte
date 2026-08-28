<script lang="ts">
  import { appState } from '$lib/stores/appState.svelte';
  import { projectStore } from '$lib/stores/projectStore.svelte';
  import { ApiClient } from '$lib/services/api';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

  interface Props {
    open?: boolean;
    projectId?: string;
    projectTitle?: string;
    onClose?: () => void;
    onSuccess?: () => void;
  }

  let {
    open = $bindable(false),
    projectId = '',
    projectTitle = '',
    onClose,
    onSuccess
  }: Props = $props();

  interface StagedFile {
    id: string;
    file: File;
    name: string;
    size: number;
    targetFolder: '01_BRIEF_ASSETS' | '02_SOURCE_FILES' | '03_COPYWRITING' | '04_WORK_IN_PROGRESS' | '05_DELIVERABLES';
    status: 'pending' | 'uploading' | 'done' | 'error';
    errorMessage?: string;
  }

  let isDragging = $state(false);
  let stagedFiles = $state<StagedFile[]>([]);
  let isIngesting = $state(false);
  let uploadProgress = $state({ current: 0, total: 0 });
  let fileInputRef: HTMLInputElement | null = $state(null);

  const CANONICAL_FOLDERS = [
    { id: '01_BRIEF_ASSETS', label: '01_BRIEF_ASSETS (Briefs & Guidelines)', icon: '📋' },
    { id: '02_SOURCE_FILES', label: '02_SOURCE_FILES (PSD, AI, Raw Assets)', icon: '🎨' },
    { id: '03_COPYWRITING', label: '03_COPYWRITING (Scripts & Copy.md)', icon: '✍️' },
    { id: '04_WORK_IN_PROGRESS', label: '04_WORK_IN_PROGRESS (WIP Drafts)', icon: '🚧' },
    { id: '05_DELIVERABLES', label: '05_DELIVERABLES (Final Exports & Renders)', icon: '🚀' },
  ];

  function detectCanonicalFolder(filename: string): StagedFile['targetFolder'] {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const base = filename.toLowerCase();

    // 1. Master Source Files
    if (['ai', 'psd', 'prproj', 'aep', 'indd', 'blend', 'c4d', 'fig', 'sketch', 'cdr', 'svg', 'eps', 'raw', 'cr2', 'nef'].includes(ext)) {
      return '02_SOURCE_FILES';
    }

    // 2. Brief & Reference
    if (['docx', 'xlsx', 'pptx', 'txt'].includes(ext) || base.includes('brief') || base.includes('guideline') || base.includes('spec')) {
      return '01_BRIEF_ASSETS';
    }

    // 3. Copywriting
    if (ext === 'md') {
      return '03_COPYWRITING';
    }

    // 4. Deliverables & WIP
    if (['mp4', 'mov', 'avi', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf'].includes(ext)) {
      if (base.includes('wip') || base.includes('draft') || base.includes('progress') || base.includes('preview')) {
        return '04_WORK_IN_PROGRESS';
      }
      return '05_DELIVERABLES';
    }

    return '01_BRIEF_ASSETS';
  }

  function handleFilesAdded(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newStaged: StagedFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      file,
      name: file.name,
      size: file.size,
      targetFolder: detectCanonicalFolder(file.name),
      status: 'pending'
    }));

    stagedFiles = [...stagedFiles, ...newStaged];
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  }

  function removeStagedFile(id: string) {
    stagedFiles = stagedFiles.filter(f => f.id !== id);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  async function startBatchIngestion() {
    if (stagedFiles.length === 0 || !projectId) return;

    isIngesting = true;
    uploadProgress = { current: 0, total: stagedFiles.length };

    for (let i = 0; i < stagedFiles.length; i++) {
      const item = stagedFiles[i];
      item.status = 'uploading';
      try {
        const base64Data = await fileToBase64(item.file);
        await ApiClient.ingestFile(projectId, item.name, item.targetFolder, base64Data);
        item.status = 'done';
        uploadProgress.current = i + 1;
      } catch (err: any) {
        item.status = 'error';
        item.errorMessage = err.message;
      }
    }

    isIngesting = false;
    appState.addToast(`Vault Ingest Complete (${uploadProgress.current}/${uploadProgress.total} files stored)`, 'success');
    
    // Refresh project details and deliverable queue
    projectStore.loadProjects();
    if (projectId) {
      projectStore.loadProjectDetail(projectId);
    }
    projectStore.loadDeliverables();

    if (onSuccess) onSuccess();
    setTimeout(() => {
      closeModal();
    }, 800);
  }

  function closeModal() {
    open = false;
    stagedFiles = [];
    isIngesting = false;
    if (onClose) onClose();
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="ingester-backdrop" onclick={(e) => { if (e.target === e.currentTarget && !isIngesting) closeModal(); }}>
    <div class="ingester-modal">
      <!-- Modal Header -->
      <div class="ingester-header">
        <div class="header-left">
          <span class="ingest-icon">📥</span>
          <div>
            <h2 class="modal-title">Drag &amp; Drop Vault Ingester</h2>
            <p class="modal-sub">Auto-routes incoming creative assets into canonical folders on Synology NAS (<code>{projectId || 'Project'}</code>).</p>
          </div>
        </div>
        {#if !isIngesting}
          <button class="close-btn" onclick={closeModal}>✕</button>
        {/if}
      </div>

      <!-- Dropzone Area -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="dropzone-box {isDragging ? 'dragging' : ''}"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={() => fileInputRef?.click()}
      >
        <input 
          bind:this={fileInputRef} 
          type="file" 
          multiple 
          class="hidden-file-input" 
          onchange={(e) => handleFilesAdded((e.target as HTMLInputElement).files)} 
        />
        <div class="dropzone-content">
          <span class="drop-icon">🚀</span>
          <div class="drop-text">
            <b>Drag and drop files here</b> or <span class="browse-link">browse workstation</span>
          </div>
          <span class="drop-hint">Auto-sorts <code>.ai/.psd</code> to <b>02_SOURCE</b>, <code>.mp4/.png</code> to <b>05_DELIVERABLES</b>, and briefs to <b>01_BRIEF</b>.</span>
        </div>
      </div>

      <!-- Staged Files Table -->
      {#if stagedFiles.length > 0}
        <div class="staged-section">
          <div class="staged-header">
            <span>Staged Assets for Ingestion ({stagedFiles.length} files)</span>
            <button class="clear-all-btn" onclick={() => stagedFiles = []} disabled={isIngesting}>Clear All</button>
          </div>

          <div class="staged-list">
            {#each stagedFiles as item}
              <div class="staged-row status-{item.status}">
                <div class="file-info-col">
                  <span class="file-name">{item.name}</span>
                  <span class="file-size">{formatBytes(item.size)}</span>
                </div>

                <!-- Auto-routed Folder Selector -->
                <div class="folder-select-col">
                  <span class="arrow-indicator">➔</span>
                  <select 
                    class="folder-dropdown" 
                    bind:value={item.targetFolder}
                    disabled={isIngesting || item.status === 'done'}
                  >
                    {#each CANONICAL_FOLDERS as folder}
                      <option value={folder.id}>{folder.icon} {folder.label}</option>
                    {/each}
                  </select>
                </div>

                <!-- Status / Action -->
                <div class="status-col">
                  {#if item.status === 'pending'}
                    <button class="remove-btn" onclick={() => removeStagedFile(item.id)} disabled={isIngesting}>✕</button>
                  {:else if item.status === 'uploading'}
                    <span class="status-badge uploading">Syncing...</span>
                  {:else if item.status === 'done'}
                    <span class="status-badge done">✓ Stored</span>
                  {:else if item.status === 'error'}
                    <span class="status-badge error" title={item.errorMessage}>✕ Error</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Modal Footer -->
      <div class="ingester-footer">
        <div class="footer-info">
          {#if isIngesting}
            <span class="ingesting-counter">Uploading {uploadProgress.current} / {uploadProgress.total}...</span>
          {:else}
            <span class="canonical-tip">Canonical Synology Vault Protocol active.</span>
          {/if}
        </div>
        <div class="footer-actions">
          <FluentButton appearance="subtle" onclick={closeModal} disabled={isIngesting}>
            Cancel
          </FluentButton>
          <FluentButton 
            appearance="primary" 
            disabled={stagedFiles.length === 0 || isIngesting} 
            loading={isIngesting} 
            onclick={startBatchIngestion}
          >
            ⚡ Ingest &amp; Auto-Sort ({stagedFiles.length} files)
          </FluentButton>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .ingester-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1800;
    padding: 20px;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .ingester-modal {
    width: 95%;
    max-width: 780px;
    max-height: 85vh;
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
  }

  /* Header */
  .ingester-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(15, 23, 42, 0.95);
  }

  .header-left { display: flex; align-items: center; gap: 12px; }
  .ingest-icon { font-size: 24px; }
  .modal-title { font-size: 16px; font-weight: 800; color: #F8FAFC; }
  .modal-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }

  .close-btn {
    background: transparent;
    border: none;
    font-size: 16px;
    color: #94A3B8;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
  }
  .close-btn:hover { color: #FFFFFF; background: rgba(255, 255, 255, 0.1); }

  /* Dropzone */
  .dropzone-box {
    margin: 16px 20px;
    padding: 28px 20px;
    border: 2px dashed rgba(33, 161, 247, 0.4);
    border-radius: 12px;
    background: rgba(33, 161, 247, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .dropzone-box:hover, .dropzone-box.dragging {
    border-color: #21A1F7;
    background: rgba(33, 161, 247, 0.1);
    transform: translateY(-1px);
  }

  .hidden-file-input { display: none; }
  .dropzone-content { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .drop-icon { font-size: 32px; }
  .drop-text { font-size: 13px; color: #F8FAFC; }
  .browse-link { color: #21A1F7; font-weight: 700; text-decoration: underline; }
  .drop-hint { font-size: 11px; color: #94A3B8; }
  .drop-hint code { background: rgba(255, 255, 255, 0.08); padding: 2px 4px; border-radius: 3px; color: #38BDF8; }

  /* Staged Section */
  .staged-section {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 280px;
  }

  .staged-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #94A3B8;
  }

  .clear-all-btn {
    background: none;
    border: none;
    color: #EF4444;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  .staged-list { display: flex; flex-direction: column; gap: 6px; }

  .staged-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    font-size: 12px;
  }

  .file-info-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    overflow: hidden;
  }

  .file-name { font-weight: 600; color: #F8FAFC; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-size { font-size: 10px; color: #94A3B8; font-family: monospace; }

  .folder-select-col { display: flex; align-items: center; gap: 8px; }
  .arrow-indicator { color: #21A1F7; font-weight: 800; }

  .folder-dropdown {
    background: #1E293B;
    color: #F8FAFC;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  .status-col { display: flex; align-items: center; justify-content: flex-end; min-width: 60px; }

  .remove-btn {
    background: transparent;
    border: none;
    color: #94A3B8;
    cursor: pointer;
    font-weight: 800;
    padding: 4px;
  }
  .remove-btn:hover { color: #EF4444; }

  .status-badge {
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .status-badge.uploading { background: rgba(33, 161, 247, 0.2); color: #38BDF8; }
  .status-badge.done { background: rgba(16, 185, 129, 0.2); color: #34D399; }
  .status-badge.error { background: rgba(239, 68, 68, 0.2); color: #F87171; }

  /* Footer */
  .ingester-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: rgba(11, 17, 33, 0.95);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .canonical-tip { font-size: 11px; color: #64748B; }
  .ingesting-counter { font-size: 12px; font-weight: 700; color: #21A1F7; }
  .footer-actions { display: flex; align-items: center; gap: 10px; }
</style>
