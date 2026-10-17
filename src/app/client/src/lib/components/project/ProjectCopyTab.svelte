<script lang="ts">
  import CopyStudioView from '$lib/views/CopyStudioView.svelte';
  import type { Project } from '$lib/types';

  interface Props {
    project: Project;
  }

  let { project }: Props = $props();
</script>

<div class="copy-tab-container">
  <CopyStudioView
    embedded={true}
    projectContext={{
      id: project.id,
      title: project.title,
      client: project.client || 'Client',
      briefContent: project.description || ''
    }}
  />
</div>

<style>
  .copy-tab-container {
    height: 100%;
    min-height: 500px;
  }
</style>
