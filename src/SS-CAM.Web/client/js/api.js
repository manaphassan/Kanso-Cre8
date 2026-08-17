/**
 * API Client for SS-CAM Web Management Portal
 */

const API_BASE = '/api';

function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

window.debounce = debounce;

class ApiClient {
  static getToken() {
    return localStorage.getItem('ss_cam_token') || '';
  }

  static setToken(token) {
    localStorage.setItem('ss_cam_token', token);
  }

  static removeToken() {
    localStorage.removeItem('ss_cam_token');
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      
      if (response.status === 401 && endpoint !== '/auth/login') {
        // Token invalid or missing, redirect to login
        this.removeToken();
        window.dispatchEvent(new CustomEvent('auth:required'));
        throw new Error(data.error || 'Authentication required');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Auth
  static login(username, password = '') {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  static getMe() {
    return this.request('/auth/me');
  }

  static changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  static getUsers() {
    return this.request('/auth/users');
  }

  // Dashboard
  static getDashboard() {
    return this.request('/dashboard');
  }

  // Projects
  static getProjects(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(k => {
      if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
        params.append(k, filters[k]);
      }
    });
    return this.request(`/projects?${params.toString()}`);
  }

  static getProject(id) {
    return this.request(`/projects/${encodeURIComponent(id)}`);
  }

  static updateProject(id, payload) {
    return this.request(`/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static updateBrief(id, briefMarkdown, expectedHash = null) {
    return this.request(`/projects/${encodeURIComponent(id)}/brief`, {
      method: 'PUT',
      body: JSON.stringify({ briefMarkdown, expectedHash })
    });
  }

  static updateCreativeDirection(id, payload) {
    return this.request(`/projects/${encodeURIComponent(id)}/direction`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static updateCopywriting(id, payload) {
    return this.request(`/projects/${encodeURIComponent(id)}/copywriting`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static submitDecision(id, payload) {
    return this.request(`/projects/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Deliverables
  static getDeliverables() {
    return this.request('/deliverables');
  }

  // Team & Staff Roster
  static getTeam() {
    return this.request('/team');
  }

  static getStaffRoster() {
    return this.request('/team/roster');
  }

  static addStaffMember(payload) {
    return this.request('/team/roster', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static updateStaffMember(id, payload) {
    return this.request(`/team/roster/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // Audit
  static getAuditLogs(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/audit?${searchParams.toString()}`);
  }

  // System status
  static getSystemStatus() {
    return this.request('/system/status');
  }
}

window.ApiClient = ApiClient;
