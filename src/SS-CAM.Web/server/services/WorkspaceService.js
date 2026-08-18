const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const config = require('../config');
const FrontmatterService = require('./FrontmatterService');
const AuditService = require('./AuditService');

const PROJECT_DIR_REGEX = /^(\d{6})_([A-Za-z0-9]+)(?:_([A-Za-z0-9]+))?(?:_(.+))?$/;

class WorkspaceService {
  constructor() {
    this.workspaceRoot = config.WORKSPACE_ROOT;
    this.projectsCache = [];
    this.lastScanTime = null;
    this.isScanning = false;
    this.watcher = null;

    this.init();
  }

  init() {
    this.ensureWorkspace();
    this.scan();
    this.startWatcher();
  }

  ensureWorkspace() {
    if (!fs.existsSync(this.workspaceRoot)) {
      try {
        fs.mkdirSync(this.workspaceRoot, { recursive: true });
        console.log(`[WorkspaceService] Created workspace root at: ${this.workspaceRoot}`);
        if (process.env.SEED_SAMPLES === 'true') {
          this.seedSampleProjects();
        }
      } catch (err) {
        console.error(`[WorkspaceService] Could not create workspace root: ${err.message}`);
      }
    } else {
      if (process.env.SEED_SAMPLES === 'true') {
        try {
          const items = fs.readdirSync(this.workspaceRoot);
          const hasProjects = items.some(item => !item.startsWith('.') && !item.startsWith('_'));
          if (!hasProjects) {
            this.seedSampleProjects();
          }
        } catch (e) {
          console.warn(`[WorkspaceService] Check workspace items warning:`, e.message);
        }
      }
    }
  }

