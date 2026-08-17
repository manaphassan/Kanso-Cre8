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
   * Saves staff directory to NAS atomically.
   */
  static saveStaffRoster(roster) {
    const rosterPath = this.getRosterPath();
    const json = JSON.stringify(roster, null, 2);
    const tempFile = `${rosterPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, json, 'utf8');
    fs.renameSync(tempFile, rosterPath);
    return roster;
  }

  static addStaffMember(member) {
    const roster = this.getStaffRoster();
    const existing = roster.find(m => m.staffId.toLowerCase() === member.staffId.toLowerCase());
    if (existing) {
      throw new Error(`Staff ID '${member.staffId}' already exists in the directory.`);
    }

    const newMember = {
      staffId: member.staffId.trim().toUpperCase(),
      name: member.name.trim(),
      role: member.role.trim() || 'Designer',
      department: member.department.trim() || 'Creative Production',
      defaultBrand: (member.defaultBrand || 'SS').trim().toUpperCase(),
      avatarColor: member.avatarColor || '#0078D4',
      active: true
    };

    roster.push(newMember);
    this.saveStaffRoster(roster);
    return newMember;
  }

  static updateStaffMember(staffId, updates) {
    const roster = this.getStaffRoster();
    const idx = roster.findIndex(m => m.staffId.toLowerCase() === staffId.toLowerCase());
    if (idx === -1) {
      throw new Error(`Staff ID '${staffId}' not found.`);
    }

    roster[idx] = {
      ...roster[idx],
      ...updates,
      staffId: roster[idx].staffId // Preserve immutable Staff ID
    };

    this.saveStaffRoster(roster);
    return roster[idx];
  }

  /**
   * Returns list of team members with assigned active workloads and capacity indicators.
   * Filters strictly to User / Designer role staff (excluding Managers & Admins).
   */
  static getTeamDirectory() {
    const isUserRole = (member) => {
      const roleLower = (member.role || '').toLowerCase();
      const deptLower = (member.department || '').toLowerCase();
      // Exclude Admins, CEOs, Directors, and Managers from Team Workload grid
      if (roleLower.includes('admin') || roleLower.includes('ceo') || roleLower.includes('manager') || roleLower.includes('director') || deptLower.includes('executive')) {
        return false;
      }
      return true;
    };

    const roster = this.getStaffRoster()
      .filter(m => m.active !== false)
      .filter(isUserRole);

    const metrics = WorkspaceService.getDashboardMetrics();
    const workloadMap = {};
    metrics.designerWorkload.forEach(dw => {
      workloadMap[dw.designer] = dw;
    });

    return roster.map(member => {
      const w = workloadMap[member.staffId] || {
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
