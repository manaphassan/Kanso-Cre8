<script lang="ts">
  import MarkdownEditor from '$lib/components/markdown/MarkdownEditor.svelte';

  interface Props {
    briefContent: string;
    onSave: (content: string) => Promise<void>;
  }

  let { briefContent, onSave }: Props = $props();
</script>

<div class="brief-tab-container">
  <MarkdownEditor
    value={briefContent}
    onSave={onSave}
    placeholder="# Campaign Project Brief&#10;&#10;Specify deliverables, art direction, and key deliverables..."
  />
</div>

<style>
  .brief-tab-container {
    height: 100%;
    min-height: 500px;
    display: flex;
    flex-direction: column;
  }
</style>
