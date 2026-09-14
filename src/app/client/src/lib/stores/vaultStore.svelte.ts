/**
 * Kanso Cre8 — Reactive Vault Store (Svelte 5 Runes)
 * Coordinates pure Markdown filesystem state, cloud sync detection,
 * and universal task rollup across the application.
 */

import { VaultService, type ExtractedTask } from '$lib/services/vaultService';
import { ApiClient } from '$lib/services/api';
import type { VaultConfig, VaultStats, SyncProvider } from '$lib/types/kanso';

class VaultStore {
  config = $state<VaultConfig>({
    rootPath: 'KansoCre8-Vault',
    name: 'Main Creative Vault',
    provider: 'local',
    isOnline: true,
    lastSyncedAt: new Date().toISOString(),
    autoWatch: true
  });

  stats = $state<VaultStats>({
    clientCount: 0,
    projectCount: 0,
    invoiceCount: 0,
    zettelCount: 0,
    totalSizeBytes: 0,
    lastScannedAt: new Date().toISOString()
  });

  tasks = $state<ExtractedTask[]>([]);

  isScanning = $state(false);
  lastError = $state<string | null>(null);

  // Derived metrics
  activeTaskCount = $derived(this.tasks.filter(t => !t.completed).length);
  completedTaskCount = $derived(this.tasks.filter(t => t.completed).length);
  urgentTaskCount = $derived(this.tasks.filter(t => !t.completed && t.priority === 'urgent').length);

  /**
   * Initializes vault with a target local or cloud path
   */
  setVaultPath(path: string) {
    const provider = VaultService.detectSyncProvider(path);
    this.config.rootPath = path;
    this.config.provider = provider;
    this.config.lastSyncedAt = new Date().toISOString();
  }

  /**
   * Toggles task completion state
   */
  toggleTask(taskId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.config.lastSyncedAt = new Date().toISOString();
    }
  }

  /**
   * Adds an extracted task to the master rollup
   */
  addTask(task: ExtractedTask) {
    this.tasks.push(task);
  }

  /**
   * Refreshes stats
   */
  updateStats(partial: Partial<VaultStats>) {
    this.stats = { ...this.stats, ...partial, lastScannedAt: new Date().toISOString() };
  }

  /**
   * Scans active vault from disk API and updates stats dynamically
   */
  async scanVault(): Promise<void> {
    this.isScanning = true;
    this.lastError = null;
    try {
      const [healthRes, projRes, invRes, notesRes, tasksRes] = await Promise.allSettled([
        ApiClient.getSystemHealth(),
        ApiClient.getProjects(),
        ApiClient.getInvoices(),
        ApiClient.getAtomicNotes(),
        ApiClient.getUniversalTasks()
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value?.workspaceRoot) {
        this.config.rootPath = healthRes.value.workspaceRoot;
        this.config.provider = VaultService.detectSyncProvider(healthRes.value.workspaceRoot);
      }

      const projectCount = projRes.status === 'fulfilled' && Array.isArray(projRes.value?.projects) 
        ? projRes.value.projects.length 
        : 0;

      const invoiceCount = invRes.status === 'fulfilled' && Array.isArray(invRes.value?.invoices) 
        ? invRes.value.invoices.length 
        : 0;

      const zettelCount = notesRes.status === 'fulfilled' && Array.isArray(notesRes.value?.notes) 
        ? notesRes.value.notes.length 
        : 0;

      this.stats = {
        clientCount: 0,
        projectCount,
        invoiceCount,
        zettelCount,
        totalSizeBytes: 0,
        lastScannedAt: new Date().toISOString()
      };

      if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value?.tasks)) {
        this.tasks = tasksRes.value.tasks.map((t: any, idx: number) => ({
          id: t.id || `task-${idx}`,
          title: t.text || t.title || '',
          completed: !!t.completed,
          dueDate: t.dueDate,
          priority: t.priority || 'normal',
          sourceFile: t.sourceFile || '',
          lineIndex: t.lineIndex || 0,
          rawLine: t.rawLine || ''
        }));
      } else {
        this.tasks = [];
      }
    } catch (err: any) {
      this.lastError = err.message || 'Scan error';
    } finally {
      this.isScanning = false;
    }
  }
}

export const vaultStore = new VaultStore();
