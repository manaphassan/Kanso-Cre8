/**
 * Global App State Store using Svelte 5 Runes
 */
import type { User, ThemeName, ToastMessage } from '$lib/types';
import { ApiClient } from '$lib/services/api';

export const DEFAULT_DESKTOP_CREATOR: User = {
  id: 'CREATOR01',
  username: 'creator',
  name: 'Studio Creator',
  email: 'creator@kansocre8.local',
  role: 'Administrator, Designer',
  roles: ['Administrator', 'Designer'],
  staffId: 'CREATOR01',
  department: 'Creative Studio',
  avatarColor: '#38BDF8',
  defaultBrand: 'ACME',
  permissions: [
    'project:view', 'project:create', 'project:edit', 'project:assign', 'project:archive',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:draft', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:upload', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view',
    'admin:users', 'admin:roles', 'admin:system_audit',
    'review:sign_off'
  ]
};

class AppStateStore {
  currentUser = $state<User>(DEFAULT_DESKTOP_CREATOR);
  currentRoute = $state<string>('dashboard');
  routeParams = $state<Record<string, any>>({});
  private static readonly VALID_THEMES: ThemeName[] = ['falconia', 'metamorphosis', 'catppuccin'];
  private static getStoredTheme(): ThemeName {
    const stored = localStorage.getItem('ss_cam_theme') as ThemeName;
    return AppStateStore.VALID_THEMES.includes(stored) ? stored : 'falconia';
  }
  theme = $state<ThemeName>(AppStateStore.getStoredTheme());
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
    // Prevent routing to login in desktop-only app
    const targetRoute = route === 'login' ? 'dashboard' : route;
    this.currentRoute = targetRoute;
    this.routeParams = params;
    window.location.hash = targetRoute + (params.id ? `/${encodeURIComponent(params.id)}` : '');
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
    if (!this.currentUser) return true; // Default to allow in desktop single-user mode
    return this.currentUser.permissions?.includes(permission) ?? true;
  }

  canApprove(): boolean {
    return true; // Single-user desktop mode has full approval authority
  }

  async loadCurrentUser() {
    try {
      const res = await ApiClient.getMe();
      if (res && res.user) {
        this.currentUser = {
          ...DEFAULT_DESKTOP_CREATOR,
          ...res.user,
          permissions: DEFAULT_DESKTOP_CREATOR.permissions
        };
      }
      this.loadNotificationCount();
    } catch {
      // Offline or local desktop fallback
      this.currentUser = DEFAULT_DESKTOP_CREATOR;
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
    // Desktop single-user vault mode
    this.currentUser = DEFAULT_DESKTOP_CREATOR;
    this.navigate('dashboard');
    this.addToast('Kanso Cre8 Desktop Vault Active', 'info', 'Studio Vault');
  }
}

export const appState = new AppStateStore();
