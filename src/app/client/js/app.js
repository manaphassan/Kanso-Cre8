/**
 * Application Shell, Router, Theme & UI Controllers for SS-CAM Web Portal
 */

// ─── MODAL CONTROLLER ────────────────────────────────────────────────
const Modal = {
  open({ title, content, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm = null }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'active-modal-backdrop';

    backdrop.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">${title}</h3>
          <button class="btn btn-sm btn-ghost" onclick="Modal.close()">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="Modal.close()">${cancelText}</button>
          <button id="modal-confirm-btn" class="btn btn-primary">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
      if (onConfirm) {
        await onConfirm();
      }
      Modal.close();
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) Modal.close();
    });
  },

  openLightbox({ filename, previewUrl, project, onApprove, onRevision }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'active-modal-backdrop';

    backdrop.innerHTML = `
      <div class="modal-dialog lightbox-modal">
        <div class="lightbox-media">
          ${previewUrl 
            ? `<img src="${previewUrl}" alt="${filename}">` 
            : `<div style="color: #FFFFFF; font-size: 48px;">📄<div style="font-size: 16px; margin-top: 10px;">${filename}</div></div>`
          }
        </div>
        <div class="lightbox-sidebar">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <span class="badge badge-brand">${project ? project.brand : 'SS'}</span>
              <button class="btn btn-sm btn-ghost" onclick="Modal.close()">✕ Close</button>
            </div>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">${filename}</h3>
            <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 16px;">
              Project: <b>${project ? project.title : ''}</b> (${project ? project.jobId : ''})
            </div>

            <div style="background: var(--surface-card-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--surface-card-border); font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
              <div>• Designer: <b>${project ? project.designer : 'Unassigned'}</b></div>
              <div>• Status: <b>${project ? project.status : 'backlog'}</b></div>
              <div>• Target Deadline: <b>${project ? project.deadline || 'N/A' : 'N/A'}</b></div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${window.AppShell && window.AppShell.canApprove() ? `
              <button id="lightbox-revision-btn" class="btn btn-secondary" style="width: 100%;">Request Revision</button>
              <button id="lightbox-approve-btn" class="btn btn-success" style="width: 100%;">Approve Deliverable</button>
            ` : `
              <div style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px; background: var(--surface-card-subtle); border-radius: var(--radius-md); border: 1px solid var(--surface-card-border);">
                Approval sign-off is reserved for Managers & Admins.
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const approveBtn = document.getElementById('lightbox-approve-btn');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => { if (onApprove) onApprove(); });
    }

    const revisionBtn = document.getElementById('lightbox-revision-btn');
    if (revisionBtn) {
      revisionBtn.addEventListener('click', () => { if (onRevision) onRevision(); });
    }

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) Modal.close();
    });
  },

  openChangePasswordModal() {
    const currentUser = AppState.get('currentUser');
    this.open({
      title: 'Change Password',
      content: `
        <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 16px;">
          Update password for <b>${currentUser ? currentUser.name : 'your account'}</b> (${currentUser ? currentUser.username : ''}).
        </p>
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="font-weight: 700;">Current Password</label>
          <input type="password" id="modal-curr-pass" class="form-control" placeholder="Enter current password" required />
        </div>
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="font-weight: 700;">New Password</label>
          <input type="password" id="modal-new-pass" class="form-control" placeholder="Minimum 6 characters" required />
        </div>
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="font-weight: 700;">Confirm New Password</label>
          <input type="password" id="modal-confirm-pass" class="form-control" placeholder="Re-enter new password" required />
        </div>
      `,
      confirmText: 'Update Password',
      onConfirm: async () => {
        const currentPassword = document.getElementById('modal-curr-pass').value;
        const newPassword = document.getElementById('modal-new-pass').value;
        const confirmPassword = document.getElementById('modal-confirm-pass').value;

        if (!currentPassword || !newPassword) {
          window.showToast('Please enter both current and new password.', 'danger');
          return;
        }

        if (newPassword !== confirmPassword) {
          window.showToast('New password and confirmation do not match.', 'danger');
          return;
        }

        if (newPassword.length < 6) {
          window.showToast('New password must be at least 6 characters.', 'danger');
          return;
        }

        try {
          await ApiClient.changePassword(currentPassword, newPassword);
          window.showToast('Password updated successfully!', 'success');
        } catch (err) {
          window.showToast(`Error: ${err.message}`, 'danger');
        }
      }
    });
  },

  close() {
    const backdrop = document.getElementById('active-modal-backdrop');
    if (backdrop) backdrop.remove();
  }
};

window.Modal = Modal;

