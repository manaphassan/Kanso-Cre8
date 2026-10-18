const fs = require('fs');
const path = require('path');
const config = require('../config');
const FrontmatterService = require('./FrontmatterService');
const AuditService = require('./AuditService');
const VaultPathService = require('./VaultPathService');

class ScaffoldService {
  seedSampleProjects() {
    console.log('[ScaffoldService] Seeding sample Kanso Cre8 project vaults...');
    const samples = [
      {
        designer: 'alex.mercer',
        designerName: 'Alex Mercer',
        year: '2026',
        month: '202609_September',
        folder: '202609_0001D_ACME_MobileAppIllustration',
        title: 'Mobile Banking 3D Isometric Illustrations',
        brand: 'ACME',
        jobId: '0001D',
        status: 'in-progress',
        priority: 'high',
        deadline: '2026-09-23',
        created: '2026-09-01',
        department: 'Product Design',
        manager: 'Lead Designer',
        revision: 1,
        tags: ['illustration', '3d', 'fintech', 'mobile'],
        tone: 'Trustworthy, Modern, Electric Blue Fintech',
        messaging: 'Seamless Digital Banking Experience with 3D Visual Depth',
        copyStatus: 'approved',
        headline: 'Next-Gen Mobile Banking Visualization',
        copyBody: 'High-fidelity isometric compositions highlighting contactless payments, automated savings, and biometric vault security.',
        deliverables: [
          { name: 'Mobile_Banking_Hero_3D.png', folder: '05_DELIVERABLES', type: 'mockup' },
          { name: 'Isometric_Icons_16x_Set.svg', folder: '05_DELIVERABLES', type: 'vector' },
          { name: 'Card_Design_Preview_WIP.png', folder: '04_WIP', type: 'web' }
        ]
      },
      {
        designer: 'alex.mercer',
        designerName: 'Alex Mercer',
        year: '2026',
        month: '202609_September',
        folder: '202609_0002S_NEX_GameKeyVisual',
        title: 'Key Visual Concept Artwork & Launch Assets',
        brand: 'NEX',
        jobId: '0002S',
        status: 'review',
        priority: 'urgent',
        deadline: '2026-09-18',
        created: '2026-09-02',
        department: 'Gaming Studio',
        manager: 'Art Director',
        revision: 2,
        tags: ['gaming', 'keyvisual', 'motion', 'social'],
        tone: 'Cyberpunk, High Contrast, Emerald & Neon Sky',
        messaging: 'Enter the Frontier: Next-Gen Multiplayer Battle Arena',
        copyStatus: 'approved',
        headline: 'Gear Up For The Global Arena Launch',
        copyBody: 'Dynamic theatrical key art optimized for multi-platform digital store banners, 9:16 reels, and launch promo cards.',
        deliverables: [
          { name: 'Nexus_KeyVisual_4K_Final.png', folder: '05_DELIVERABLES', type: 'keyvisual' },
          { name: 'Launch_Promo_Reel_9x16.mp4', folder: '05_DELIVERABLES', type: 'video' },
          { name: 'Character_Concept_Draft.png', folder: '04_WIP', type: 'wip' }
        ]
      },
      {
        designer: 'alex.mercer',
        designerName: 'Alex Mercer',
        year: '2026',
        month: '202609_September',
        folder: '202609_0003P_LUM_BrandIdentity',
        title: 'Synthetic Intelligence Brand System & UI Guidelines',
        brand: 'LUM',
        jobId: '0003P',
        status: 'backlog',
        priority: 'normal',
        deadline: '2026-09-30',
        created: '2026-09-05',
        department: 'Brand Systems',
        manager: 'Creative Lead',
        revision: 0,
        tags: ['branding', 'design-system', 'tokens', 'ai'],
        tone: 'Minimalist, Intelligent, Luminescent Violet & Slate',
        messaging: 'Clarity in Artificial Intelligence Architecture',
        copyStatus: 'draft',
        headline: 'A Refined Visual Language for Machine Learning',
        copyBody: 'Comprehensive design tokens, typography scales, vector glyph systems, and dark-mode first design tokens.',
        deliverables: [
          { name: 'Lumina_Design_Token_Specs.pdf', folder: '01_BRIEF', type: 'doc' }
        ]
      }
    ];

    const wsRoot = VaultPathService.workspaceRoot;
    for (const s of samples) {
      const projectsBase = fs.existsSync(path.join(wsRoot, '_Projects'))
        ? path.join(wsRoot, '_Projects')
        : wsRoot;
      const projDir = path.join(projectsBase, s.year, s.folder);
      fs.mkdirSync(projDir, { recursive: true });

      const subFolders = ['01_BRIEF', '02_SOURCE', '03_COPY', '04_WIP', '05_DELIVERABLES'];
      subFolders.forEach(sub => fs.mkdirSync(path.join(projDir, sub), { recursive: true }));

      for (const d of s.deliverables) {
        const filePath = path.join(projDir, d.folder, d.name);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, `Kanso Cre8 Deliverable: ${d.name}\nProject: ${s.title}\nClient: ${s.brand}\nDate: ${new Date().toISOString()}`);
        }
      }

