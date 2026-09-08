/**
 * Central State Store for SS-CAM Web Management Portal
 */

class StateStore {
  constructor() {
    this.state = {
      currentUser: null,
      currentRoute: 'dashboard',
      routeParam: null,
      theme: localStorage.getItem('ss_cam_theme') || 'falconia',
      dashboardData: null,
      projectsList: [],
      activeFilters: {
        query: '',
        status: 'all',
        brand: 'all',
        designer: 'all',
        priority: 'all',
        department: 'all'
      },
      selectedProject: null,
      deliverablesQueue: [],
      teamDirectory: [],
      systemStatus: null
    };

    this.listeners = new Map();
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
    this.notify(key, value);
  }

  update(partial) {
    Object.keys(partial).forEach(k => {
      this.state[k] = partial[k];
      this.notify(k, partial[k]);
    });
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key).delete(callback);
  }

  notify(key, value) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(cb => {
        try { cb(value); } catch (e) { console.error(e); }
      });
    }
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => {
        try { cb(key, value); } catch (e) { console.error(e); }
      });
    }
  }

  hasPermission(permission) {
    if (!this.state.currentUser) return false;
    const perms = this.state.currentUser.permissions || [];
    return perms.includes(permission);
  }
}

window.AppState = new StateStore();
