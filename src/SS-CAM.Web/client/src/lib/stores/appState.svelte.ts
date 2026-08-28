/**
 * Global App State Store using Svelte 5 Runes
 */
import type { User, ThemeName, ToastMessage } from '$lib/types';
import { ApiClient } from '$lib/services/api';

class AppStateStore {
  currentUser = $state<User | null>(null);
  currentRoute = $state<string>('dashboard');
  routeParams = $state<Record<string, any>>({});
  theme = $state<ThemeName>((localStorage.getItem('ss_cam_theme') as ThemeName) || 'falconia');
  sidebarExpanded = $state<boolean>(true);
  sidebarRail = $state<boolean>(false); // icon-only rail mode
  toasts = $state<ToastMessage[]>([]);
  isRescanning = $state<boolean>(false);
  globalSearch = $state<string>('');
  notificationCount = $state<number>(0);
  notificationDrawerOpen = $state<boolean>(false);
  userMenuOpen = $state<boolean>(false);
  contextDrawerOpen = $state<boolean>(false);
  sseStatus = $state<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  lastSyncedAt = $state<Date | null>(null);

  constructor() {
    this.applyTheme(this.theme);
  }

  setTheme(newTheme: ThemeName) {
    this.theme = newTheme;
    localStorage.setItem('ss_cam_theme', newTheme);
    this.applyTheme(newTheme);
  }

  applyTheme(themeName: ThemeName) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeName);
    }
  }

  toggleSidebar() {
    if (typeof window !== 'undefined' && window.innerWidth < 900) {
      this.sidebarExpanded = !this.sidebarExpanded;
    } else {
      this.sidebarExpanded = true;
      this.sidebarRail = !this.sidebarRail;
    }
  }

  expandSidebar() {
    this.sidebarExpanded = true;
    this.sidebarRail = false;
  }

  navigate(route: string, params: Record<string, any> = {}) {
    this.currentRoute = route;
    this.routeParams = params;
    window.location.hash = route + (params.id ? `/${encodeURIComponent(params.id)}` : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addToast(message: string, type: ToastMessage['type'] = 'info', title?: string, timeoutMs = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const toast: ToastMessage = { id, message, type, title, timeoutMs };
    this.toasts = [...this.toasts, toast];

    if (timeoutMs > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, timeoutMs);
    }
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions?.includes(permission) ?? false;
  }

  canApprove(): boolean {
    return this.hasPermission('review:sign_off') || this.currentUser?.role === 'admin' || this.currentUser?.role === 'manager';
  }

  async loadCurrentUser() {
    const token = ApiClient.getToken();
    if (!token) {
      this.currentUser = null;
      return;
    }
    try {
      const res = await ApiClient.getMe();
      this.currentUser = res.user;
      this.loadNotificationCount();
    } catch {
      this.currentUser = null;
    }
  }

  async loadNotificationCount() {
    try {
      const res = await ApiClient.getNotifications(20);
      if (res && typeof res.unreadCount === 'number') {
        this.notificationCount = res.unreadCount;
      }
    } catch (e) {
      // Non-critical
    }
  }

  logout() {
    ApiClient.removeToken();
    this.currentUser = null;
    this.navigate('login');
    this.addToast('Logged out successfully', 'info');
  }
}

export const appState = new AppStateStore();
