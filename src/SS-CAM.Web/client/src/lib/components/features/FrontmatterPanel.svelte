<script lang="ts">
  import type { ProjectFrontmatter, ProjectStatus, ProjectPriority } from '$lib/types';
  import FluentInput from '$lib/components/ui/FluentInput.svelte';
  import FluentSelect from '$lib/components/ui/FluentSelect.svelte';
  import FluentButton from '$lib/components/ui/FluentButton.svelte';

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
    <FluentSelect
      label="Workflow Stage (status)"
      bind:value={frontmatter.status}
      options={statusOptions}
      disabled={readonly}
    />

    <FluentSelect
      label="Priority (priority)"
      bind:value={frontmatter.priority}
      options={priorityOptions}
      disabled={readonly}
    />

    <FluentInput
      label="Assigned Designer"
      bind:value={frontmatter.designer}
      placeholder="e.g. 0001D (Farhan)"
      disabled={readonly}
    />

    <FluentInput
      label="Target Deadline"
      type="date"
      bind:value={frontmatter.deadline}
      disabled={readonly}
    />

    <FluentInput
      label="Brand / Client"
      bind:value={frontmatter.brand}
      placeholder="e.g. SS, SSE, SSH"
      disabled={readonly}
    />

    <FluentInput
      label="Requesting Department"
      bind:value={frontmatter.department}
      placeholder="e.g. Marketing, Clinic, Brand"
      disabled={readonly}
    />
  </div>

  <!-- Tags Section -->
  <div class="tags-section">
    <label class="tag-label">Metadata Topic Tags</label>
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
      <FluentButton appearance="primary" loading={isSaving} onclick={handleSave}>
        Save Metadata to Synology NAS
      </FluentButton>
    </div>
  {/if}
</div>

<style>
  .frontmatter-panel {
    background: var(--surface-card);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-lg);
    padding: 20px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .panel-title {
    font-size: 15px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .panel-subtitle {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }

  .tags-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tag-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
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
    background: var(--surface-card-subtle);
    border: 1px solid var(--surface-card-border);
    border-radius: var(--radius-pill);
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .tag-del-btn {
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 10px;
  }
  .tag-del-btn:hover {
    color: var(--color-danger);
  }

  .tag-input-row input {
    background: var(--surface-card);
    border: 1px dashed var(--surface-card-border);
    border-radius: var(--radius-pill);
    padding: 3px 10px;
    font-size: 12px;
    color: var(--text-primary);
    outline: none;
  }
  .tag-input-row input:focus {
    border-color: var(--brand-accent);
  }

  .panel-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 10px;
    border-top: 1px solid var(--surface-card-border);
  }
</style>
