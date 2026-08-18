<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiClient } from '$lib/services/api';
  import { appState } from '$lib/stores/appState.svelte';
  import type { ActivityNotification } from '$lib/types';

  interface Props {
    open?: boolean;
    onclose?: () => void;
  }

  let { open = false, onclose }: Props = $props();

  let notifications = $state<ActivityNotification[]>([]);
  let isLoading = $state<boolean>(false);

  $effect(() => {
    if (open) {
      loadNotifications();
    }
  });

  async function loadNotifications() {
    isLoading = true;
    try {
      const res = await ApiClient.getNotifications(30);
      notifications = res.notifications || [];
      appState.notificationCount = notifications.filter(n => n.unread).length;
    } catch (err) {
      console.warn('[NotificationDrawer] loadNotifications failed:', err);
    } finally {
      isLoading = false;
    }
  }

  function handleNotificationClick(notif: ActivityNotification) {
    notif.unread = false;
    appState.notificationCount = Math.max(0, appState.notificationCount - 1);
    if (onclose) onclose();

    if (notif.route === 'project-detail' && notif.routeId) {
      appState.navigate('project-detail', { id: notif.routeId });
    } else if (notif.route) {
      appState.navigate(notif.route);
    }
  }

  function markAllRead() {
    notifications = notifications.map(n => ({ ...n, unread: false }));
    appState.notificationCount = 0;
    appState.addToast('All notifications marked as read', 'info');
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'mention': return '💬';
      case 'comment': return '💭';
      case 'revision': return '🔴';
      case 'approval': return '🟢';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="drawer-backdrop" onclick={onclose}></div>

  <aside class="notification-drawer" role="dialog" aria-label="Activity Notifications">
    <div class="drawer-header">
      <div class="header-left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
        <h3 class="drawer-title">Activity & Notifications</h3>
        {#if appState.notificationCount > 0}
          <span class="unread-pill">{appState.notificationCount} new</span>
        {/if}
      </div>

      <div class="header-right">
        {#if notifications.some(n => n.unread)}
          <button class="text-btn" onclick={markAllRead}>Mark all read</button>
        {/if}
        <button class="close-btn" onclick={onclose} aria-label="Close drawer">✕</button>
      </div>
    </div>

    <div class="drawer-body">
      {#if isLoading}
        <div class="loading-state">Syncing live activity feed…</div>
      {:else if notifications.length === 0}
        <div class="empty-state">
          <div class="empty-icon">✨</div>
          <p class="empty-title">All caught up</p>
          <p class="empty-desc">No new mentions, approval milestones, or revision alerts at this time.</p>
        </div>
      {:else}
        <div class="notif-list">
          {#each notifications as notif (notif.id)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="notif-card"
              class:is-unread={notif.unread}
              onclick={() => handleNotificationClick(notif)}
              onkeydown={(e) => e.key === 'Enter' && handleNotificationClick(notif)}
              role="button"
              tabindex="0"
            >
              <div class="notif-icon-col">
                <span class="type-icon">{getTypeIcon(notif.type)}</span>
                {#if notif.unread}
                  <span class="unread-dot"></span>
                {/if}
              </div>

              <div class="notif-content">
                <div class="notif-meta-row">
                  <span class="notif-title">{notif.title}</span>
                  <span class="notif-time">{formatTime(notif.timestamp)}</span>
                </div>
                <p class="notif-message">{notif.message}</p>
                {#if notif.actor}
                  <div class="notif-actor-row">
                    <span class="actor-tag">{notif.actor} ({notif.role})</span>
                    {#if notif.routeId}
                      <span class="target-tag">Job: {notif.routeId} ↗</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    z-index: 400;
  }

  .notification-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 380px;
    max-width: 90vw;
    background: var(--surface-card);
    border-left: 1px solid var(--surface-card-border);
    box-shadow: var(--shadow-xl);
    z-index: 450;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .drawer-header {
    height: 56px;
    padding: 0 16px;
    border-bottom: 1px solid var(--surface-card-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--surface-card);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .drawer-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .unread-pill {
    font-size: 10.5px;
    font-weight: 800;
    background: #EF4444;
    color: #FFFFFF;
    padding: 2px 7px;
    border-radius: 9999px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .text-btn {
    border: none;
    background: none;
    color: var(--text-brand, #043388);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    padding: 4px;
  }
  .text-btn:hover { text-decoration: underline; }

  .close-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid var(--surface-card-border);
    background: var(--bg-app);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.12s;
  }
  .close-btn:hover { color: var(--text-primary); border-color: var(--brand-accent); }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .loading-state, .empty-state {
    text-align: center;
    padding: 48px 16px;
    color: var(--text-secondary);
  }

  .empty-icon { font-size: 32px; margin-bottom: 8px; }
  .empty-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
  .empty-desc { font-size: 12px; color: var(--text-secondary); margin: 0; }

  .notif-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .notif-card {
    display: flex;
    gap: 12px;
    padding: 12px 14px;
    background: var(--surface-card-subtle, #F8FAFC);
    border: 1px solid var(--surface-card-border);
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.14s;
    position: relative;
  }
  .notif-card:hover {
    background: var(--surface-card);
    border-color: var(--brand-accent);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  .notif-card.is-unread {
    border-left: 3px solid var(--brand-accent, #21A1F7);
    background: var(--surface-card);
  }

  .notif-icon-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .type-icon { font-size: 16px; }

  .unread-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #EF4444;
  }

  .notif-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .notif-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
  }

  .notif-title {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .notif-time {
    font-size: 10.5px;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .notif-message {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.35;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .notif-actor-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2px;
  }

  .actor-tag {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--text-tertiary);
  }

  .target-tag {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-brand, #043388);
  }
</style>
