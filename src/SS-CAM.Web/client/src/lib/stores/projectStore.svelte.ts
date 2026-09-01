/**
 * Project and Deliverables Cache Store using Svelte 5 Runes
 */
import type { Project, DeliverableItem, FilterState, DashboardData } from '$lib/types';
import { ApiClient } from '$lib/services/api';
import { appState } from './appState.svelte';

class ProjectStore {
  projects = $state<Project[]>([]);
  deliverables = $state<DeliverableItem[]>([]);
  dashboardData = $state<DashboardData | null>(null);
  selectedProject = $state<Project | null>(null);
  activeDeliverables = $state<DeliverableItem[]>([]);
  
  isLoading = $state<boolean>(false);
  loadingDetail = $state<boolean>(false);
  isSaving = $state<boolean>(false);

  dashboardTimeRange = $state<string>('all');
  dashboardBrand = $state<string>('all');

  activeFilters = $state<FilterState>({
    query: '',
    status: 'all',
    brand: 'all',
    designer: 'all',
    priority: 'all',
    department: 'all'
  });

  // Filtered projects computed via Svelte 5 $derived
  filteredProjects = $derived.by(() => {
    return this.projects.filter(p => {
      const { query, status, brand, designer, priority, department } = this.activeFilters;
      
      if (status !== 'all') {
        if (status === 'approved') {
          if (p.status !== 'approved' && p.status !== 'done') return false;
        } else if (status === 'on-hold') {
          if (p.status !== 'on-hold' && p.status !== 'rejected') return false;
        } else if (p.status !== status) {
          return false;
        }
      }
      if (brand !== 'all' && p.brand !== brand) return false;
      if (designer !== 'all' && p.designer !== designer) return false;
      if (priority !== 'all' && p.priority !== priority) return false;
      if (department !== 'all' && p.department !== department) return false;

      if (query && query.trim() !== '') {
        const q = query.toLowerCase();
        const matchesJobId = p.jobId?.toLowerCase().includes(q);
        const matchesTitle = p.title?.toLowerCase().includes(q);
        const matchesDesigner = p.designer?.toLowerCase().includes(q);
        const matchesTags = p.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesJobId && !matchesTitle && !matchesDesigner && !matchesTags) return false;
      }

      return true;
    });
  });

  // Review Queue Count
  pendingReviewCount = $derived.by(() => {
    return this.projects.filter(p => p.status === 'review').length;
  });

  async loadProjects() {
    this.isLoading = true;
    try {
      const res = await ApiClient.getProjects();
      this.projects = res.projects || [];
    } catch (err: any) {
      appState.addToast(`Failed to load projects: ${err.message}`, 'error');
    } finally {
      this.isLoading = false;
    }
  }

  async loadDashboard(options?: { timeRange?: string; brand?: string }) {
    this.isLoading = true;
    if (options?.timeRange) this.dashboardTimeRange = options.timeRange;
    if (options?.brand) this.dashboardBrand = options.brand;
    try {
      this.dashboardData = await ApiClient.getDashboard({
        timeRange: this.dashboardTimeRange,
        brand: this.dashboardBrand
      });
    } catch (err: any) {
      appState.addToast(`Failed to load dashboard: ${err.message}`, 'error');
    } finally {
      this.isLoading = false;
    }
  }

  async loadProjectDetail(id: string) {
    this.loadingDetail = true;
    this.isLoading = true;
    try {
      const res = await ApiClient.getProject(id);
      this.selectedProject = res.project;
      this.activeDeliverables = res.deliverables || [];
    } catch (err: any) {
      appState.addToast(`Failed to load project details: ${err.message}`, 'error');
      this.selectedProject = null;
    } finally {
      this.loadingDetail = false;
      this.isLoading = false;
    }
  }

  async loadDeliverables() {
    this.isLoading = true;
    try {
      const res = await ApiClient.getDeliverables();
      this.deliverables = res.deliverables || [];
    } catch (err: any) {
      appState.addToast(`Failed to load deliverables: ${err.message}`, 'error');
    } finally {
      this.isLoading = false;
    }
  }

  async updateProjectStatus(projectId: string, newStatus: string) {
    const project = this.projects.find(p => p.id === projectId || p.jobId === projectId);
    if (!project) return;
    const oldStatus = project.status;
    project.status = newStatus as any;
    try {
      await ApiClient.updateProject(project.id, { status: newStatus });
      appState.addToast(`Project ${project.jobId || project.title} moved to ${newStatus.replace('-', ' ')}`, 'success');
      await this.loadProjects();
    } catch (err: any) {
      project.status = oldStatus;
      appState.addToast(`Failed to update status: ${err.message}`, 'error');
    }
  }

  setFilter(key: keyof FilterState, value: string) {
    this.activeFilters[key] = value;
  }

  resetFilters() {
    this.activeFilters = {
      query: '',
      status: 'all',
      brand: 'all',
      designer: 'all',
      priority: 'all',
      department: 'all'
    };
  }
}

export const projectStore = new ProjectStore();
