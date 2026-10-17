<script lang="ts">
  import type { ProjectFrontmatter, ProjectStatus, ProjectPriority } from '$lib/types';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  interface Props {
    frontmatter: ProjectFrontmatter;
    onSave?: (updated: ProjectFrontmatter) => Promise<void> | void;
    readonly?: boolean;
  }

  let { frontmatter = $bindable(), onSave, readonly = false }: Props = $props();

  let isSaving = $state<boolean>(false);
  let tagInput = $state<string>('');

  const statusOptions = [
    { value: 'backlog', label: 'Backlog' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Pending Review' },
    { value: 'revision', label: 'Revision Required' },
    { value: 'approved', label: 'Approved' },
    { value: 'done', label: 'Done / Completed' },
    { value: 'on-hold', label: 'On Hold' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  async function handleSave() {
    if (!onSave) return;
    isSaving = true;
    try {
      await onSave(frontmatter);
    } finally {
      isSaving = false;
    }
  }

  function addTag() {
    if (!tagInput.trim() || readonly) return;
    const currentTags = frontmatter.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      frontmatter.tags = [...currentTags, tagInput.trim()];
    }
    tagInput = '';
  }

  function removeTag(tagToRemove: string) {
    if (readonly) return;
    frontmatter.tags = (frontmatter.tags || []).filter(t => t !== tagToRemove);
  }
</script>

<div class="frontmatter-panel">
  <div class="panel-header">
    <div>
      <h3 class="panel-title">Project Frontmatter Metadata</h3>
      <p class="panel-subtitle">Synchronized directly with README.md YAML header on Synology NAS</p>
    </div>
  </div>

  <div class="fields-grid">
    <Select
      label="Workflow Stage (status)"
      bind:value={frontmatter.status}
      options={statusOptions}
      disabled={readonly}
    />

    <Select
      label="Priority (priority)"
      bind:value={frontmatter.priority}
      options={priorityOptions}
      disabled={readonly}
    />

    <Input
      label="Assigned Designer"
      bind:value={frontmatter.designer}
      placeholder="e.g. 0001D (Farhan)"
      disabled={readonly}
    />

    <Input
      label="Target Deadline"
      type="date"
      bind:value={frontmatter.deadline}
      disabled={readonly}
    />

    <Input
      label="Brand / Client"
      bind:value={frontmatter.brand}
      placeholder="e.g. SS, SSE, SSH"
      disabled={readonly}
    />

    <Input
      label="Requesting Department"
      bind:value={frontmatter.department}
      placeholder="e.g. Marketing, Clinic, Brand"
      disabled={readonly}
    />
  </div>

  <!-- Canva Cloud Bridge Section -->
  <div class="canva-section">
    <div class="canva-header">
      <div class="canva-title-group">
        <span class="canva-badge">CANVA</span>
        <span class="canva-label">Canva Creative Cloud Project Link</span>
      </div>
      {#if frontmatter.canva_url}
        <a href={frontmatter.canva_url} target="_blank" rel="noopener noreferrer" class="canva-open-btn">
          <span>Open in Canva</span>
          <svg class="external-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      {/if}
    </div>
    <Input
      bind:value={frontmatter.canva_url}
      placeholder="https://www.canva.com/design/..."
      disabled={readonly}
    />
  </div>

  <!-- Tags Section -->
  <div class="tags-section">
    <div class="tag-label">Metadata Topic Tags</div>
    <div class="tag-chips">
      {#each (frontmatter.tags || []) as tag}
        <span class="tag-chip">
          <span>{tag}</span>
          {#if !readonly}
            <button class="tag-del-btn" onclick={() => removeTag(tag)}>✕</button>
          {/if}
        </span>
      {/each}
      {#if !readonly}
        <div class="tag-input-row">
          <input
            type="text"
            placeholder="+ Add tag (Enter)"
            bind:value={tagInput}
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          />
        </div>
      {/if}
    </div>
  </div>

  {#if onSave && !readonly}
    <div class="panel-actions">
      <Button appearance="primary" loading={isSaving} onclick={handleSave}>
        Save Metadata to Synology NAS
      </Button>
    </div>
  {/if}
</div>

<style>
  .frontmatter-panel {
    background: var(--kanso-surface);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-lg);
    padding: 20px;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .panel-title {
    font-size: 15px;
    font-weight: 800;
    color: var(--kanso-text-primary);
  }

  .panel-subtitle {
    font-size: 12px;
    color: var(--kanso-text-secondary);
    margin-top: 2px;
  }

  .fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }

  .canva-section {
    background: rgba(0, 196, 204, 0.05);
    border: 1px solid rgba(0, 196, 204, 0.25);
    border-radius: var(--kanso-radius-md);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .canva-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .canva-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .canva-badge {
    background: var(--kanso-accent);
    color: white;
    font-size: 9px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }

  .canva-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-primary);
  }

  .canva-open-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--kanso-accent);
    background: rgba(0, 196, 204, 0.12);
    padding: 4px 8px;
    border-radius: 4px;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .canva-open-btn:hover {
    background: var(--kanso-accent);
    color: white;
  }

  .tags-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tag-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--kanso-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .tag-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .tag-chip {
    background: var(--kanso-surface-hover);
    border: 1px solid var(--kanso-border);
    border-radius: var(--kanso-radius-full);
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--kanso-text-primary);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .tag-del-btn {
    border: none;
    background: transparent;
    color: var(--kanso-text-muted);
    cursor: pointer;
    font-size: 10px;
  }
  .tag-del-btn:hover {
    color: var(--kanso-danger);
  }

  .tag-input-row input {
    background: var(--kanso-surface);
    border: 1px dashed var(--kanso-border);
    border-radius: var(--kanso-radius-full);
    padding: 3px 10px;
    font-size: 12px;
    color: var(--kanso-text-primary);
    outline: none;
  }
  .tag-input-row input:focus {
    border-color: var(--kanso-accent);
  }

  .panel-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 10px;
    border-top: 1px solid var(--kanso-border);
  }
</style>
