<script lang="ts">
  /**
   * FluentIcons.svelte - Canonical Microsoft Fluent 2 SVG Icon System
   * Standardizes crisp iconography across all pages, buttons, and modals.
   */
  export type IconName =
    | 'save'
    | 'edit'
    | 'delete'
    | 'trash'
    | 'add'
    | 'plus'
    | 'search'
    | 'filter'
    | 'folder'
    | 'folderOpen'
    | 'file'
    | 'image'
    | 'video'
    | 'pdf'
    | 'vector'
    | 'calendar'
    | 'kanban'
    | 'gantt'
    | 'table'
    | 'grid'
    | 'user'
    | 'users'
    | 'lock'
    | 'sparkle'
    | 'sparkles'
    | 'history'
    | 'timeline'
    | 'printer'
    | 'bolt'
    | 'webhook'
    | 'share'
    | 'link'
    | 'download'
    | 'upload'
    | 'zoomIn'
    | 'zoomOut'
    | 'fit'
    | 'comment'
    | 'comments'
    | 'checkmark'
    | 'checkCircle'
    | 'warning'
    | 'info'
    | 'chevronDown'
    | 'chevronRight'
    | 'arrowRight'
    | 'arrowLeft'
    | 'close'
    | 'refresh'
    | 'copy'
    | 'bell'
    | 'settings'
    | 'rocket'
    | 'target'
    | 'tag'
    | 'clock'
    | 'eye'
    | 'eyeOff'
    | 'dashboard'
    | 'signout'
    | 'camera'
    | 'colorPalette'
    | 'box'
    | 'pin'
    | 'externalLink'
    | 'code'
    | 'diff';

  interface Props {
    name: IconName;
    size?: number | string;
    color?: string;
    class?: string;
    style?: string;
  }

  let {
    name,
    size = 16,
    color = 'currentColor',
    class: className = '',
    style = ''
  }: Props = $props();

  const iconSize = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<span 
  class="fluent-icon-wrapper {className}" 
  style="display: inline-flex; align-items: center; justify-content: center; width: {iconSize}; height: {iconSize}; min-width: {iconSize}; min-height: {iconSize}; color: {color}; {style}"
  aria-hidden="true"
