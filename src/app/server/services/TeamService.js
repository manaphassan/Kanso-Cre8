const fs = require('fs');
const path = require('path');
const config = require('../config');
const WorkspaceService = require('./WorkspaceService');

class TeamService {
  static getRosterPath() {
    const configDir = path.join(config.WORKSPACE_ROOT, '_Team', '_Config');
    if (!fs.existsSync(configDir)) {
      try { fs.mkdirSync(configDir, { recursive: true }); } catch (e) {}
    }
    return path.join(configDir, 'staff_directory.json');
  }

  /**
   * Loads canonical staff directory from NAS, seeding default if missing.
   */
  static getStaffRoster() {
    const rosterPath = this.getRosterPath();
    const defaultTeam = [
      { staffId: 'DEMO001', username: 'demo', name: 'Demo Creator', email: 'demo@kansocre8.local', role: 'Lead Designer / Administrator', department: 'Creative Studio', defaultBrand: 'ACME', avatarColor: '#38BDF8', active: true },
      { staffId: 'ACME001', username: 'harussani', name: 'Harussani', email: 'harussani@acme.com', role: 'Art Director / Administrator', department: 'Creative Production', defaultBrand: 'ACME', avatarColor: '#0284C7', active: true },
      { staffId: 'NEX002', username: 'alex', name: 'Alex Vance', email: 'alex@nexusstudio.io', role: 'Multimedia Designer', department: 'Multimedia & Motion', defaultBrand: 'NEX', avatarColor: '#8B5CF6', active: true },
      { staffId: 'LUM003', username: 'elena', name: 'Elena Rostova', email: 'elena@luminalabs.dev', role: 'Creative Strategist', department: 'Research & Strategy', defaultBrand: 'LUM', avatarColor: '#10B981', active: true },
      { staffId: 'ACME004', username: 'marcus', name: 'Marcus Brody', email: 'marcus@acme.com', role: 'Lead Copywriter', department: 'Content & Copy', defaultBrand: 'ACME', avatarColor: '#F59E0B', active: true },
      { staffId: 'NEX005', username: 'maya', name: 'Maya Lin', email: 'maya@nexusstudio.io', role: 'Senior Designer', department: 'Brand & Identity', defaultBrand: 'NEX', avatarColor: '#EC4899', active: true },
      { staffId: 'LUM006', username: 'david', name: 'David Chen', email: 'david@luminalabs.dev', role: 'Motion Graphic Designer', department: 'Multimedia & Motion', defaultBrand: 'LUM', avatarColor: '#6366F1', active: true }
    ];

    if (!fs.existsSync(rosterPath)) {
      try {
        fs.writeFileSync(rosterPath, JSON.stringify(defaultTeam, null, 2), 'utf8');
        return defaultTeam;
      } catch (err) {
        return defaultTeam;
      }
    }

    try {
      const json = fs.readFileSync(rosterPath, 'utf8');
      const roster = JSON.parse(json);
      return Array.isArray(roster) && roster.length > 0 ? roster : defaultTeam;
    } catch (err) {
      console.error('[TeamService] Failed to parse staff_directory.json:', err.message);
      return defaultTeam;
    }
  }

