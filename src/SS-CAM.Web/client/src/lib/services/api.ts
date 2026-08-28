/**
 * Type-Safe API Client for SS-CAM Web Portal
 */
import type { 
  Project, 
  ProjectFrontmatter, 
  User, 
  DashboardData, 
  DeliverableItem, 
  FilterState, 
  ApprovalRecord,
  CreativeDirectionState,
  CopywritingState
} from '$lib/types';

const API_BASE = '/api';

export class ApiClient {
  static getToken(): string {
    return localStorage.getItem('ss_cam_token') || '';
  }

  static setToken(token: string): void {
    localStorage.setItem('ss_cam_token', token);
  }

  static removeToken(): void {
    localStorage.removeItem('ss_cam_token');
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {})
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401 && endpoint !== '/auth/login') {
        this.removeToken();
        window.dispatchEvent(new CustomEvent('auth:required'));
        throw new Error(data.error || 'Authentication required');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data as T;
    } catch (err: any) {
      console.error(`[API Error] ${endpoint}:`, err.message);
      throw err;
    }
  }

  // ─── Authentication ───
  static getAuthRoster(): Promise<{ success: boolean; staff: Array<{ staffId: string; username: string; name: string; role: string; department?: string; avatarColor?: string }> }> {
    return this.request('/auth/roster');
  }

  static login(username: string, password = ''): Promise<{ success: boolean; token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  static getMe(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  static changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  static getUsers(): Promise<{ users: User[] }> {
    return this.request('/auth/users');
  }

  // ─── Dashboard ───
  static getDashboard(params: { timeRange?: string; brand?: string } = {}): Promise<DashboardData> {
    const qs = new URLSearchParams();
    if (params.timeRange && params.timeRange !== 'all') qs.append('timeRange', params.timeRange);
    if (params.brand && params.brand !== 'all') qs.append('brand', params.brand);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<DashboardData>(`/dashboard${query}`);
  }

  // ─── Projects ───
  static getProjects(filters: Partial<FilterState> = {}): Promise<{ projects: Project[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'all') {
        params.append(k, String(v));
      }
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ projects: Project[]; total: number }>(`/projects${qs}`);
  }

  static getProject(id: string): Promise<{ project: Project; deliverables: DeliverableItem[]; exists: boolean }> {
    return this.request(`/projects/${encodeURIComponent(id)}`);
  }

  static updateProject(id: string, payload: Partial<ProjectFrontmatter>): Promise<{ success: boolean; project: Project }> {
    return this.request(`/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static deleteProject(id: string): Promise<{ success: boolean; message: string; projectId: string }> {
    return this.request(`/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  static updateBrief(id: string, briefMarkdown: string, expectedHash: string | null = null): Promise<{ success: boolean; versionHash: string }> {
    return this.request(`/projects/${encodeURIComponent(id)}/brief`, {
      method: 'PUT',
      body: JSON.stringify({ briefMarkdown, expectedHash })
    });
  }

  static updateCreativeDirection(id: string, payload: CreativeDirectionState): Promise<{ success: boolean; creativeDirection: CreativeDirectionState }> {
    return this.request(`/projects/${encodeURIComponent(id)}/direction`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static getCopywritingMarkdown(id: string): Promise<{ success: boolean; copywriting: { body: string; stats: any; filePath: string; lastUpdated: string } }> {
    return this.request(`/projects/${encodeURIComponent(id)}/copywriting`);
  }

  static updateCopywritingMarkdown(id: string, body: string): Promise<{ success: boolean; copywriting: any }> {
    return this.request(`/projects/${encodeURIComponent(id)}/copywriting`, {
      method: 'PUT',
      body: JSON.stringify({ body })
    });
  }

  static updateCopywriting(id: string, payload: any): Promise<{ success: boolean; copywriting: any }> {
    return this.request(`/projects/${encodeURIComponent(id)}/copywriting`, {
      method: 'PUT',
      body: JSON.stringify(typeof payload === 'string' ? { body: payload } : payload)
    });
  }

  static submitDecision(id: string, payload: { decision: string; comment?: string; deliverableId?: string }): Promise<{ success: boolean }> {
    return this.request(`/projects/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ─── Deliverables ───
  static getDeliverables(): Promise<{ deliverables: DeliverableItem[]; count: number }> {
    return this.request('/deliverables');
  }

  // ─── Team & Roster ───
  static getTeam(): Promise<{ team: any[] }> {
    return this.request('/team');
  }

  // ─── User & Staff Management ───
  static async getUsers(): Promise<{ success: boolean; users: any[] }> {
    try {
      return await this.request('/users');
    } catch {
      const res = await this.request('/team/roster');
      return { success: true, users: res.roster || [] };
    }
  }

  static async getStaffAccounts(): Promise<{ success: boolean; users: any[] }> {
    return this.getUsers();
  }

  static async getStaffRoster(): Promise<{ roster: any[]; users?: any[] }> {
    try {
      return await this.request('/team/roster');
    } catch {
      const res = await this.request('/users');
      return { roster: res.users || [] };
    }
  }

  static async addStaffMember(payload: any): Promise<{ success: boolean; member: any }> {
    try {
      return await this.request('/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch {
      return await this.request('/team/roster', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  }

  static async updateStaffMember(id: string, payload: any): Promise<{ success: boolean; member: any }> {
    try {
      return await this.request(`/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } catch {
      return await this.request(`/team/roster/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    }
  }

  static deleteUser(id: string): Promise<{ success: boolean; deletedStaffId: string }> {
    return this.request(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  static resetUserPassword(username: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/users/${encodeURIComponent(username)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  }

  // ─── Company & Subsidiary Directory ───
  static getCompanies(): Promise<{ success: boolean; companies: any[] }> {
    return this.request('/companies');
  }

  static getCompany(code: string): Promise<{ success: boolean; company: any }> {
    return this.request(`/companies/${encodeURIComponent(code)}`);
  }

  static saveCompany(payload: any): Promise<{ success: boolean; company: any }> {
    return this.request('/companies', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static deleteCompany(code: string): Promise<{ success: boolean; deletedCode: string }> {
    return this.request(`/companies/${encodeURIComponent(code)}`, {
      method: 'DELETE'
    });
  }

  // ─── Project Comments & Collaboration ───
  static getComments(projectId: string): Promise<{ comments: any[] }> {
    return this.request(`/projects/${encodeURIComponent(projectId)}/comments`);
  }

  static addComment(projectId: string, content: string, deliverableId?: string | null, mentions: string[] = []): Promise<{ success: boolean; comment: any }> {
    return this.request(`/projects/${encodeURIComponent(projectId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, deliverableId, mentions })
    });
  }

  static resolveComment(projectId: string, commentId: string, resolved: boolean = true): Promise<{ success: boolean; commentId: string; resolved: boolean }> {
    return this.request(`/projects/${encodeURIComponent(projectId)}/comments/${encodeURIComponent(commentId)}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolved })
    });
  }

  static deleteComment(projectId: string, commentId: string): Promise<{ success: boolean; commentId: string }> {
    return this.request(`/projects/${encodeURIComponent(projectId)}/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE'
    });
  }

  // ─── Notifications & Live Activity ───
  static getNotifications(limit: number = 25): Promise<{ notifications: any[]; unreadCount: number }> {
    return this.request(`/notifications?limit=${limit}`);
  }

  // ─── Real-Time Server-Sent Events (SSE) Stream ───
  static initEventStream(onEvent: (event: string, data: any) => void): () => void {
    const eventSource = new EventSource('/api/events');

    const handleMessage = (evt: MessageEvent, eventName: string) => {
      try {
        const parsed = JSON.parse(evt.data);
        onEvent(eventName, parsed);
      } catch {
        onEvent(eventName, evt.data);
      }
    };

    eventSource.addEventListener('connected', (e) => handleMessage(e, 'connected'));
    eventSource.addEventListener('workspace:updated', (e) => handleMessage(e, 'workspace:updated'));
    eventSource.addEventListener('project:updated', (e) => handleMessage(e, 'project:updated'));
    eventSource.addEventListener('project:decision', (e) => handleMessage(e, 'project:decision'));
    eventSource.addEventListener('comment:added', (e) => handleMessage(e, 'comment:added'));
    eventSource.addEventListener('comment:resolved', (e) => handleMessage(e, 'comment:resolved'));

    eventSource.onerror = (err) => {
      console.warn('[SSE] Connection interrupted, retrying in background...', err);
    };

    return () => {
      eventSource.close();
    };
  }

  // ─── Audit & System ───
  static getAuditLogs(params: Record<string, string> = {}): Promise<{ logs: any[] }> {
    const searchParams = new URLSearchParams(params);
    return this.request(`/audit?${searchParams.toString()}`);
  }

  static getSystemStatus(): Promise<any> {
    return this.request('/system/status');
  }

  static getWorkspaceCandidates(): Promise<{ success: boolean; candidates: Array<{ path: string; accessible: boolean; itemCount: number; isCurrent: boolean }>; current: string }> {
    return this.request('/system/workspace-candidates');
  }

  static updateWorkspaceRoot(workspacePath: string): Promise<{ success: boolean; workspaceRoot: string; cachedProjects: number; message: string }> {
    return this.request('/system/workspace-root', {
      method: 'POST',
      body: JSON.stringify({ workspacePath })
    });
  }
}