>
  {#if name === 'save'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M14.5 2H5.5A2.5 2.5 0 0 0 3 4.5v11A2.5 2.5 0 0 0 5.5 18h9a2.5 2.5 0 0 0 2.5-2.5v-9L14.5 2zm-8 1h7v4h-7V3zm9.5 12.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15.5V4.5A1.5 1.5 0 0 1 5.5 3H6v4.5A.5.5 0 0 0 6.5 8h7a.5.5 0 0 0 .5-.5V3.21l2 2v10.29zM13 15H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1zm-6-4v3h6v-3H7z"/>
    </svg>
  {:else if name === 'edit'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M12.85 2.15a2.62 2.62 0 0 1 3.7 3.7l-9.8 9.8a1.5 1.5 0 0 1-.65.38l-3.5 1a.5.5 0 0 1-.62-.62l1-3.5a1.5 1.5 0 0 1 .38-.65l9.49-9.51zm3 7.42l-9.5 9.5a.5.5 0 0 0-.13.22l-.74 2.6 2.6-.74a.5.5 0 0 0 .22-.13l9.5-9.5-1.95-1.95zm.7-1.42a1.62 1.62 0 0 0-2.29-2.3L13.55 6.6l2.3 2.3.7-1.45z"/>
    </svg>
  {:else if name === 'delete' || name === 'trash'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M8.5 4h3a.5.5 0 0 0 .5-.5V3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v.5a.5.5 0 0 0 .5.5zM4 5.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1H15v10.5a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 5 16.5V6H4.5a.5.5 0 0 1-.5-.5zM6 6v10.5a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5V6H6zm2.5 2.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V9a.5.5 0 0 1 .5-.5zm3 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V9a.5.5 0 0 1 .5-.5z"/>
    </svg>
  {:else if name === 'add' || name === 'plus'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 3a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H3.75a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 10 3z"/>
    </svg>
  {:else if name === 'search'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l4.15 4.15a.75.75 0 1 1-1.06 1.06l-4.15-4.15A5.5 5.5 0 1 1 8.5 3zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
    </svg>
  {:else if name === 'filter'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M2.5 4a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 .53 1.28L12 9.77V15.5a.75.75 0 0 1-1.15.64l-2-1.33A.75.75 0 0 1 8.5 14.2V9.77L2.72 4.53A.75.75 0 0 1 2.5 4zm2.06.75L9 9.25a.75.75 0 0 1 .25.55v4l1 .67V9.8a.75.75 0 0 1 .25-.55l4.44-4.5H4.56z"/>
    </svg>
  {:else if name === 'folder' || name === 'folderOpen'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M2.5 4A1.5 1.5 0 0 0 1 5.5v9A1.5 1.5 0 0 0 2.5 16h15a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 17.5 6H10.6l-1.8-1.8A1.5 1.5 0 0 0 7.74 3.75H2.5A1.5 1.5 0 0 0 1 5.25v.25zm0 1h5.24c.2 0 .39.08.53.22l2.03 2.03h7.2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5z"/>
    </svg>
  {:else if name === 'file'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2h5.09a2.5 2.5 0 0 1 1.76.73l2.92 2.92c.47.47.73 1.1.73 1.77V15.5a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 4 15.5v-11zm2.5-1.5A1.5 1.5 0 0 0 5 4.5v11A1.5 1.5 0 0 0 6.5 17h8a1.5 1.5 0 0 0 1.5-1.5V7.41a1.5 1.5 0 0 0-.44-1.06L12.65 3.44A1.5 1.5 0 0 0 11.59 3H6.5z"/>
    </svg>
  {:else if name === 'image'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M3.5 3A2.5 2.5 0 0 0 1 5.5v9A2.5 2.5 0 0 0 3.5 17h13a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 16.5 3h-13zm0 1h13A1.5 1.5 0 0 1 18 5.5V12l-3.15-3.15a1.5 1.5 0 0 0-2.12 0l-5.23 5.23-1.65-1.65a1.5 1.5 0 0 0-2.12 0L2 14.15V5.5A1.5 1.5 0 0 1 3.5 4zm4.25 2.5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5z"/>
    </svg>
  {:else if name === 'video'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M3.5 4A2.5 2.5 0 0 0 1 6.5v7A2.5 2.5 0 0 0 3.5 16h8a2.5 2.5 0 0 0 2.5-2.5v-1.12l3.15 1.89A1 1 0 0 0 19 13.4V6.6a1 1 0 0 0-1.85-.87L14 7.62V6.5A2.5 2.5 0 0 0 11.5 4h-8zm0 1h8A1.5 1.5 0 0 1 13 6.5v7a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 13.5v-7A1.5 1.5 0 0 1 3.5 5zm10.5 4.12l3.5-2.1v5.96l-3.5-2.1V9.12z"/>
    </svg>
  {:else if name === 'pdf'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L13.5 3H4zm0 1h8.5L17 8.5V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 5a.5.5 0 0 0 0 1h8a.5.5 0 0 0 0-1H6zm0 3a.5.5 0 0 0 0 1h8a.5.5 0 0 0 0-1H6z"/>
    </svg>
  {:else if name === 'vector'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M3 3h4v4H3V3zm1 1v2h2V4H4zm9-1h4v4h-4V3zm1 1v2h2V4h-2zM3 13h4v4H3v-4zm1 1v2h2v-2H4zm9-1h4v4h-4v-4zm1 1v2h2v-2h-2zM7 4.5h6v1H7v-1zm0 10h6v1H7v-1zm-2.5-7v5h-1v-5h1zm11 0v5h-1v-5h1z"/>
    </svg>
  {:else if name === 'calendar'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M6 2a.75.75 0 0 1 .75.75V4h6.5v-1.25a.75.75 0 0 1 1.5 0V4h1.75A2.5 2.5 0 0 1 19 6.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 1 15.5v-9A2.5 2.5 0 0 1 3.5 4H5.25V2.75A.75.75 0 0 1 6 2zm10.5 3.5h-13a1.5 1.5 0 0 0-1.5 1.5V8h16V7a1.5 1.5 0 0 0-1.5-1.5zM2 9.5v6A1.5 1.5 0 0 0 3.5 17h13a1.5 1.5 0 0 0 1.5-1.5v-6H2z"/>
    </svg>
  {:else if name === 'kanban'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v11A1.5 1.5 0 0 0 2.5 17h3A1.5 1.5 0 0 0 7 15.5v-11A1.5 1.5 0 0 0 5.5 3h-3zm0 1h3a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5zm6-1A1.5 1.5 0 0 0 7 4.5v7A1.5 1.5 0 0 0 8.5 13h3a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 11.5 3h-3zm0 1h3a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5zm6-1A1.5 1.5 0 0 0 13 4.5v11a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 17.5 3h-3zm0 1h3a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5z"/>
    </svg>
  {:else if name === 'gantt'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M3 3a1 1 0 0 0-1 1v12a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1zm3 2h7a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm3 4h7a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1zm-3 4h9a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z"/>
    </svg>
  {:else if name === 'table'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v11A1.5 1.5 0 0 0 2.5 17h15a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 17.5 3h-15zm0 1h15a.5.5 0 0 1 .5.5V7H2V4.5a.5.5 0 0 1 .5-.5zM2 8h7v3H2V8zm8 0h8v3h-8V8zm0 4h8v3.5a.5.5 0 0 1-.5.5H10v-4zm-1 4H2.5a.5.5 0 0 1-.5-.5V12h7v4z"/>
    </svg>
  {:else if name === 'grid'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M3.5 3A1.5 1.5 0 0 0 2 4.5v3A1.5 1.5 0 0 0 3.5 9h3A1.5 1.5 0 0 0 8 7.5v-3A1.5 1.5 0 0 0 6.5 3h-3zm8 0A1.5 1.5 0 0 0 10 4.5v3A1.5 1.5 0 0 0 11.5 9h3A1.5 1.5 0 0 0 16 7.5v-3A1.5 1.5 0 0 0 14.5 3h-3zm-8 8A1.5 1.5 0 0 0 2 12.5v3A1.5 1.5 0 0 0 3.5 17h3a1.5 1.5 0 0 0 1.5-1.5v-3A1.5 1.5 0 0 0 6.5 11h-3zm8 0a1.5 1.5 0 0 0-1.5 1.5v3a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5v-3a1.5 1.5 0 0 0-1.5-1.5h-3z"/>
    </svg>
  {:else if name === 'user'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-2.5 4a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm-3 8a3.5 3.5 0 0 1 3.5-3.5h4a3.5 3.5 0 0 1 3.5 3.5v1.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V14zm1-1.5A2.5 2.5 0 0 1 8 10h4a2.5 2.5 0 0 1 2.5 2.5V14h-9v-1.5z"/>
    </svg>
  {:else if name === 'users'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M7 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM4.5 5.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm8.5-2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-11 9a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2zm12.5-2.5A2.5 2.5 0 0 1 17 12v2.5h1.5a1 1 0 0 0 1-1V12a3 3 0 0 0-3-3h-.5v1.5h.5z"/>
    </svg>
  {:else if name === 'lock'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M5.5 7V5.5A4.5 4.5 0 0 1 10 1a4.5 4.5 0 0 1 4.5 4.5V7h1A1.5 1.5 0 0 1 17 8.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-8A1.5 1.5 0 0 1 4.5 7h1zm1.5-1.5A3 3 0 0 1 10 2.5a3 3 0 0 1 3 3V7H7V5.5zM4.5 8.5V16.5h11V8.5h-11zm5.5 3a1.25 1.25 0 0 1 .75 2.25v1.5a.75.75 0 0 1-1.5 0v-1.5A1.25 1.25 0 0 1 10 11.5z"/>
    </svg>
  {:else if name === 'sparkle' || name === 'sparkles'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2.5a.75.75 0 0 1 .71.5l1.37 3.92 3.92 1.37a.75.75 0 0 1 0 1.42l-3.92 1.37-1.37 3.92a.75.75 0 0 1-1.42 0l-1.37-3.92-3.92-1.37a.75.75 0 0 1 0-1.42l3.92-1.37 1.37-3.92a.75.75 0 0 1 .71-.5zm5.5 9.75a.5.5 0 0 1 .47.33l.7 2.02 2.02.7a.5.5 0 0 1 0 .94l-2.02.7-.7 2.02a.5.5 0 0 1-.94 0l-.7-2.02-2.02-.7a.5.5 0 0 1 0-.94l2.02-.7.7-2.02a.5.5 0 0 1 .47-.33z"/>
    </svg>
  {:else if name === 'history' || name === 'timeline'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2a8 8 0 1 0 7.4 4.93.75.75 0 0 0-1.38-.59A6.5 6.5 0 1 1 10 3.5c1.47 0 2.82.5 3.9 1.34l-1.4 1.41a.5.5 0 0 0 .35.85H17a.5.5 0 0 0 .5-.5V2.4a.5.5 0 0 0-.85-.35l-1.4 1.4A7.96 7.96 0 0 0 10 2zm.75 4.25a.75.75 0 0 0-1.5 0v4.5c0 .2.08.39.22.53l3 3a.75.75 0 0 0 1.06-1.06L10.75 10.44V6.25z"/>
    </svg>
  {:else if name === 'printer'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M5.5 2A1.5 1.5 0 0 0 4 3.5V6H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1v1.5A1.5 1.5 0 0 0 5.5 19h9a1.5 1.5 0 0 0 1.5-1.5V16h1a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1V3.5A1.5 1.5 0 0 0 14.5 2h-9zm0 1h9a.5.5 0 0 1 .5.5V6H5V3.5a.5.5 0 0 1 .5-.5zM3 7h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v-2.5A1.5 1.5 0 0 0 14.5 11h-9A1.5 1.5 0 0 0 4 12.5V15H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm2 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-5z"/>
    </svg>
  {:else if name === 'bolt'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10.9 1.15a.75.75 0 0 1 .73.88l-1.3 5.47h4.92a.75.75 0 0 1 .59 1.21l-7.5 9.5a.75.75 0 0 1-1.33-.74l1.8-6.47H3.75a.75.75 0 0 1-.6-1.2l7.15-8.5a.75.75 0 0 1 .6-.15z"/>
    </svg>
  {:else if name === 'webhook'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2a3 3 0 0 0-2.83 2H5a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h2.17A3 3 0 0 0 10 14a3 3 0 0 0 2.83-2H15a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-2.17A3 3 0 0 0 10 2zm0 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM5 5.5h2.17a3.01 3.01 0 0 0 0 2H5A1.5 1.5 0 0 1 3.5 6 1.5 1.5 0 0 1 5 4.5zM15 5.5a1.5 1.5 0 0 1 1.5 1.5 1.5 1.5 0 0 1-1.5 1.5h-2.17a3.01 3.01 0 0 0 0-2H15zM10 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
    </svg>
  {:else if name === 'share'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M15 4a3 3 0 1 0-2.6 4.5l-5.3 2.65a3 3 0 0 0 0 1.7l5.3 2.65A3 3 0 1 0 15 14a3 3 0 0 0-.25-1.2l-5.3-2.65a3 3 0 0 0 0-.3l5.3-2.65A3 3 0 0 0 15 4zm0 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm10 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
    </svg>
  {:else if name === 'link'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M12.22 3.22a3.75 3.75 0 0 1 5.3 5.3l-2.5 2.5a3.75 3.75 0 0 1-5.3 0 .75.75 0 0 1 1.06-1.06 2.25 2.25 0 0 0 3.18 0l2.5-2.5a2.25 2.25 0 0 0-3.18-3.18l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5zm-4.44 4.44a.75.75 0 0 1 1.06 0 2.25 2.25 0 0 0 3.18 0l1.5-1.5a.75.75 0 0 1 1.06 1.06l-1.5 1.5a3.75 3.75 0 0 1-5.3 0 .75.75 0 0 1 0-1.06zm-4.56 4.56a3.75 3.75 0 0 1 5.3-5.3l1.5 1.5a.75.75 0 1 1-1.06 1.06l-1.5-1.5a2.25 2.25 0 0 0-3.18 3.18l2.5 2.5a2.25 2.25 0 0 0 3.18 0 .75.75 0 0 1 1.06 1.06 3.75 3.75 0 0 1-5.3 0l-2.5-2.5z"/>
    </svg>
  {:else if name === 'download'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2.5a.75.75 0 0 1 .75.75v8.19l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.25A.75.75 0 0 1 10 2.5zM3.75 14.5a.75.75 0 0 1 .75.75v1.25c0 .41.34.75.75.75h9.5c.41 0 .75-.34.75-.75v-1.25a.75.75 0 0 1 1.5 0v1.25A2.25 2.25 0 0 1 14.75 18H5.25A2.25 2.25 0 0 1 3 15.75v-1.25a.75.75 0 0 1 .75-.75z"/>
    </svg>
  {:else if name === 'upload'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 14.5a.75.75 0 0 1-.75-.75V5.56L6.53 8.28a.75.75 0 0 1-1.06-1.06l4-4a.75.75 0 0 1 1.06 0l4 4a.75.75 0 1 1-1.06 1.06L10.75 5.56v8.19a.75.75 0 0 1-.75.75zM3.75 14.5a.75.75 0 0 1 .75.75v1.25c0 .41.34.75.75.75h9.5c.41 0 .75-.34.75-.75v-1.25a.75.75 0 0 1 1.5 0v1.25A2.25 2.25 0 0 1 14.75 18H5.25A2.25 2.25 0 0 1 3 15.75v-1.25a.75.75 0 0 1 .75-.75z"/>
    </svg>
  {:else if name === 'comment' || name === 'comments'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M3.5 3A2.5 2.5 0 0 0 1 5.5v7A2.5 2.5 0 0 0 3.5 15H6v2.25c0 .62.7.99 1.2.6l3.56-2.85H16.5A2.5 2.5 0 0 0 19 12.5v-7A2.5 2.5 0 0 0 16.5 3h-13zm0 1h13A1.5 1.5 0 0 1 18 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-6a.75.75 0 0 0-.47.16L7 17.56V14.5a.75.75 0 0 0-.75-.75H3.5A1.5 1.5 0 0 1 2 12.5v-7A1.5 1.5 0 0 1 3.5 4z"/>
    </svg>
  {:else if name === 'checkmark'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M16.7 5.3a.75.75 0 0 1 0 1.06l-8.5 8.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L7.64 13.24l7.97-7.94a.75.75 0 0 1 1.06 0z"/>
    </svg>
  {:else if name === 'checkCircle'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm4.35 6.35l-5 5a.5.5 0 0 1-.7 0l-2.5-2.5a.5.5 0 0 1 .7-.7L8.5 12.3l4.65-4.65a.5.5 0 0 1 .7.7z"/>
    </svg>
  {:else if name === 'warning'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M9.13 2.87a1 1 0 0 1 1.74 0l7.5 13A1 1 0 0 1 17.5 17.5H2.5a1 1 0 0 1-.87-1.5l7.5-13zM10 7a.75.75 0 0 0-.75.75v4a.75.75 0 0 0 1.5 0v-4A.75.75 0 0 0 10 7zm0 7a.87.87 0 1 0 0-1.75.87.87 0 0 0 0 1.75z"/>
    </svg>
  {:else if name === 'info'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4.25a.87.87 0 1 1 0 1.75.87.87 0 0 1 0-1.75zM10 9a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4A.75.75 0 0 1 10 9z"/>
    </svg>
  {:else if name === 'close'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M4.28 4.28a.75.75 0 0 1 1.06 0L10 8.94l4.66-4.66a.75.75 0 1 1 1.06 1.06L11.06 10l4.66 4.66a.75.75 0 0 1-1.06 1.06L10 11.06l-4.66 4.66a.75.75 0 0 1-1.06-1.06L8.94 10 4.28 5.34a.75.75 0 0 1 0-1.06z"/>
    </svg>
  {:else if name === 'refresh'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 3a7 7 0 0 0-5.8 3.1l-1.5-1.5A.5.5 0 0 0 2 5v4.5a.5.5 0 0 0 .5.5H7a.5.5 0 0 0 .35-.85L5.8 7.6A5.5 5.5 0 1 1 4.5 10a.75.75 0 0 0-1.5 0A7 7 0 1 0 10 3z"/>
    </svg>
  {:else if name === 'bell'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2a4.5 4.5 0 0 0-4.5 4.5v3.38L4.2 12.3A1.5 1.5 0 0 0 5.25 15h9.5a1.5 1.5 0 0 0 1.05-2.7l-1.3-2.42V6.5A4.5 4.5 0 0 0 10 2zm-2.25 14a2.25 2.25 0 0 0 4.5 0h-4.5z"/>
    </svg>
  {:else if name === 'settings'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-1.5 3a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm8.3-1.6l-1.3-.75.1-1.5a1 1 0 0 0-.6-1.05l-1.74-.72a1 1 0 0 0-1.2.33l-.86 1.23-1.45-.48V3.9a1 1 0 0 0-.8-1H9.45a1 1 0 0 0-.8 1v1.56l-1.45.48-.86-1.23a1 1 0 0 0-1.2-.33l-1.74.72a1 1 0 0 0-.6 1.05l.1 1.5-1.3.75a1 1 0 0 0-.5 1.1l.46 1.83a1 1 0 0 0 .94.75h1.5l.5 1.44-1.23.86a1 1 0 0 0-.33 1.2l.72 1.74a1 1 0 0 0 1.05.6l1.5-.1.75 1.3a1 1 0 0 0 1.1.5l1.83-.46a1 1 0 0 0 .75-.94v-1.5l1.44-.5.86 1.23a1 1 0 0 0 1.2.33l1.74-.72a1 1 0 0 0 .6-1.05l-.1-1.5 1.3-.75a1 1 0 0 0 .5-1.1l-.46-1.83a1 1 0 0 0-.94-.75h-1.5l-.5-1.44 1.23-.86a1 1 0 0 0 .33-1.2l-.72-1.74a1 1 0 0 0-1.05-.6z"/>
    </svg>
  {:else if name === 'rocket'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M15.8 2.2a.75.75 0 0 0-.64-.17c-2.4.39-5.18 1.95-7.1 4.25A11.9 11.9 0 0 0 5.4 10.9L3.15 13.15a.75.75 0 0 0 .35 1.27l2.8.56-.56 2.8a.75.75 0 0 0 1.27.35l2.25-2.25a11.9 11.9 0 0 0 4.62-2.66c2.3-1.92 3.86-4.7 4.25-7.1a.75.75 0 0 0-.17-.64l-2.16-.68zm-3.55 4.3a1.5 1.5 0 1 1 2.12 2.12 1.5 1.5 0 0 1-2.12-2.12z"/>
    </svg>
  {:else if name === 'dashboard'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2a8 8 0 0 0-8 8v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4a8 8 0 0 0-8-8zm0 1.5a6.5 6.5 0 0 1 6.5 6.5H3.5A6.5 6.5 0 0 1 10 3.5zm-6.5 8h13V14a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-2.5zM10 6a1 1 0 0 1 1 1v2.5a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1z"/>
    </svg>
  {:else if name === 'signout'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h6a.75.75 0 0 1 0 1.5h-6a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h6a.75.75 0 0 1 0 1.5h-6A1.5 1.5 0 0 1 3 15.5v-11zm10.78 2.22a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H8.75a.75.75 0 0 1 0-1.5h6.75l-1.72-1.72a.75.75 0 0 1 0-1.06z"/>
    </svg>
  {:else if name === 'chevronDown'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06z"/>
    </svg>
  {:else if name === 'chevronRight' || name === 'arrowRight'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M7.22 14.78a.75.75 0 0 1 0-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0z"/>
    </svg>
  {:else if name === 'colorPalette' || name === 'camera'}
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <path d="M10 2a8 8 0 1 0 0 16 3 3 0 0 0 3-3c0-.6-.2-1.2-.6-1.6-.4-.4-.6-.9-.6-1.4 0-1.1.9-2 2-2h1.2A5 5 0 0 0 20 5a3 3 0 0 0-3-3H10zm-4 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 2a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM5.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
    </svg>
  {:else}
    <!-- Default generic bullet icon -->
    <svg viewBox="0 0 20 20" fill="currentColor" width="100%" height="100%">
      <circle cx="10" cy="10" r="4"/>
    </svg>
  {/if}
</span>
