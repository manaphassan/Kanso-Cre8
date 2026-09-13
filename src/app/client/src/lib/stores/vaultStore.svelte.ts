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
      title: 'Finalize Acme Corp design system vector components',
      completed: true,
      dueDate: '2026-08-20',
      priority: 'high',
      sourceFile: '_Projects/2026/202609_0001D_ACME_MobileAppIllustration/README.md',
      lineIndex: 38,
      rawLine: '- [x] #task Finalize Acme Corp design system vector components 📅 2026-08-20 ⏫ high'
    },
    {
      id: 'task-2',
      title: 'Prepare Nexus Studio 3D motion keyframe concepts',
      completed: false,
      dueDate: '2026-10-31',
      priority: 'urgent',
      sourceFile: '_Projects/2026/202609_0002S_NEX_GameKeyVisual/README.md',
      lineIndex: 43,
      rawLine: '- [ ] #task Prepare Nexus Studio 3D motion keyframe concepts 📅 2026-10-31 ⏫ urgent'
    },
    {
      id: 'task-3',
      title: 'Draft Lumina Labs research portal data visualization specs',
      completed: false,
      dueDate: '2026-09-25',
      priority: 'high',
      sourceFile: '_Projects/2026/202609_0003P_LUM_BrandIdentity/README.md',
      lineIndex: 40,
      rawLine: '- [ ] #task Draft Lumina Labs research portal data visualization specs 📅 2026-09-25 ⏫ high'
    },
    {
      id: 'task-4',
      title: 'Deliver Acme Corp mobile app splash screen illustrations',
      completed: false,
      dueDate: '2026-10-15',
      priority: 'urgent',
      sourceFile: '_Projects/2026/202609_0001D_ACME_MobileAppIllustration/README.md',
      lineIndex: 42,
      rawLine: '- [ ] #task Deliver Acme Corp mobile app splash screen illustrations 📅 2026-10-15 ⏫ urgent'
    },
    {
      id: 'task-5',
      title: 'Send deposit invoice INV-2026-001 to Acme Corp',
      completed: true,
      dueDate: '2026-09-15',
      priority: 'normal',
      sourceFile: '_Finance/Invoices/INV-2026-001_ACME.md',
      lineIndex: 8,
      rawLine: '- [x] #task Send deposit invoice INV-2026-001 to Acme Corp 📅 2026-09-15 ⏫ normal'
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
