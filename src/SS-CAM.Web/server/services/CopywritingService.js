const FrontmatterService = require('./FrontmatterService');
const AuditService = require('./AuditService');
const WorkspaceService = require('./WorkspaceService');

class CopywritingService {
  /**
   * Updates copywriting status and content for a project.
   */
  static updateCopywriting(projectId, copyData, actor = 'Copywriter', role = 'Copywriter') {
    const project = WorkspaceService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const { frontmatter, body } = FrontmatterService.readProjectReadme(project.fullPath);

    const existingCopy = frontmatter.copywriting || {};
    const updatedCopy = {
      ...existingCopy,
      ...copyData,
      lastUpdated: new Date().toISOString(),
      updatedBy: actor
    };

    const updatedFm = {
      ...frontmatter,
      copywriting: updatedCopy
    };

    FrontmatterService.writeProjectReadme(project.fullPath, updatedFm, body);

    AuditService.logEvent({
      actor,
      role,
      action: 'COPYWRITING_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id,
      details: {
        stage: updatedCopy.status || 'draft',
        headline: updatedCopy.headline || ''
      }
    });

    WorkspaceService.scan();

    return {
      success: true,
      copywriting: updatedCopy
    };
  }
}

module.exports = CopywritingService;