  /**
   * Saves staff directory to NAS atomically with SMB fallback.
   */
  static saveStaffRoster(roster) {
    const rosterPath = this.getRosterPath();
    const json = JSON.stringify(roster, null, 2);
    try {
      const tempFile = `${rosterPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, json, 'utf8');
      try {
        fs.renameSync(tempFile, rosterPath);
      } catch (renameErr) {
        // SMB UNC share lock fallback
        fs.writeFileSync(rosterPath, json, 'utf8');
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
    } catch (err) {
      fs.writeFileSync(rosterPath, json, 'utf8');
    }
    return roster;
  }

  static addStaffMember(member) {
    const roster = this.getStaffRoster();
    const staffId = (member.staffId || '').trim().toUpperCase();
    if (!staffId) throw new Error('Staff ID is required (e.g. SS0080).');

    const existing = roster.find(m => m.staffId.toLowerCase() === staffId.toLowerCase());
    if (existing) {
      throw new Error(`Staff ID '${staffId}' already exists in the directory.`);
    }

    const username = (member.username || member.name.toLowerCase().replace(/\s+/g, '')).trim();
    
    // Normalize multi-role support (Array or comma-separated string)
    let roles = ['Designer'];
    if (Array.isArray(member.roles) && member.roles.length > 0) {
      roles = member.roles;
    } else if (typeof member.role === 'string' && member.role.trim()) {
      roles = member.role.split(',').map(r => r.trim()).filter(Boolean);
    }
    const roleString = roles.join(', ') || 'Designer';

    const newMember = {
      staffId,
      username,
      name: member.name.trim(),
      email: member.email ? member.email.trim() : `${username}@kansocre8.local`,
      role: roleString,
      roles: roles.length > 0 ? roles : ['Designer'],
      department: member.department ? member.department.trim() : 'Creative Production',
      defaultBrand: (member.defaultBrand || 'ACME').trim().toUpperCase(),
      avatar: member.avatar || '',
      avatarColor: member.avatarColor || '#38BDF8',
      active: member.active !== false
    };

    roster.push(newMember);
    this.saveStaffRoster(roster);
    return newMember;
  }

  static updateStaffMember(staffId, updates) {
    const roster = this.getStaffRoster();
    const idx = roster.findIndex(m => m.staffId.toLowerCase() === staffId.toLowerCase() || (m.username && m.username.toLowerCase() === staffId.toLowerCase()));
    if (idx === -1) {
      throw new Error(`Staff member '${staffId}' not found.`);
    }

    let updatedRoles = updates.roles;
    let updatedRole = updates.role;

    if (Array.isArray(updatedRoles) && updatedRoles.length > 0) {
      updatedRole = updatedRoles.join(', ');
    } else if (typeof updatedRole === 'string' && updatedRole.trim()) {
      updatedRoles = updatedRole.split(',').map(r => r.trim()).filter(Boolean);
    } else if (!updatedRoles && !updatedRole) {
      updatedRoles = roster[idx].roles || (roster[idx].role ? roster[idx].role.split(',').map(r => r.trim()).filter(Boolean) : ['Designer']);
      updatedRole = roster[idx].role || 'Designer';
    }

    roster[idx] = {
      ...roster[idx],
      ...updates,
      role: updatedRole || 'Designer',
      roles: updatedRoles || ['Designer'],
      staffId: roster[idx].staffId // Preserve immutable Staff ID
    };

    this.saveStaffRoster(roster);
    return roster[idx];
  }

  static deleteStaffMember(staffId) {
    const roster = this.getStaffRoster();
    const targetId = staffId.trim().toUpperCase();
    const filtered = roster.filter(m => m.staffId.toUpperCase() !== targetId && m.username.toLowerCase() !== staffId.toLowerCase());
    if (filtered.length === roster.length) {
      throw new Error(`Staff member '${staffId}' not found.`);
    }

    this.saveStaffRoster(filtered);
    return { success: true, deletedStaffId: targetId };
  }

  /**
   * Returns list of team members with assigned active workloads and capacity indicators.
   * Filters strictly to Designer, Copywriter & Admin role staff (excluding standalone Managers & Executives).
   */
  static getTeamDirectory() {
    const isCreativeOrAdminRole = (member) => {
      const roleLower = (member.role || '').toLowerCase();
      const deptLower = (member.department || '').toLowerCase();

      // If user has designer, copywriter, art director, or admin roles, include them
      if (roleLower.includes('designer') || roleLower.includes('copy') || roleLower.includes('art director') || roleLower.includes('admin') || roleLower.includes('multimedia')) {
        return true;
      }

      // Exclude standalone Managers, CEOs, Executive Directors, and Sales/Marketing Heads
      if (roleLower.includes('manager') || roleLower.includes('ceo') || roleLower.includes('chief') ||
          roleLower.includes('head of') || roleLower.includes('executive') || roleLower.includes('director of') ||
          deptLower.includes('executive') || deptLower.includes('management') || deptLower.includes('marketing & sales') ||
          roleLower === 'manager' || roleLower === 'mgr') {
        return false;
      }
      return true;
    };

    const roster = this.getStaffRoster()
      .filter(m => m.active !== false)
      .filter(isCreativeOrAdminRole);

    const metrics = WorkspaceService.getDashboardMetrics();
    const workloadMap = {};
    metrics.designerWorkload.forEach(dw => {
      workloadMap[dw.designer] = dw;
      if (dw.staffId) {
        workloadMap[dw.staffId] = dw;
      }
    });

    const allProjects = WorkspaceService.getAllProjects();

    const CATEGORY_SLA_MAP = {
      'D': { name: 'Graphic & Print Design', slaDays: 3, weight: 1.0, shortLabel: 'Graphic' },
      'S': { name: 'Social Media Content', slaDays: 2, weight: 0.7, shortLabel: 'Social' },
      'E': { name: 'E-Commerce', slaDays: 3, weight: 1.0, shortLabel: 'E-Com' },
      'W': { name: 'Web Design', slaDays: 5, weight: 1.5, shortLabel: 'Web' },
      'V': { name: 'Video Production', slaDays: 7, weight: 2.0, shortLabel: 'Video' },
      'P': { name: 'Brand Identity', slaDays: 10, weight: 2.5, shortLabel: 'Branding' }
    };

    function resolveCategoryConfig(presetType, presetCode) {
      if (presetCode && CATEGORY_SLA_MAP[presetCode.toUpperCase()]) {
        return CATEGORY_SLA_MAP[presetCode.toUpperCase()];
      }
      const typeStr = (presetType || '').toLowerCase();
      if (typeStr.includes('video') || typeStr.includes('motion')) return CATEGORY_SLA_MAP['V'];
      if (typeStr.includes('brand') || typeStr.includes('identity')) return CATEGORY_SLA_MAP['P'];
      if (typeStr.includes('web')) return CATEGORY_SLA_MAP['W'];
      if (typeStr.includes('social') || typeStr.includes('media')) return CATEGORY_SLA_MAP['S'];
      if (typeStr.includes('commerce') || typeStr.includes('e-com')) return CATEGORY_SLA_MAP['E'];
      return CATEGORY_SLA_MAP['D']; // Default 3 days / 1.0 slot
    }

    return roster.map(member => {
      const w = workloadMap[member.name] || workloadMap[member.staffId] || workloadMap[member.username] || {
        total: 0,
        active: 0,
        inProgress: 0,
        inReview: 0,
        revision: 0,
        overdue: 0,
        completed: 0
      };

      // Filter assigned projects for this designer
      const mName = (member.name || '').toLowerCase();
      const mStaff = (member.staffId || '').toLowerCase();
      const mUser = (member.username || '').toLowerCase();

      const memberProjects = allProjects.filter(p => {
        const d = (p.designer || '').toLowerCase();
        return d === mName || d === mStaff || d === mUser || (mName && d.includes(mName));
      }).map(p => {
        const catCfg = resolveCategoryConfig(p.presetType, p.presetCode);
        return {
          id: p.id || p.jobId,
          jobId: p.jobId || p.id,
          title: p.title || 'Untitled Project',
          status: p.status || 'in-progress',
          brand: p.brand || 'SS',
          priority: p.priority || 'medium',
          deadline: p.deadline || null,
          presetType: catCfg.name,
          presetCode: p.presetCode || 'D',
          slaDays: catCfg.slaDays,
          slotWeight: catCfg.weight,
          shortLabel: catCfg.shortLabel
        };
      });

      // Helper to identify active in-flight projects
      const isActiveStatus = (status) => {
        const s = (status || '').toLowerCase();
        return s === 'in-progress' || s === 'review' || s === 'revision';
      };

      // Calculate Category-Weighted Active In-Flight Load
      // ONLY projects actively in-flight consume designer capacity: in-progress, review, revision
      // Backlog (queued), on-hold (paused), done, approved, and cancelled do NOT consume active bandwidth
      let weightedLoad = 0;
      memberProjects.filter(p => isActiveStatus(p.status)).forEach(p => {
        weightedLoad += (p.slotWeight || 1.0);
      });
      weightedLoad = Math.round(weightedLoad * 10) / 10;

      const activeCount = memberProjects.filter(p => isActiveStatus(p.status)).length;
      const backlogCount = memberProjects.filter(p => (p.status || '').toLowerCase() === 'backlog').length;

      // Studio Capacity scale (Max recommended studio bandwidth: 5.0 slot points)
      // 0 pts = Available (ready for assignment)
      // 0.1 - 3.5 pts = Normal (healthy active load)
      // 3.6 - 4.4 pts = High Workload (heavy workload)
      // 4.5 - 5.0 pts = At Capacity (maximum utilization)
      // > 5.0 pts OR >= 5 active projects = Overloaded (exceeds capacity bottleneck)
      let capacityPercent = Math.min(100, Math.round((weightedLoad / 5.0) * 100));
      let capacityStatus = 'Normal';
      let capacityColor = '#10B981'; // Green

      if (weightedLoad > 5.0 || (w.active && w.active >= 5) || activeCount >= 5) {
        capacityStatus = 'Overloaded';
        capacityColor = '#EF4444'; // Red
      } else if (weightedLoad >= 4.5) {
        capacityStatus = 'At Capacity';
        capacityColor = '#F97316'; // Orange
      } else if (weightedLoad >= 2.5 || (w.active && w.active >= 3) || activeCount >= 3) {
        capacityStatus = 'High Workload';
        capacityColor = '#F59E0B'; // Amber
      } else if (weightedLoad === 0 && (!w.active || w.active === 0) && activeCount === 0) {
        capacityStatus = 'Available';
        capacityColor = '#21A1F7'; // Azure
      }

      // Sort member projects: Active first (revision > in-progress > review), then backlog, then completed
      const STATUS_SORT_WEIGHT = {
        'revision': 1,
        'in-progress': 2,
        'review': 3,
        'backlog': 4,
        'on-hold': 5,
        'done': 6,
        'approved': 7,
        'cancelled': 8
      };

      const sortedProjects = [...memberProjects].sort((a, b) => {
        const rankA = STATUS_SORT_WEIGHT[(a.status || '').toLowerCase()] || 99;
        const rankB = STATUS_SORT_WEIGHT[(b.status || '').toLowerCase()] || 99;
        return rankA - rankB;
      });

      return {
        ...member,
        workload: {
          ...w,
          weightedLoad,
          capacityPercent,
          backlogCount
        },
        capacityStatus,
        capacityColor,
        activeCount,
        backlogCount,
        assignedProjects: sortedProjects.slice(0, 6),
        totalAssignedCount: memberProjects.length
      };
    });
  }
}

module.exports = TeamService;
