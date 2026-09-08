/**
 * Kanso Cre8 — Reactive Vault Store (Svelte 5 Runes)
 * Coordinates pure Markdown filesystem state, cloud sync detection,
 * and universal task rollup across the application.
 */

import { VaultService, type ExtractedTask } from '$lib/services/vaultService';
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
    clientCount: 3,
    projectCount: 4,
    invoiceCount: 2,
    zettelCount: 12,
    totalSizeBytes: 10485760, // ~10MB
    lastScannedAt: new Date().toISOString()
  });

  tasks = $state<ExtractedTask[]>([
    {
      id: 'task-1',
      title: 'Review packaging dieline print bleed',
      completed: false,
      dueDate: '2026-09-20',
      priority: 'high',
      sourceFile: '2026/202609_September/202609_0001_ACME_MobileAppIllustration/README.md',
      lineIndex: 12,
      rawLine: '- [ ] #task Review packaging dieline print bleed 📅 2026-09-20 ⏫ high'
    },
    {
      id: 'task-2',
      title: 'Extract high-contrast viral hooks into 03_Permanent',
      completed: false,
      dueDate: '2026-09-22',
      priority: 'urgent',
      sourceFile: '_Zettelkasten/01_Fleeting/20260908_Call_Notes.md',
      lineIndex: 5,
      rawLine: '- [ ] #task Extract high-contrast viral hooks into 03_Permanent 📅 2026-09-22 ⏫ urgent'
    },
    {
      id: 'task-3',
      title: 'Send deposit invoice to Nexus Studio',
      completed: true,
      dueDate: '2026-09-15',
      priority: 'normal',
      sourceFile: '_Finance/Invoices/INV-2026-002_NexusStudio_LaunchDesign.md',
      lineIndex: 8,
      rawLine: '- [x] #task Send deposit invoice to Nexus Studio 📅 2026-09-15 ⏫ normal'
    }
  ]);

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
}

export const vaultStore = new VaultStore();
