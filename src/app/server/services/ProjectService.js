const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const config = require('../config');
const FrontmatterService = require('./FrontmatterService');
const AuditService = require('./AuditService');
const VaultPathService = require('./VaultPathService');

const PROJECT_DIR_REGEX = /^(\d{6})_([A-Za-z0-9]+)(?:_([A-Za-z0-9]+))?(?:_(.+))?$/;

class ProjectService {
  constructor() {
    this.projectsCache = [];
    this.lastScanTime = null;
    this.isScanning = false;
    this.watcher = null;
  }

  get workspaceRoot() {
    return VaultPathService.workspaceRoot;
  }

  set workspaceRoot(newPath) {
    VaultPathService.workspaceRoot = newPath;
  }

  init() {
    VaultPathService.ensureWorkspace();
    VaultPathService.migrateVault();
    this.scan();
    this.startWatcher();
  }

  startWatcher() {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch (e) {}
      this.watcher = null;
    }

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

      console.log(`[ProjectService] File watcher active on: ${this.workspaceRoot}`);
    } catch (err) {
      console.warn(`[ProjectService] Watcher setup error:`, err.message);
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
      const SseService = require('./SseService');
      SseService.broadcast('workspace:updated', {
        count: results.length,
        timestamp: this.lastScanTime.toISOString()
      });
    } catch (err) {
      console.error('[ProjectService] Scan error:', err.message);
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
      if (entry.name.startsWith('.') || (entry.name.startsWith('_') && entry.name !== '_Projects') || entry.name.startsWith('#') || entry.name.startsWith('@') || entry.name === 'node_modules' || entry.name === '$RECYCLE.BIN') {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const isMonthFolder = /^\d{6}_(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(entry.name);
        const match = !isMonthFolder ? PROJECT_DIR_REGEX.exec(entry.name) : null;
        if (match && match[4]) {
          const project = this.buildProjectItem(entry.name, fullPath, match);
          results.push(project);
        } else {
          this.scanDirectory(fullPath, results);
        }
      }
    }
  }

  buildProjectItem(folderName, fullPath, regexMatch) {
    const dateCode = regexMatch[1];
    const jobRaw = regexMatch[2];
    const brandRaw = regexMatch[3] || 'SS';
    const titleRaw = regexMatch[4] || folderName;

    let presetType = 'Graphic / Print';
    let presetCode = 'D';
    if (/[A-Za-z]$/.test(jobRaw)) {
      presetCode = jobRaw.slice(-1).toUpperCase();
      if (presetCode === 'S') presetType = 'Social Media';
      else if (presetCode === 'V') presetType = 'Video';
      else if (presetCode === 'P') presetType = 'Brand Identity';
    }

    const { frontmatter, body, versionHash } = FrontmatterService.readProjectReadme(fullPath);

    const status = frontmatter.status || 'backlog';
    const priority = frontmatter.priority || 'medium';
    const designer = frontmatter.designer || VaultPathService.extractDesignerFromPath(fullPath);
    const deadline = frontmatter.deadline || '';
    const created = frontmatter.created || VaultPathService.inferCreatedDate(folderName, fullPath);

    const deliverableCount = VaultPathService.countFiles(path.join(fullPath, '05_DELIVERABLES')) +
                             VaultPathService.countFiles(path.join(fullPath, '04_WIP')) +
                             VaultPathService.countFiles(path.join(fullPath, '04_WORK_IN_PROGRESS'));

    let isOverdue = false;
    let isDueSoon = false;
    let daysRemaining = null;
    if (deadline && status !== 'done' && status !== 'approved') {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
      daysRemaining = diffDays;
      if (diffDays < 0) {
        isOverdue = true;
      } else if (diffDays <= 2) {
        isDueSoon = true;
      }
    }

    let completedAt = frontmatter.completedAt || null;
    if (!completedAt && (status === 'done' || status === 'approved')) {
      if (Array.isArray(frontmatter.approvals) && frontmatter.approvals.length > 0) {
        const approvedRecord = frontmatter.approvals.find(a => a.decision === 'approved') || frontmatter.approvals[0];
        if (approvedRecord && approvedRecord.timestamp) {
          completedAt = approvedRecord.timestamp;
        }
      }
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
      completedAt,
      duration: frontmatter.duration || '',
      revision: frontmatter.revision || 0,
      tags: frontmatter.tags || [],
      isOverdue,
      isDueSoon,
      daysRemaining,
      deliverableCount,
      creativeDirection: frontmatter.creative_direction || {},
      copywriting: frontmatter.copywriting || { status: 'draft' },
      approvals: frontmatter.approvals || [],
      versionHash,
      readmeBody: body || '',
      briefMarkdown: body || ''
    };
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

    list.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
    return list;
  }

  getProjectById(id) {
    if (!id) return null;
    let raw = String(id).trim();
    try {
      raw = decodeURIComponent(raw);
    } catch (e) {}

    const target = raw.toLowerCase();
    const targetNormalized = target.replace(/[\s_-]+/g, '_');

    const jobMatch = target.match(/\b(\d{4}[A-Za-z])\b/);
    const targetJobId = jobMatch ? jobMatch[1].toLowerCase() : null;

    const project = this.projectsCache.find(p => {
      if (!p) return false;
      const pId = (p.id || '').toLowerCase();
      const pFolder = (p.folderName || '').toLowerCase();
      const pJob = (p.jobId || '').toLowerCase();

      if (pId === target || pFolder === target || pJob === target) return true;

      const pIdNorm = pId.replace(/[\s_-]+/g, '_');
      const pFolderNorm = pFolder.replace(/[\s_-]+/g, '_');
      if (pIdNorm === targetNormalized || pFolderNorm === targetNormalized) return true;

      if (targetJobId && (pJob === targetJobId || pIdNorm.includes(`_${targetJobId}_`) || pFolderNorm.includes(`_${targetJobId}_`))) return true;

      if (target.length >= 6 && (pFolder.includes(target) || target.includes(pFolder))) return true;

      return false;
    }) || null;

    if (!project) return null;

    if (project.fullPath && fs.existsSync(project.fullPath)) {
      try {
        const { frontmatter, body, versionHash } = FrontmatterService.readProjectReadme(project.fullPath);
        if (frontmatter) {
          if (frontmatter.status) project.status = frontmatter.status;
          if (frontmatter.priority) project.priority = frontmatter.priority;
          if (frontmatter.designer) project.designer = frontmatter.designer;
          project.manager = frontmatter.manager || 'Unassigned';
          if (frontmatter.department) project.department = frontmatter.department;
          if (frontmatter.deadline) project.deadline = frontmatter.deadline;
          if (frontmatter.revision !== undefined) project.revision = frontmatter.revision;
          if (frontmatter.tags) project.tags = frontmatter.tags;
          if (frontmatter.creative_direction) project.creativeDirection = frontmatter.creative_direction;
          if (frontmatter.copywriting) project.copywriting = frontmatter.copywriting;
          if (frontmatter.approvals) project.approvals = frontmatter.approvals;
        }
        project.versionHash = versionHash;
        project.readmeBody = body || '';
        project.briefMarkdown = body || '';
      } catch (err) {
        console.warn(`[ProjectService] Live refresh warning for ${project.id}:`, err.message);
      }
    }

    return project;
  }

  getDashboardMetrics(options = {}) {
    const timeRange = (typeof options === 'string' ? options : (options && options.timeRange)) || 'all';
    const rawBrand = (options && options.brand) ? String(options.brand).trim() : 'all';
    const brandFilter = rawBrand.toUpperCase();

    let allProjects = this.projectsCache;

    if (brandFilter !== 'ALL' && brandFilter !== '') {
      allProjects = allProjects.filter(p => (p.brand || '').toUpperCase() === brandFilter);
    }

    let filteredProjects = allProjects;
    if (timeRange === '30d' || timeRange === '90d') {
      const days = timeRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filteredProjects = allProjects.filter(p => {
        if (['in-progress', 'review', 'revision'].includes(p.status)) return true;
        const createdDate = p.created ? new Date(p.created) : null;
        const completedDate = p.completedAt ? new Date(p.completedAt) : null;
        if (createdDate && !isNaN(createdDate.getTime()) && createdDate >= cutoff) return true;
        if (completedDate && !isNaN(completedDate.getTime()) && completedDate >= cutoff) return true;
        return false;
      });
    }

    const projects = filteredProjects;
    const total = projects.length;
    const active = projects.filter(p => ['in-progress', 'review', 'revision'].includes(p.status)).length;
    const pendingReview = projects.filter(p => p.status === 'review').length;
    const pendingApproval = projects.filter(p => p.status === 'approved' || (p.status === 'review' && p.revision > 0)).length;
    const revisionRequired = projects.filter(p => p.status === 'revision').length;
    const completed = projects.filter(p => p.status === 'done' || p.status === 'approved').length;
    const overdue = projects.filter(p => p.isOverdue).length;
    const dueSoon = projects.filter(p => p.isDueSoon).length;
    const highRevisionProjects = projects
      .filter(p => (p.revision || 0) >= 2 && !['done', 'approved', 'completed', 'on-hold'].includes(p.status))
      .map(p => ({
        id: p.id,
        jobId: p.jobId,
        title: p.title,
        designer: p.designer,
        brand: p.brand,
        revision: p.revision,
        status: p.status,
        priority: p.priority,
        deadline: p.deadline
      }));
    const highRevisionCount = highRevisionProjects.length;

    const pipeline = {
      backlog: projects.filter(p => p.status === 'backlog').length,
      inProgress: projects.filter(p => p.status === 'in-progress').length,
      review: projects.filter(p => p.status === 'review').length,
      revision: projects.filter(p => p.status === 'revision').length,
      approved: projects.filter(p => p.status === 'approved').length,
      done: projects.filter(p => p.status === 'done').length
    };

    const brandCounts = {};
    projects.forEach(p => {
      const b = p.brand || 'SS';
      brandCounts[b] = (brandCounts[b] || 0) + 1;
    });

    const typeCounts = {};
    projects.forEach(p => {
      const t = p.presetType || 'Other';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    let staffRoster = [];
    try {
      const TeamService = require('./TeamService');
      staffRoster = TeamService.getStaffRoster();
    } catch (e) {
      staffRoster = [];
    }

    const isAllowedWorkloadRole = (staffOrName) => {
      if (!staffOrName) return false;
      let role = '';
      let dept = '';
      if (typeof staffOrName === 'object' && staffOrName !== null) {
        role = staffOrName.role || '';
        dept = staffOrName.department || '';
      } else {
        const found = staffRoster.find(s => 
          (s.name && s.name.toLowerCase() === String(staffOrName).toLowerCase()) || 
          (s.staffId && s.staffId.toLowerCase() === String(staffOrName).toLowerCase()) || 
          (s.username && s.username.toLowerCase() === String(staffOrName).toLowerCase())
        );
        if (found) {
          role = found.role || '';
          dept = found.department || '';
        } else {
          if (/^\d{4}[A-Za-z]?$/i.test(String(staffOrName))) return false;
          role = String(staffOrName);
        }
      }
      const r = role.toLowerCase();
      const d = dept.toLowerCase();
      if (r.includes('manager') || r.includes('ceo') || r.includes('chief') ||
          r.includes('head of') || r.includes('executive') || r.includes('director of') ||
          d.includes('executive') || d.includes('management') || d.includes('marketing & sales') ||
          r === 'manager' || r === 'mgr') {
        return false;
      }
      return true;
    };

    const designerMap = {};

    staffRoster.forEach(member => {
      if (member.active !== false && isAllowedWorkloadRole(member)) {
        const d = member.name || member.staffId;
        designerMap[d] = {
          designer: d,
          staffId: member.staffId,
          role: member.role,
          total: 0,
          active: 0,
          inProgress: 0,
          inReview: 0,
          revision: 0,
          overdue: 0,
          completed: 0
        };
      }
    });

    projects.forEach(p => {
      let d = p.designer || 'Unassigned';
      if (!d || d === 'Unassigned' || d === '2026' || /^\d{4}$/.test(d) || /^\d{6}/.test(d) || d.startsWith('#') || d.startsWith('_')) {
        return;
      }

      if (!isAllowedWorkloadRole(d)) {
        return;
      }

      const matched = staffRoster.find(s => 
        (s.name && s.name.toLowerCase() === d.toLowerCase()) || 
        (s.staffId && s.staffId.toLowerCase() === d.toLowerCase()) || 
        (s.username && s.username.toLowerCase() === d.toLowerCase())
      );

      if (matched) {
        d = matched.name;
      } else {
        if (d === '0001D') d = 'Haikal';
        else if (d === '0002S') d = 'Aliff';
        else if (d === '0003V') d = 'Haikal';
        else if (d === '0004D') d = 'Aliff';
        else if (/^\d{4}[A-Za-z]?$/i.test(d)) {
          return;
        }
      }

      if (designerMap[d]) {
        designerMap[d].total++;
        if (['in-progress', 'review', 'revision'].includes(p.status)) designerMap[d].active++;
        if (p.status === 'in-progress') designerMap[d].inProgress++;
        if (p.status === 'review') designerMap[d].inReview++;
        if (p.status === 'revision') designerMap[d].revision++;
        if (p.status === 'done' || p.status === 'approved') designerMap[d].completed++;
        if (p.isOverdue) designerMap[d].overdue++;
      }
    });

    const designerWorkload = Object.values(designerMap).filter(item => isAllowedWorkloadRole(item.designer)).map(item => {
      const active = item.active || 0;
      const capacityPercent = Math.min(100, Math.round((active / 4) * 100));
      let capacityStatus = 'Normal';
      let capacityColor = '#10B981';

      if (active > 4) {
        capacityStatus = 'Overloaded';
        capacityColor = '#EF4444';
      } else if (active === 4) {
        capacityStatus = 'At Capacity';
        capacityColor = '#F97316';
      } else if (active > 2) {
        capacityStatus = 'High Load';
        capacityColor = '#F59E0B';
      } else if (active === 0) {
        capacityStatus = 'Available';
        capacityColor = '#21A1F7';
      }

      const matched = staffRoster.find(s => 
        (s.staffId && s.staffId === item.staffId) || 
        (s.name && s.name.toLowerCase() === (item.designer || '').toLowerCase()) ||
        (s.username && s.username.toLowerCase() === (item.designer || '').toLowerCase())
      );

      return {
        ...item,
        name: matched ? matched.name : item.designer,
        avatar: matched ? (matched.avatar || '') : '',
        avatarColor: matched ? (matched.avatarColor || '#0078D4') : '#0078D4',
        capacityPercent,
        capacityStatus,
        capacityColor
      };
    }).sort((a, b) => b.active - a.active);

    const completedProjects = projects.filter(p => p.status === 'done' || p.status === 'approved');
    let totalTurnaroundDays = 0;
    const turnaroundList = [];
    let zeroRevCount = 0;
    let totalRevisions = 0;

    completedProjects.forEach(p => {
      totalRevisions += (p.revision || 0);
      if ((p.revision || 0) === 0) zeroRevCount++;

      if (p.created) {
        const createdDate = new Date(p.created);
        let finishDate = null;
        if (p.completedAt) {
          finishDate = new Date(p.completedAt);
        } else if (Array.isArray(p.approvals) && p.approvals.length > 0) {
          const appr = p.approvals.find(a => a.decision === 'approved') || p.approvals[0];
          if (appr && appr.timestamp) finishDate = new Date(appr.timestamp);
        } else if (p.deadline) {
          finishDate = new Date(p.deadline);
        }

        if (finishDate && !isNaN(finishDate.getTime()) && !isNaN(createdDate.getTime())) {
          const diffDays = Math.max(0.5, Math.round(((finishDate - createdDate) / (1000 * 60 * 60 * 24)) * 10) / 10);
          totalTurnaroundDays += diffDays;
          turnaroundList.push(diffDays);
        }
      }
    });

    turnaroundList.sort((a, b) => a - b);

    const avgTurnaroundDays = turnaroundList.length > 0 
      ? Number((totalTurnaroundDays / turnaroundList.length).toFixed(1))
      : (completedProjects.length > 0 ? 3.5 : null);

    let medianTurnaroundDays = null;
    let p90TurnaroundDays = null;

    if (turnaroundList.length > 0) {
      const mid = Math.floor(turnaroundList.length / 2);
      medianTurnaroundDays = turnaroundList.length % 2 !== 0 
        ? turnaroundList[mid] 
        : Number(((turnaroundList[mid - 1] + turnaroundList[mid]) / 2).toFixed(1));
      
      const p90Idx = Math.min(turnaroundList.length - 1, Math.floor(turnaroundList.length * 0.9));
      p90TurnaroundDays = Number(turnaroundList[p90Idx].toFixed(1));
    } else if (completedProjects.length > 0) {
      medianTurnaroundDays = 3.0;
      p90TurnaroundDays = 5.5;
    }

    const firstTimeRightPercent = completedProjects.length > 0
      ? Number(((zeroRevCount / completedProjects.length) * 100).toFixed(1))
      : null;

    const avgRevisionCount = completedProjects.length > 0
      ? Number((totalRevisions / completedProjects.length).toFixed(1))
      : null;

    const reviewProjects = projects.filter(p => p.status === 'review');
    let totalReviewWaitDays = 0;
    reviewProjects.forEach(p => {
      let enterDate = p.created ? new Date(p.created) : new Date();
      if (Array.isArray(p.approvals) && p.approvals.length > 0 && p.approvals[0].timestamp) {
        enterDate = new Date(p.approvals[0].timestamp);
      }
      const now = new Date();
      const diff = Math.max(0.1, Math.round(((now - enterDate) / (1000 * 60 * 60 * 24)) * 10) / 10);
      totalReviewWaitDays += diff;
    });
    const avgReviewAgeDays = reviewProjects.length > 0
      ? Number((totalReviewWaitDays / reviewProjects.length).toFixed(1))
      : 0;

    const brandVelocity = {};
    const holdingBrands = ['SSH', 'SSC', 'SSW', 'SSE', 'SST', 'SS'];
    holdingBrands.forEach(b => {
      const bProjects = allProjects.filter(p => (p.brand || '').toUpperCase() === b);
      brandVelocity[b] = {
        brand: b,
        total: bProjects.length,
        active: bProjects.filter(p => ['in-progress', 'review', 'revision'].includes(p.status)).length,
        completed: bProjects.filter(p => p.status === 'done' || p.status === 'approved').length,
        avgDays: avgTurnaroundDays || 3.5
      };
    });

    const disciplines = [
      { label: 'Packaging', keywords: ['packaging', 'box', 'label', 'bottle', 'pouch', 'pack', 'unboxing'], target: 90 },
      { label: 'Graphic Design', keywords: ['graphic', 'poster', 'social', 'banner', 'print', 'flyer', 'catalog'], target: 95 },
      { label: '3D & Motion', keywords: ['3d', 'motion', 'animation', 'c4d', 'blender', 'render', 'cinema'], target: 80 },
      { label: 'Video Editing', keywords: ['video', 'reel', 'tiktok', 'vfx', 'premiere', 'youtube', 'clip'], target: 85 },
      { label: 'Copywriting', keywords: ['copy', 'headline', 'script', 'article', 'content', 'copywriting'], target: 75 },
      { label: 'Branding', keywords: ['brand', 'identity', 'guidelines', 'logo', 'launch', 'typography'], target: 90 }
    ];

    const competencySkills = disciplines.map(disc => {
      const matchingProjects = allProjects.filter(p => {
        const text = `${p.title || ''} ${p.presetType || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
        return disc.keywords.some(kw => text.includes(kw));
      });

      const totalCount = matchingProjects.length;
      const completedCount = matchingProjects.filter(p => p.status === 'done' || p.status === 'approved').length;
      const zeroRevInDiscipline = matchingProjects.filter(p => (p.status === 'done' || p.status === 'approved') && (p.revision || 0) === 0).length;
      
      let actualScore = 80;
      if (totalCount > 0) {
        const ftr = completedCount > 0 ? (zeroRevInDiscipline / completedCount) * 100 : 75;
        actualScore = Math.min(98, Math.max(65, Math.round(60 + Math.min(20, totalCount * 4) + (ftr * 0.18))));
      } else {
        actualScore = disc.target > 85 ? disc.target - 2 : disc.target + 3;
      }

      return {
        label: disc.label,
        target: disc.target,
        actual: actualScore,
        projectCount: totalCount
      };
    });

    return {
      kpis: {
        total,
        active,
        pendingReview,
        pendingApproval,
        revisionRequired,
        completed,
        overdue,
        dueSoon,
        highRevisionCount
      },
      pipeline,
      brandDistribution: brandCounts,
      typeDistribution: typeCounts,
      designerWorkload,
      highRevisionProjects,
      slaMetrics: {
        avgTurnaroundDays,
        medianTurnaroundDays,
        p90TurnaroundDays,
        firstTimeRightPercent,
        avgRevisionCount,
        avgReviewAgeDays,
        totalCompleted: completedProjects.length,
        brandVelocity: Object.values(brandVelocity).sort((a, b) => b.total - a.total),
        competencySkills
      },
      recentProjects: projects.slice(0, 6),
      activeFilters: {
        timeRange,
        brand: brandFilter
      }
    };
  }

  deleteProject(projectId, actorName = 'Admin', actorRole = 'Administrator') {
    const project = this.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found.`);
    }

    const fullPath = path.resolve(project.fullPath);
    const resolvedRoot = path.resolve(this.workspaceRoot);

    if (!fullPath.startsWith(resolvedRoot) || fullPath === resolvedRoot) {
      throw new Error('Unauthorized project deletion: target path is outside workspace boundaries.');
    }

    const baseName = path.basename(fullPath);
    if (baseName === '_Team' || baseName === '#recycle' || baseName.startsWith('.')) {
      throw new Error(`Cannot delete protected system directory: ${baseName}`);
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Project directory does not exist: ${fullPath}`);
    }

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

    this.scan();

    return {
      success: true,
      message: `Project ${project.jobId || project.title} and all subfolders deleted successfully.`,
      projectId: project.id
    };
  }

  updateProject(projectId, payload, actor = 'Administrator', role = 'Admin') {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const { frontmatter, status, priority, manager, designer, department, brand, deadline, body, expectedHash } = payload;
    const { frontmatter: existingFm, body: existingBody } = FrontmatterService.readProjectReadme(project.fullPath);

    const mergedFm = {
      ...existingFm,
      ...(frontmatter || {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(manager !== undefined ? { manager } : {}),
      ...(designer !== undefined ? { designer } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(brand !== undefined ? { brand } : {}),
      ...(deadline !== undefined ? { deadline } : {})
    };

    const result = FrontmatterService.writeProjectReadme(
      project.fullPath,
      mergedFm,
      body !== undefined && body !== null ? body : existingBody,
      expectedHash || null
    );

    if (project) {
      if (mergedFm.manager !== undefined) project.manager = mergedFm.manager;
      if (mergedFm.status !== undefined) project.status = mergedFm.status;
      if (mergedFm.priority !== undefined) project.priority = mergedFm.priority;
      if (mergedFm.designer !== undefined) project.designer = mergedFm.designer;
      if (mergedFm.brand !== undefined) project.brand = mergedFm.brand;
      if (mergedFm.department !== undefined) project.department = mergedFm.department;
      if (mergedFm.deadline !== undefined) project.deadline = mergedFm.deadline;
      project.versionHash = result.versionHash;
    }

    AuditService.logEvent({
      actor,
      role,
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id,
      details: { manager: mergedFm.manager, status: mergedFm.status, priority: mergedFm.priority }
    });

    this.scan(true);
    const SseService = require('./SseService');
    SseService.broadcast('project:updated', { 
      projectId, 
      manager: mergedFm.manager,
      status: mergedFm.status, 
      priority: mergedFm.priority 
    });

    const refreshed = this.getProjectById(projectId) || project;
    return { success: true, project: refreshed, versionHash: result.versionHash };
  }

  updateProjectBrief(projectId, briefMarkdown, expectedHash = null, actor = 'Designer') {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const { frontmatter } = FrontmatterService.readProjectReadme(project.fullPath);
    const result = FrontmatterService.writeProjectReadme(
      project.fullPath,
      frontmatter,
      briefMarkdown,
      expectedHash
    );

    AuditService.logEvent({
      actor,
      action: 'PROJECT_BRIEF_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id
    });

    this.scan();
    const SseService = require('./SseService');
    SseService.broadcast('project:updated', { projectId });
    return { success: true, versionHash: result.versionHash };
  }

  updateProjectDirection(projectId, directionData, actor = 'Lead Designer') {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const { visual_concept, color_palette, target_audience, aspect_ratio, mood_keywords, reference_links } = directionData;
    const { frontmatter, body } = FrontmatterService.readProjectReadme(project.fullPath);

    const updatedFm = {
      ...frontmatter,
      creative_direction: {
        ...(frontmatter.creative_direction || {}),
        visual_concept: visual_concept || '',
        color_palette: color_palette || '',
        target_audience: target_audience || '',
        ...(aspect_ratio !== undefined ? { aspect_ratio } : {}),
        ...(mood_keywords !== undefined ? { mood_keywords } : {}),
        ...(reference_links !== undefined ? { reference_links } : {}),
        updatedBy: actor,
        updatedAt: new Date().toISOString()
      }
    };

    FrontmatterService.writeProjectReadme(project.fullPath, updatedFm, body);

    if (project) {
      project.creativeDirection = updatedFm.creative_direction;
    }

    AuditService.logEvent({
      actor,
      action: 'CREATIVE_DIRECTION_UPDATED',
      entityType: 'Project',
      entityId: project.jobId || project.id
    });

    this.scan(true);
    const SseService = require('./SseService');
    SseService.broadcast('project:updated', { 
      projectId, 
      creativeDirection: updatedFm.creative_direction 
    });
    return { success: true, creativeDirection: updatedFm.creative_direction };
  }

  reassignProject(projectId, newDesigner, reason = '', actor = 'Studio Lead', role = 'Manager') {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');
    if (!newDesigner) throw new Error('newDesigner name is required');

    const oldDesigner = project.designer || 'Unassigned';
    const { frontmatter, body } = FrontmatterService.readProjectReadme(project.fullPath);
    const updatedFm = { ...frontmatter, designer: newDesigner.trim() };
    FrontmatterService.writeProjectReadme(project.fullPath, updatedFm, body);

    AuditService.logEvent({
      actor,
      role,
      action: 'PROJECT_REASSIGNED',
      entityType: 'Project',
      entityId: project.jobId || project.id,
      details: {
        projectId: project.id,
        oldDesigner,
        newDesigner: newDesigner.trim(),
        reason
      }
    });

    const SseService = require('./SseService');
    SseService.broadcast('project:updated', {
      projectId: project.id,
      action: 'reassigned',
      designer: newDesigner.trim(),
      actor
    });

    const WebhookService = require('./WebhookService');
    WebhookService.dispatch('PROJECT_REASSIGNED', {
      jobId: project.jobId,
      projectTitle: project.title,
      actor,
      brand: project.brand,
      message: `Project reassigned from ${oldDesigner} to ${newDesigner.trim()}`
    });

    return { success: true, designer: newDesigner.trim(), message: `Project reassigned to ${newDesigner.trim()}` };
  }
}

module.exports = new ProjectService();
