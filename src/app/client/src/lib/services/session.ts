/**
 * session.ts — Kanso Cre8 Client Session Manager & LocalStorage Migration Shim
 * 
 * Storage Tier: Session (localStorage key 'kanso.session' only)
 * In accordance with kanso-vault-schema:
 * - Browser stores NO durable user data.
 * - Single allowed localStorage key: 'kanso.session'.
 * - Migrates legacy ss_cam_* and kanso_theme keys on initial load and purges them.
 */

export interface KansoSession {
  token?: string;
  theme?: string;
  defaultProjectView?: 'cards' | 'table' | 'kanban';
  projectView?: 'cards' | 'table' | 'kanban';
  lastRoute?: string;
  rememberUser?: string;
  rememberMe?: boolean;
}

const SESSION_KEY = 'kanso.session';

/**
 * Migration shim: runs once on boot to read any legacy ss_cam_* keys and kanso_theme,
 * persists them into kanso.session, and deletes all legacy keys.
 */
function runMigrationShim(): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    let session: KansoSession = raw ? JSON.parse(raw) : {};
    let migrated = false;

    // 1. Check legacy theme
    const legacyTheme = localStorage.getItem('kanso_theme') || localStorage.getItem('ss_cam_theme');
    if (legacyTheme && !session.theme) {
      session.theme = legacyTheme;
      migrated = true;
    }

    // 2. Check legacy auth token
    const legacyToken = localStorage.getItem('ss_cam_token');
    if (legacyToken && !session.token) {
      session.token = legacyToken;
      migrated = true;
    }

    // 3. Check legacy project view preferences
    const legacyDefaultView = localStorage.getItem('ss_cam_default_project_view') as any;
    if (legacyDefaultView && !session.defaultProjectView) {
      session.defaultProjectView = legacyDefaultView;
      migrated = true;
    }

    const legacyView = localStorage.getItem('ss_cam_project_view') as any;
    if (legacyView && !session.projectView) {
      session.projectView = legacyView;
      migrated = true;
    }

    // 4. Check legacy remember user
    const legacyRememberUser = localStorage.getItem('ss_cam_remember_user');
    if (legacyRememberUser && !session.rememberUser) {
      session.rememberUser = legacyRememberUser;
      session.rememberMe = localStorage.getItem('ss_cam_remember_me') === 'true';
      migrated = true;
    }

    if (migrated) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    // 5. Purge all legacy ss_cam_* and kanso_theme keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ss_cam_') || key === 'kanso_theme')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('[Session] Migration shim error:', e);
  }
}

// Execute migration shim immediately on module import
runMigrationShim();

export function getSession(): KansoSession {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setSession(updates: Partial<KansoSession>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getSession();
    const updated = { ...current, ...updates };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('[Session] Failed to persist session:', e);
  }
}

export function clearSession(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}