      const copyPath = path.join(projDir, '03_COPY', 'COPY.md');
      if (!fs.existsSync(copyPath)) {
        fs.writeFileSync(copyPath, `# ${s.title}\n**Client**: ${s.brand}\n**Status**: ${s.copyStatus}\n\n## Headline\n${s.headline}\n\n## Body Copy\n${s.copyBody}\n`, 'utf8');
      }

      const fm = {
        status: s.status,
        designer: s.designer,
        client: s.brand,
        deadline: s.deadline,
        created: s.created,
        priority: s.priority,
        duration: '2 weeks',
        tags: s.tags,
        revision: s.revision,
        department: s.department,
        manager: s.manager,
        creative_direction: {
          tone: s.tone,
          key_messaging: s.messaging
        },
        copywriting: {
          status: s.copyStatus,
          headline: s.headline,
          body_copy: s.copyBody
        }
      };

      const body = `# ${s.title}\n\n## Project Objective\nDeliver high-impact visual design and production collateral for ${s.brand}.\n\n## Core Deliverables\n- Master high-res vectors and source design files in \`02_SOURCE/\`\n- Review exports and renders in \`04_WIP/\`\n- Client-ready delivery assets in \`05_DELIVERABLES/\`\n\n## Sprint Checklist\n- [ ] #task Review client brief and references in 01_BRIEF/ due: ${s.deadline} priority: normal\n- [ ] #task Prepare design source files in 02_SOURCE/\n- [ ] #task Finalize copy and messaging in 03_COPY/\n- [ ] #task Export review renders to 04_WIP/\n- [ ] #task Deliver approved assets in 05_DELIVERABLES/\n`;