  seedSampleProjects() {
    console.log('[WorkspaceService] Seeding sample Creative-Team project folders...');
    const samples = [
      {
        designer: '0001D',
        designerName: 'Ahmad Faiz',
        year: '2026',
        month: '202608_August',
        folder: '202608_0085D_SS_Rejal_Premium_Packaging',
        title: 'Rejal Premium Packaging & POSM Kit',
        brand: 'SS',
        jobId: '0085D',
        status: 'review',
        priority: 'urgent',
        deadline: '2026-08-25',
        created: '2026-08-10',
        department: 'Marketing',
        manager: 'MGR01',
        revision: 1,
        tags: ['packaging', 'posm', 'print', 'rejal'],
        tone: 'Premium, Masculine, Luxury Gold & Midnight Blue',
        messaging: 'Definisi Kejantanan Sebenar & Tenaga Luar Biasa',
        copyStatus: 'approved',
        headline: 'Sentuhan Kemewahan Untuk Lelaki Berprestasi',
        copyBody: 'Formula herba warisan dengan sentuhan saintifik moden. Memberikan ketahanan dan stamina berpanjangan.',
        deliverables: [
          { name: 'Rejal_Box_3D_Mockup_V1.png', folder: 'Artwork Mockup', type: 'mockup' },
          { name: 'Rejal_Packaging_Dieline_Final.pdf', folder: 'Production', type: 'print' },
          { name: 'POSM_Counter_Display_1080.png', folder: 'Production', type: 'web' }
        ]
      },
      {
        designer: '0002S',
        designerName: 'Siti Sarah',
        year: '2026',
        month: '202608_August',
        folder: '202608_0086S_SSE_Merdeka_Flash_Sale',
        title: 'Merdeka Big Sale Social Campaign',
        brand: 'SSE',
        jobId: '0086S',
        status: 'revision',
        priority: 'high',
        deadline: '2026-08-28',
        created: '2026-08-12',
        department: 'E-Commerce',
        manager: 'MGR01',
        revision: 2,
        tags: ['social', 'merdeka', 'tiktok', 'instagram'],
        tone: 'High Energy, Patriotic, Flash Deal Urgency',
        messaging: 'Potongan Sehingga 67% Sempena Kemerdekaan!',
        copyStatus: 'revision_requested',
        headline: 'Merdeka Dari Keletihan! Tawaran Terhad 3 Hari Sahaja',
        copyBody: 'Jangan lepaskan peluang miliki set kombo SuamiSihat dengan diskaun luar biasa.',
        deliverables: [
          { name: 'Merdeka_IG_Carousel_1080x1080.png', folder: 'Production', type: 'social' },
          { name: 'TikTok_9x16_Story_Ad.png', folder: 'Artwork Mockup', type: 'social' }
        ]
      },
      {
        designer: '0003V',
        designerName: 'Danial Hakim',
        year: '2026',
        month: '202608_August',
        folder: '202608_0087V_SSH_Corporate_Documentary',
        title: 'SuamiSihat Holdings Corporate Profile Video',
        brand: 'SSH',
        jobId: '0087V',
        status: 'in-progress',
        priority: 'medium',
        deadline: '2026-09-15',
        created: '2026-08-05',
        department: 'Corporate Communications',
        manager: 'MGR02',
        revision: 0,
        tags: ['video', 'corporate', 'documentary'],
        tone: 'Inspirational, Trustworthy, Modern Healthcare Leadership',
        messaging: 'Membina Generasi Keluarga Sejahtera & Bahagia',
        copyStatus: 'submitted',
        headline: 'Perjalanan 10 Tahun Memacu Kesihatan Lelaki Malaysia',
        copyBody: 'Daripada permulaan sederhana hingga menjadi peneraju utama penjagaan kesejahteraan lelaki di Asia Tenggara.',
        deliverables: [
          { name: 'Storyboard_V1_Draft.pdf', folder: 'Artwork Mockup', type: 'pdf' }
        ]
      },
      {
        designer: '0001D',
        designerName: 'Ahmad Faiz',
        year: '2026',
        month: '202607_July',
        folder: '202607_0079P_SSW_Wellness_Centre_Signage',
        title: 'SS Wellness Centre Outdoor Signage & Wall Graphics',
        brand: 'SSW',
        jobId: '0079P',
        status: 'done',
        priority: 'medium',
        deadline: '2026-08-01',
        created: '2026-07-15',
        department: 'Retail & Facilities',
        manager: 'MGR01',
        revision: 1,
        tags: ['branding', 'interior', 'signage'],
        tone: 'Serene, Clean, Holistic Healing',
        messaging: 'Pusat Rawatan Holistik Kesejahteraan Lelaki',
        copyStatus: 'approved',
        headline: 'Selamat Datang Ke Pusat Pemulihan Tenaga & Kesihatan',
        copyBody: 'Rawatan profesional privasi tinggi untuk kesejahteraan fizikal dan mental.',
        deliverables: [
          { name: 'Entrance_3D_Wall_Signage.pdf', folder: 'Production', type: 'print' },
          { name: 'Reception_Lightbox_Graphic.png', folder: 'Production', type: 'print' }
        ]
      },
      {
        designer: '0004D',
        designerName: 'Nurul Huda',
        year: '2026',
        month: '202608_August',
        folder: '202608_0088D_SSC_Prostate_Health_Infographic',
        title: 'Prostate Health Awareness Infographic Guide',
        brand: 'SSC',
        jobId: '0088D',
        status: 'backlog',
        priority: 'low',
        deadline: '2026-09-30',
        created: '2026-08-16',
        department: 'Medical & Content',
        manager: 'MGR02',
        revision: 0,
        tags: ['medical', 'infographic', 'education'],
        tone: 'Educational, Empathic, Clear',
        messaging: '5 Tanda Awal Kesihatan Prostat Yang Perlu Anda Tahu',
        copyStatus: 'draft',
        headline: 'Cegah Sebelum Parah: Panduan Kesihatan Prostat Lelaki 35+',
        copyBody: 'Ketahui langkah mudah menjaga kelenjar prostat melalui nutrisi dan gaya hidup sihat.',
        deliverables: []
      }
    ];

    for (const s of samples) {
      const projDir = path.join(this.workspaceRoot, s.designer, `SS-${s.year}`, s.month, s.folder);
      fs.mkdirSync(projDir, { recursive: true });

      // Create standard sub-folders
      const subFolders = ['Artwork Design', 'Artwork Mockup', 'Assets', 'Production', 'Copywriting'];
      subFolders.forEach(sub => fs.mkdirSync(path.join(projDir, sub), { recursive: true }));

      // Create mock deliverables
      for (const d of s.deliverables) {
        const filePath = path.join(projDir, d.folder, d.name);
        if (!fs.existsSync(filePath)) {
          // Write dummy placeholder image or pdf content
          fs.writeFileSync(filePath, `SS-CAM Deliverable Placeholder: ${d.name}\nProject: ${s.title}\nDate: ${new Date().toISOString()}`);
        }
      }

      // Write README.md with Frontmatter
      const fm = {
        status: s.status,
        designer: s.designer,
        client: s.brand,
        deadline: s.deadline,
        created: s.created,
        priority: s.priority,
        duration: '3 days',
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

      const body = `# ${s.title}\n\n## Project Objective\nProvide high-impact marketing and brand assets for SuamiSihat's ${s.department} initiatives.\n\n## Target Audience\nMen aged 25-55 looking for vitality, health, and holistic performance.\n\n## Core Deliverables\n- Master high-res vectors and editable files\n- Presentation mockups for management review\n- Final print and web exports\n`;

      FrontmatterService.writeProjectReadme(projDir, fm, body);
    }

    console.log('[WorkspaceService] Seeded 5 sample projects successfully.');
  }

  startWatcher() {
    if (this.watcher) return;

    try {
      this.watcher = chokidar.watch(this.workspaceRoot, {
        ignored: /(^|[\/\\])\..|node_modules/,
        persistent: true,
        ignoreInitial: true,
        depth: 5
      });

      let debounceTimer = null;
      const triggerRescan = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.scan();
        }, 500);
      };

