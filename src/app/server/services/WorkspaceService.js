/**
 * WorkspaceService Facade
 * Orchestrates VaultPathService, ScaffoldService, and ProjectService.
 * Maintains 100% backward compatibility across all routes, tests, and client code.
 */
const VaultPathService = require('./VaultPathService');
const ScaffoldService = require('./ScaffoldService');
const ProjectService = require('./ProjectService');

class WorkspaceService {
  constructor() {
    ProjectService.init();
  }

  get workspaceRoot() {
    return VaultPathService.workspaceRoot;
  }

  set workspaceRoot(newPath) {
    VaultPathService.workspaceRoot = newPath;
    ProjectService.workspaceRoot = newPath;
  }

  get projectsCache() {
    return ProjectService.projectsCache;
  }

  set projectsCache(cache) {
    ProjectService.projectsCache = cache;
  }

  get lastScanTime() {
    return ProjectService.lastScanTime;
  }

  set lastScanTime(t) {
    ProjectService.lastScanTime = t;
  }

  get isScanning() {
    return ProjectService.isScanning;
  }

  set isScanning(s) {
    ProjectService.isScanning = s;
  }

  get watcher() {
    return ProjectService.watcher;
  }

  set watcher(w) {
    ProjectService.watcher = w;
  }

  // Lifecycle & scanning
  init() { return ProjectService.init(); }
  ensureWorkspace() { return VaultPathService.ensureWorkspace(); }
  getVaultStatus() { return VaultPathService.getVaultStatus(); }
  ensureVaultStructure(root) { return VaultPathService.ensureVaultStructure(root); }
  migrateVault(targetPath) { return VaultPathService.migrateVault(targetPath); }
  startWatcher() { return ProjectService.startWatcher(); }
  scan(force = false) { return ProjectService.scan(force); }
  scanDirectory(dir, results) { return ProjectService.scanDirectory(dir, results); }
  buildProjectItem(folderName, fullPath, regexMatch) { return ProjectService.buildProjectItem(folderName, fullPath, regexMatch); }

  // Project queries & CRUD
  getAllProjects(filters) { return ProjectService.getAllProjects(filters); }
  getProjectById(id) { return ProjectService.getProjectById(id); }
  getDashboardMetrics(options) { return ProjectService.getDashboardMetrics(options); }
  updateProject(id, payload, actor, role) { return ProjectService.updateProject(id, payload, actor, role); }
  updateProjectBrief(id, briefMarkdown, expectedHash, actor) { return ProjectService.updateProjectBrief(id, briefMarkdown, expectedHash, actor); }
  updateProjectDirection(id, directionData, actor) { return ProjectService.updateProjectDirection(id, directionData, actor); }
  reassignProject(id, newDesigner, reason, actor, role) { return ProjectService.reassignProject(id, newDesigner, reason, actor, role); }
  deleteProject(projectId, actorName, actorRole) { return ProjectService.deleteProject(projectId, actorName, actorRole); }

  // Scaffold & Ingest
  seedSampleProjects() { return ScaffoldService.seedSampleProjects(); }
  scaffoldProject(options, actor) { return ScaffoldService.scaffoldProject(options, actor); }
  ingestFile(projectId, targetSubfolder, filename, base64Data, actor) { return ScaffoldService.ingestFile(projectId, targetSubfolder, filename, base64Data, actor); }

  // Paths & Sync
  countFiles(dir) { return VaultPathService.countFiles(dir); }
  extractDesignerFromPath(fullPath) { return VaultPathService.extractDesignerFromPath(fullPath); }
  inferCreatedDate(folderName, fullPath) { return VaultPathService.inferCreatedDate(folderName, fullPath); }
  getWorkspaceCandidates() { return VaultPathService.getWorkspaceCandidates(); }
  scanSyncConflicts() { return VaultPathService.scanSyncConflicts(); }
  resolveSyncConflict(conflictPath, resolution, actor) { return VaultPathService.resolveSyncConflict(conflictPath, resolution, actor); }
  setWorkspaceRoot(newPath, actor, autoCreate) { return VaultPathService.setWorkspaceRoot(newPath, actor, autoCreate); }
  resetVaultStructure(confirmationName, actor) { return VaultPathService.resetVaultStructure(confirmationName, actor); }
}

module.exports = new WorkspaceService();