      FrontmatterService.writeProjectReadme(projDir, fm, body);
    }

    console.log('[ScaffoldService] Seeded Kanso Cre8 sample vaults successfully.');
  }

  scaffoldProject(options, actor = 'alex.mercer') {
    const ProjectService = require('./ProjectService');
    const title = (options.title || 'Untitled Project').trim();
    const clientCode = (options.clientCode || 'ACME').toUpperCase().trim();
    const clientName = options.clientName || clientCode;
    const now = new Date();
    const year = options.year || String(now.getFullYear());
    const monthCode = options.month || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let jobId = options.jobId;
    if (!jobId) {
      const existingCount = ProjectService.projectsCache.length;
      const letter = options.deliverableType === 'Social Media' ? 'S' :
                     options.deliverableType === 'Video' ? 'V' :
                     options.deliverableType === 'Brand Identity' ? 'P' : 'D';
      jobId = `${String(existingCount + 1).padStart(4, '0')}${letter}`;
    }

    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Creative_Project';
    const folderName = `${monthCode}_${jobId}_${clientCode}_${sanitizedTitle}`;

    const wsRoot = VaultPathService.workspaceRoot;
    const projectsBase = fs.existsSync(path.join(wsRoot, '_Projects'))
      ? path.join(wsRoot, '_Projects')
      : (fs.existsSync(path.join(wsRoot, year)) ? wsRoot : path.join(wsRoot, '_Projects'));
    const targetDir = path.join(projectsBase, year, folderName);
    if (fs.existsSync(targetDir)) {
      throw new Error(`Project folder "${folderName}" already exists.`);
    }

    fs.mkdirSync(targetDir, { recursive: true });

    const subFolders = ['01_BRIEF', '02_SOURCE', '03_COPY', '04_WIP', '05_DELIVERABLES'];
    subFolders.forEach(sub => fs.mkdirSync(path.join(targetDir, sub), { recursive: true }));

    const copyMdPath = path.join(targetDir, '03_COPY', 'COPY.md');
    const initialCopy = `# ${title}\n**Client**: ${clientName} (${clientCode})\n**Status**: Draft\n\n## Hook & Value Proposition\n- Hook: Engaging headline for ${title}\n- Core value proposition\n\n## Body Copy & Messaging\nDetailed creative copy, specifications, and call-to-action.\n`;
    fs.writeFileSync(copyMdPath, initialCopy, 'utf8');

    const deadline = options.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const priority = options.priority || 'normal';
    const designer = options.designer || 'alex.mercer';
    const budget = Number(options.budget) || 0;
    const currency = options.currency || 'USD';

    const fm = {
      status: options.status || 'in-progress',
      priority,
      designer,
      client: clientCode,
      brand: clientCode,
      client_name: clientName,
      deadline,
      created: now.toISOString().split('T')[0],
      budget,
      currency,
      revision: 0,
      tags: ['design', clientCode.toLowerCase(), (options.deliverableType || 'creative').toLowerCase().replace(/\s+/g, '-')],
      creative_direction: {
        tone: options.tone || 'Modern, minimal, high-impact',
        key_messaging: options.description || title
      },
      copywriting: {
        status: 'draft',
        headline: title,
        body_copy: ''
      },
      ...(options.linkedQuoteId ? { linkedQuoteId: options.linkedQuoteId } : {}),
      ...(options.linkedInvoiceId ? { linkedInvoiceId: options.linkedInvoiceId } : {})
    };

    const readmeBody = `# ${title}\n\n> [!NOTE]\n> ${options.description || 'Standardized 5-folder creative project vault.'}\n\n## Sprint Checklist\n- [ ] #task Review client brief and vector assets in 01_BRIEF/ due: ${deadline} priority: normal\n- [ ] #task Prepare master design source files in 02_SOURCE/\n- [ ] #task Compose hooks and copywriting in 03_COPY/\n- [ ] #task Export review renders to 04_WIP/\n- [ ] #task Package final deliverables in 05_DELIVERABLES/\n`;

    FrontmatterService.writeProjectReadme(targetDir, fm, readmeBody);

    AuditService.logEvent({
      actor,
      action: 'PROJECT_SCAFFOLDED',
      entityType: 'Project',
      entityId: jobId,
      details: { folderName, clientCode, title, deadline }
    });

    ProjectService.scan(true);
    try {
      const SseService = require('./SseService');
      SseService.broadcast('workspace:updated', {
        projectId: folderName,
        action: 'created',
        timestamp: new Date().toISOString()
      });
    } catch (e) {}

    return {
      success: true,
      folderName,
      targetDir,
      project: ProjectService.getProjectById(folderName) || { id: folderName, title, folderName, fullPath: targetDir, targetDir }
    };
  }

  ingestFile(projectId, targetSubfolder, filename, base64Data, actor = 'Designer') {
    const ProjectService = require('./ProjectService');
    const project = ProjectService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found in workspace.`);
    }

    const validSubfolders = [
      '01_BRIEF', '01_BRIEF_ASSETS',
      '02_SOURCE', '02_SOURCE_FILES',
      '03_COPY',
      '04_WIP', '04_WORK_IN_PROGRESS',
      '05_DELIVERABLES'
    ];
    const safeSubfolder = validSubfolders.includes(targetSubfolder) ? targetSubfolder : '01_BRIEF';

    const targetDir = path.join(project.fullPath, safeSubfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetFilePath = path.join(targetDir, safeFilename);

    const buffer = Buffer.isBuffer(base64Data) 
      ? base64Data 
      : Buffer.from(base64Data.replace(/^data:.*?;base64,/, ''), 'base64');

    fs.writeFileSync(targetFilePath, buffer);

    AuditService.logEvent({
      actor,
      action: 'FILE_INGESTED',
      entityType: 'Deliverable',
      entityId: project.jobId || project.id,
      details: {
        filename: safeFilename,
        subfolder: safeSubfolder,
        sizeBytes: buffer.length,
        timestamp: new Date().toISOString()
      }
    });

    try {
      const SseService = require('./SseService');
      SseService.broadcast('workspace:updated', {
        projectId: project.id,
        filename: safeFilename,
        folder: safeSubfolder,
        timestamp: new Date().toISOString()
      });
    } catch (e) {}

    return {
      success: true,
      filename: safeFilename,
      folder: safeSubfolder,
      sizeBytes: buffer.length,
      relPath: path.relative(VaultPathService.workspaceRoot, targetFilePath).replace(/\\/g, '/')
    };
  }
}

module.exports = new ScaffoldService();
