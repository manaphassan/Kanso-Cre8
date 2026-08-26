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
      { staffId: 'SS0004', username: 'harussani', name: 'Harussani', email: 'harussani.suamisihat@gmail.com', role: 'Art Director / Administrator', department: 'Creative Production', defaultBrand: 'SS', avatarColor: '#0078D4', active: true },
      { staffId: 'SS0035', username: 'haikal', name: 'Haikal', email: 'haikal.suamisihat@gmail.com', role: 'Multimedia Designer', department: 'Multimedia & Motion', defaultBrand: 'SS', avatarColor: '#106EBE', active: true },
      { staffId: 'SS0037', username: 'aliff', name: 'Aliff', email: 'aliffnaz.suamisihat@gmail.com', role: 'Multimedia Designer', department: 'Multimedia & Motion', defaultBrand: 'SSE', avatarColor: '#7C3AED', active: true },
      { staffId: 'SS0073', username: 'raihan', name: 'Raihan', email: 'raihan.suamisihat@gmail.com', role: 'Head of Marketing & Sale', department: 'Marketing & Sales', defaultBrand: 'SS', avatarColor: '#D97706', active: true },
      { staffId: 'SS0001', username: 'hasan', name: 'Hasan', email: 'hasan@suamisihat.com', role: 'Chief Executive Officer', department: 'Executive Management', defaultBrand: 'SS', avatarColor: '#21A1F7', active: true },
      { staffId: 'SS0071', username: 'gaddafi', name: 'Gaddafi', email: 'gaddafi@suamisihat.com', role: 'Co-Chief Executive Officer', department: 'Executive Management', defaultBrand: 'SS', avatarColor: '#059669', active: true }
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
    const newMember = {
      staffId,
      username,
      name: member.name.trim(),
      email: member.email ? member.email.trim() : `${username}@suamisihat.com`,
      role: member.role ? member.role.trim() : 'Designer',
      department: member.department ? member.department.trim() : 'Creative Production',
      defaultBrand: (member.defaultBrand || 'SS').trim().toUpperCase(),
      avatarColor: member.avatarColor || '#0078D4',
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

    roster[idx] = {
      ...roster[idx],
      ...updates,
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
   * Filters strictly to User / Designer & Admin role staff (excluding Managers & Executives).
   */
  static getTeamDirectory() {
    const isUserOrAdminRole = (member) => {
      const roleLower = (member.role || '').toLowerCase();
      const deptLower = (member.department || '').toLowerCase();
      // Exclude Managers, CEOs, Executive Directors, and Sales/Marketing Heads
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
      .filter(isUserOrAdminRole);

    const metrics = WorkspaceService.getDashboardMetrics();
    const workloadMap = {};
    metrics.designerWorkload.forEach(dw => {
      workloadMap[dw.designer] = dw;
      if (dw.staffId) {
        workloadMap[dw.staffId] = dw;
      }
    });

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

      let capacityStatus = 'Normal';
      let capacityColor = '#10B981'; // Green
      if (w.active >= 5) {
        capacityStatus = 'Overloaded';
        capacityColor = '#EF4444'; // Red
      } else if (w.active >= 3) {
        capacityStatus = 'High Workload';
        capacityColor = '#F59E0B'; // Amber
      } else if (w.active === 0) {
        capacityStatus = 'Available';
        capacityColor = '#21A1F7'; // Azure
      }

      return {
        ...member,
        workload: w,
        capacityStatus,
        capacityColor
      };
    });
  }
}

module.exports = TeamService;