      this.watcher
        .on('add', triggerRescan)
        .on('change', triggerRescan)
        .on('unlink', triggerRescan)
        .on('addDir', triggerRescan)
        .on('unlinkDir', triggerRescan);

      console.log(`[WorkspaceService] File watcher active on: ${this.workspaceRoot}`);
    } catch (err) {
      console.warn(`[WorkspaceService] Watcher setup error:`, err.message);
    }
  }

  scan(force = false) {
    if (this.isScanning && !force) return;
    this.isScanning = true;

    try {
      const results = [];
      this.scanDirectory(this.workspaceRoot, results);
      this.projectsCache = results;
      this.lastScanTime = new Date();
      // console.log(`[WorkspaceService] Scan complete. Found ${results.length} projects.`);
    } catch (err) {
      console.error('[WorkspaceService] Scan error:', err.message);
    } finally {
      this.isScanning = false;
    }
  }

  scanDirectory(dir, results) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_') || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const isMonthFolder = /^\d{6}_(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(entry.name);
        const match = !isMonthFolder ? PROJECT_DIR_REGEX.exec(entry.name) : null;
        if (match && match[4]) {
          // This is a project directory
          const project = this.buildProjectItem(entry.name, fullPath, match);
          results.push(project);
        } else {
          // Recurse into subdirectories (e.g. year, month, or category folders)
          this.scanDirectory(fullPath, results);
        }
      }
    }
  }

  buildProjectItem(folderName, fullPath, regexMatch) {
    const dateCode = regexMatch[1]; // e.g. 202608
    const jobRaw = regexMatch[2];   // e.g. 0085D
    const brandRaw = regexMatch[3] || 'SS';
    const titleRaw = regexMatch[4] || folderName;

    // Detect preset type from Job ID letter suffix (D, S, V, P)
    let presetType = 'Graphic / Print';
    let presetCode = 'D';
    if (/[A-Za-z]$/.test(jobRaw)) {
      presetCode = jobRaw.slice(-1).toUpperCase();
      if (presetCode === 'S') presetType = 'Social Media';
      else if (presetCode === 'V') presetType = 'Video';
      else if (presetCode === 'P') presetType = 'Brand Identity';
    }

    // Read README.md + Frontmatter
    const { frontmatter, body, versionHash } = FrontmatterService.readProjectReadme(fullPath);

    // Compute status
    const status = frontmatter.status || 'backlog';
    const priority = frontmatter.priority || 'medium';
    const designer = frontmatter.designer || this.extractDesignerFromPath(fullPath);
    const deadline = frontmatter.deadline || '';
    const created = frontmatter.created || this.inferCreatedDate(folderName, fullPath);

    // Count deliverables in subfolders
    const deliverableCount = this.countFiles(path.join(fullPath, 'Production')) + 
                             this.countFiles(path.join(fullPath, 'Artwork Mockup'));

    // Check overdue
    let isOverdue = false;
    let daysRemaining = null;
    if (deadline && status !== 'done') {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      daysRemaining = diffDays;
      if (diffDays < 0) isOverdue = true;
    }

    return {
      id: folderName,
      folderName,
      fullPath,
      dateCode,
      jobId: jobRaw,
      presetCode,
      presetType,
      brand: brandRaw.toUpperCase(),
      title: titleRaw.replace(/_/g, ' '),
      status,
      priority,
      designer,
      manager: frontmatter.manager || 'Unassigned',
      department: frontmatter.department || 'General',
      created,
      deadline,
      duration: frontmatter.duration || '',
      revision: frontmatter.revision || 0,
      tags: frontmatter.tags || [],
      isOverdue,
      daysRemaining,
      deliverableCount,
      creativeDirection: frontmatter.creative_direction || {},
      copywriting: frontmatter.copywriting || { status: 'draft' },
      approvals: frontmatter.approvals || [],
      versionHash,
      briefMarkdown: body || ''
    };
  }

  countFiles(dir) {
    if (!fs.existsSync(dir)) return 0;
    try {
      return fs.readdirSync(dir).filter(f => !f.startsWith('.')).length;
    } catch (e) {
      return 0;
    }
  }

  extractDesignerFromPath(fullPath) {
    try {
      const relative = path.relative(this.workspaceRoot, fullPath);
      const parts = relative.split(path.sep);
      if (parts.length > 0 && !parts[0].startsWith('SS-') && !/^\d{6}/.test(parts[0])) {
        return parts[0];
      }
    } catch (e) {}
    return '0001D';
  }

  inferCreatedDate(folderName, fullPath) {
    if (folderName && folderName.length >= 6) {
      const y = folderName.substring(0, 4);
      const m = folderName.substring(4, 6);
      return `${y}-${m}-01`;
    }
    return new Date().toISOString().substring(0, 10);
  }

  getAllProjects({ query, status, brand, designer, priority, department, isOverdue } = {}) {
    let list = [...this.projectsCache];

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.jobId.toLowerCase().includes(q) ||
        p.folderName.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.designer.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'all') {
      list = list.filter(p => p.status.toLowerCase() === status.toLowerCase());
    }

    if (brand && brand !== 'all') {
      list = list.filter(p => p.brand.toUpperCase() === brand.toUpperCase());
    }

    if (designer && designer !== 'all') {
      list = list.filter(p => p.designer.toLowerCase() === designer.toLowerCase());
    }

    if (priority && priority !== 'all') {
      list = list.filter(p => p.priority.toLowerCase() === priority.toLowerCase());
    }

    if (department && department !== 'all') {
      list = list.filter(p => p.department.toLowerCase() === department.toLowerCase());
    }

    if (isOverdue === true || isOverdue === 'true') {
      list = list.filter(p => p.isOverdue);
    }

    // Default sort: newest / highest priority first
    list.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
    return list;
  }

  getProjectById(id) {
    if (!id) return null;
    const target = id.trim().toLowerCase();
    return this.projectsCache.find(p => 
      (p.id && p.id.toLowerCase() === target) ||
      (p.folderName && p.folderName.toLowerCase() === target) ||
      (p.jobId && p.jobId.toLowerCase() === target)
    ) || null;
  }

  getDashboardMetrics() {
    const projects = this.projectsCache;
    const total = projects.length;
    const active = projects.filter(p => ['in-progress', 'review', 'revision'].includes(p.status)).length;
    const pendingReview = projects.filter(p => p.status === 'review').length;
    const pendingApproval = projects.filter(p => p.status === 'approved' || (p.status === 'review' && p.revision > 0)).length;
    const revisionRequired = projects.filter(p => p.status === 'revision').length;
    const completed = projects.filter(p => p.status === 'done').length;
    const overdue = projects.filter(p => p.isOverdue).length;

    // Pipeline breakdown
    const pipeline = {
      backlog: projects.filter(p => p.status === 'backlog').length,
      inProgress: projects.filter(p => p.status === 'in-progress').length,
      review: projects.filter(p => p.status === 'review').length,
      revision: projects.filter(p => p.status === 'revision').length,
      approved: projects.filter(p => p.status === 'approved').length,
      done: completed
    };

    // Sub-brand distribution
    const brandCounts = {};
    projects.forEach(p => {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    });

    // Preset type distribution
    const typeCounts = {};
    projects.forEach(p => {
      typeCounts[p.presetType] = (typeCounts[p.presetType] || 0) + 1;
    });

    // Designer workload
    const designerMap = {};
    projects.forEach(p => {
      const d = p.designer || 'Unassigned';
      if (!designerMap[d]) {
        designerMap[d] = {
          designer: d,
          total: 0,
          active: 0,
          inProgress: 0,
          inReview: 0,
          revision: 0,
          overdue: 0,
          completed: 0
        };
      }
      designerMap[d].total++;
      if (['in-progress', 'review', 'revision'].includes(p.status)) designerMap[d].active++;
      if (p.status === 'in-progress') designerMap[d].inProgress++;
      if (p.status === 'review') designerMap[d].inReview++;
      if (p.status === 'revision') designerMap[d].revision++;
      if (p.status === 'done') designerMap[d].completed++;
      if (p.isOverdue) designerMap[d].overdue++;
    });

    const designerWorkload = Object.values(designerMap).sort((a, b) => b.active - a.active);

    return {
      kpis: {
        total,
        active,
        pendingReview,
        pendingApproval,
        revisionRequired,
        completed,
        overdue
      },
      pipeline,
      brandDistribution: brandCounts,
      typeDistribution: typeCounts,
      designerWorkload,
      recentProjects: projects.slice(0, 6)
    };
  }

  /**
   * Deletes a project folder and all subfolders recursively.
   * Admin-only operation with strict path validation and audit logging.
   * @param {string} projectId Project folder name or Job ID
   * @param {string} actorName Performing user name
   * @param {string} actorRole Performing user role
   */
  deleteProject(projectId, actorName = 'Admin', actorRole = 'Administrator') {
    const project = this.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found.`);
    }

    const fullPath = path.resolve(project.fullPath);
    const resolvedRoot = path.resolve(this.workspaceRoot);

    // Security check: Must reside within workspace root
    if (!fullPath.startsWith(resolvedRoot) || fullPath === resolvedRoot) {
      throw new Error('Unauthorized project deletion: target path is outside workspace boundaries.');
    }

    // Security check: Never delete system or hidden root folders
    const baseName = path.basename(fullPath);
    if (baseName === '_Team' || baseName === '#recycle' || baseName.startsWith('.')) {
      throw new Error(`Cannot delete protected system directory: ${baseName}`);
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Project directory does not exist: ${fullPath}`);
    }

    // Robust recursive deletion handling readonly and deep subfolders
    const deleteRecursive = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const itemPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          deleteRecursive(itemPath);
        } else {
          try { fs.chmodSync(itemPath, 0o666); } catch (e) {}
          try { fs.unlinkSync(itemPath); } catch (e) {}
        }
      }
      try {
        fs.rmdirSync(dir);
      } catch (e) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e2) {}
      }
    };

    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } catch (e) {
      deleteRecursive(fullPath);
    }

    if (fs.existsSync(fullPath)) {
      try { deleteRecursive(fullPath); } catch (e) {}
    }

    // Audit log
    AuditService.logEvent({
      actor: actorName,
      role: actorRole,
      action: 'PROJECT_DELETED',
      entityType: 'Project',
      entityId: project.jobId || project.id,
      details: {
        title: project.title,
        folderName: project.id,
        path: project.fullPath,
        timestamp: new Date().toISOString()
      }
    });

    // Rescan cache
    this.scan();

    return {
      success: true,
      message: `Project ${project.jobId || project.title} and all subfolders deleted successfully.`,
      projectId: project.id
    };
  }
}

module.exports = new WorkspaceService();