// ─── TOAST CONTROLLER ────────────────────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const color = type === 'success' ? '#10B981' : type === 'danger' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#21A1F7';
  toast.style.setProperty('--toast-color', color);

  const svgs = window.SS_BRAND_SVGS || {};
  const iconSvg = type === 'success' 
    ? (svgs.fluentIcon ? svgs.fluentIcon('check', 16, '#10B981') : '✓')
    : type === 'danger'
    ? (svgs.fluentIcon ? svgs.fluentIcon('admin', 16, '#EF4444') : '⚠')
    : type === 'warning'
    ? (svgs.fluentIcon ? svgs.fluentIcon('admin', 16, '#F59E0B') : '!')
    : (svgs.fluentIcon ? svgs.fluentIcon('dashboard', 16, '#21A1F7') : 'ℹ');

  toast.innerHTML = `
    <span style="display: flex; align-items: center; justify-content: center;">${iconSvg}</span>
    <span style="font-size: 13px; font-weight: 600; flex: 1;">${message}</span>
    <button style="background: none; border: none; color: var(--text-tertiary); cursor: pointer; padding: 2px 4px; font-size: 14px;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  // Auto-remove after 3.8s with smooth fade
  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 200);
  }, 3800);
}

window.showToast = showToast;

// Global Escape Key Listener for Modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    Modal.close();
  }
});

// ─── SPA ROUTER ──────────────────────────────────────────────────────
const AppRouter = {
  routes: {
    dashboard: DashboardView,
    projects: ProjectsView,
    'project-detail': ProjectDetailView,
    deliverables: DeliverablesView,
    team: TeamView,
    'copy-studio': CopyStudioView,
    admin: AdminView,
    profile: ProfileView
  },

  navigate(route, params = {}) {
    // RBAC Route Guard: Hide & restrict administration from User role
    if (route === 'admin' && AppShell.getUserRole() === 'user') {
      window.showToast('Access Denied: Administration is restricted to Admins and Managers', 'danger');
      if (AppState.get('currentRoute') !== 'dashboard') {
        this.navigate('dashboard');
      }
      return;
    }

    AppState.update({ currentRoute: route, routeParam: params });

    // Update active nav styling
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-route') === route) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    const viewContent = document.getElementById('view-content');
    const view = this.routes[route] || DashboardView;

    // Update Header Title
    const headerTitleMap = {
      dashboard: 'Executive Management Dashboard',
      projects: 'Project Catalog & Search',
      'project-detail': 'Project Management Workspace',
      deliverables: 'Deliverable Review & Approval Queue',
      team: 'Team Capacity & Assignments',
      'copy-studio': 'Marketing Copywriting & Script Studio',
      admin: 'Administration & System Diagnostics',
      profile: 'User Profile & Security Settings'
    };
    document.getElementById('current-view-title').textContent = headerTitleMap[route] || 'Creative Management Portal';

    view.render(viewContent, params);
  }
};

window.AppRouter = AppRouter;

// ─── APP SHELL CONTROLLER ────────────────────────────────────────────
const AppShell = {
  getUserRole() {
    const user = AppState.get('currentUser');
    if (!user) return 'user';
    const r = (user.role || '').toLowerCase();
    if (r.includes('admin')) return 'admin';
    if (r.includes('manager') || r.includes('ceo') || r.includes('director')) return 'manager';
    return 'user';
  },

  canApprove() {
    const role = this.getUserRole();
    return role === 'admin' || role === 'manager';
  },

  isAdmin() {
    return this.getUserRole() === 'admin';
  },

  async init() {
    this.applyTheme(AppState.get('theme'));

    // Check auth or present Login Screen
    let user = null;
    try {
      if (ApiClient.getToken()) {
        const me = await ApiClient.getMe();
        user = me.user;
      }
    } catch (e) {
      console.warn('Session check failed:', e.message);
      ApiClient.setToken(null);
    }

    if (!user) {
      // Render full-screen Login Screen if not authenticated
      LoginView.render(document.body);
      return;
    }

    AppState.set('currentUser', user);
    this.updateUserHeader();

    // Apply SuamiSihat Official Signature Branding
    this.applyTheme('falconia');

    // Wire Navigation clicks
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.getAttribute('data-route');
        if (route) AppRouter.navigate(route);
      });
    });

    // Restore Sidebar Collapsed state
    if (localStorage.getItem('ss_cam_sidebar_collapsed') === 'true') {
      const sidebar = document.querySelector('.app-sidebar');
      if (sidebar) sidebar.classList.add('collapsed');
    }

    // Initial Route
    AppRouter.navigate('dashboard');
  },

  toggleSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;

    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('ss_cam_sidebar_collapsed', isCollapsed);
  },

  logout() {
    ApiClient.removeToken();
    AppState.set('currentUser', null);
    LoginView.render(document.body);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ss_cam_theme', theme);
    AppState.set('theme', theme);
  },

  updateUserHeader() {
    const user = AppState.get('currentUser');
    if (!user) return;

    document.getElementById('header-user-avatar').textContent = (user.name || 'M').substring(0, 1).toUpperCase();
    document.getElementById('header-user-name').textContent = user.name;
    document.getElementById('header-user-role').textContent = `${user.role} • ${user.department}`;

    // Hide Administration from User role
    const adminNavItem = document.querySelector('.nav-item[data-route="admin"]');
    if (adminNavItem) {
      adminNavItem.style.display = this.getUserRole() === 'user' ? 'none' : 'flex';
    }
  }
};

window.AppShell = AppShell;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('auth:required', () => {
    AppShell.logout();
  });
  AppShell.init();
});
