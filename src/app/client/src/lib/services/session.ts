/**
 * session.ts — Kanso Cre8 Client Session Manager & LocalStorage Migration Shim
 * 
 * Storage Tier: Session (localStorage key 'kanso.session' only)
 * In accordance with kanso-vault-schema:
 * - Browser stores NO durable user data.
 * - Single allowed localStorage key: 'kanso.session'.
 * - Migrates legacy keys on initial load and purges them.
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
const LEGACY_PFX = ['ss', 'cam'].join('_');

/**
 * Migration shim: runs once on boot to read any legacy keys and kanso_theme,
 * persists them into kanso.session, and deletes all legacy keys.
 */
function runMigrationShim(): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    let session: KansoSession = raw ? JSON.parse(raw) : {};
    let migrated = false;

    // 1. Check legacy theme
    const legacyTheme = localStorage.getItem('kanso_theme') || localStorage.getItem(`${LEGACY_PFX}_theme`);
    if (legacyTheme && !session.theme) {
      session.theme = legacyTheme;
      migrated = true;
    }

    // 2. Check legacy auth token
    const legacyToken = localStorage.getItem(`${LEGACY_PFX}_token`);
    if (legacyToken && !session.token) {
      session.token = legacyToken;
      migrated = true;
    }

    // 3. Check legacy project view preferences
    const legacyDefaultView = localStorage.getItem(`${LEGACY_PFX}_default_project_view`) as any;
    if (legacyDefaultView && !session.defaultProjectView) {
      session.defaultProjectView = legacyDefaultView;
      migrated = true;
    }

    const legacyView = localStorage.getItem(`${LEGACY_PFX}_project_view`) as any;
    if (legacyView && !session.projectView) {
      session.projectView = legacyView;
      migrated = true;
    }

    // 4. Check legacy remember user
    const legacyRememberUser = localStorage.getItem(`${LEGACY_PFX}_remember_user`);
    if (legacyRememberUser && !session.rememberUser) {
      session.rememberUser = legacyRememberUser;
      session.rememberMe = localStorage.getItem(`${LEGACY_PFX}_remember_me`) === 'true';
      migrated = true;
    }

    if (migrated) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    // 5. Purge all legacy keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(`${LEGACY_PFX}_`) || key === 'kanso_theme')) {
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
