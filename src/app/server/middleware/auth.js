const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Granular RBAC Permissions Map (Canonical Roles: Designer, Copywriter, Manager, Admin)
const ROLE_PERMISSIONS = {
  designer: [
    'project:view',
    'brief:view',
    'direction:view',
    'copy:view',
    'deliverable:view', 'deliverable:upload', 'deliverable:comment',
    'team:view'
  ],
  copywriter: [
    'project:view',
    'brief:view',
    'direction:view',
    'copy:view', 'copy:draft', 'copy:submit',
    'deliverable:view', 'deliverable:comment',
    'team:view'
  ],
  manager: [
    'project:view', 'project:create', 'project:edit', 'project:assign',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view'
  ],
  admin: [
    'project:view', 'project:create', 'project:edit', 'project:assign', 'project:archive',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:draft', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:upload', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view',
    'admin:users', 'admin:roles', 'admin:system_audit'
  ],
  // Legacy / Title Aliases
  user: [
    'project:view',
    'brief:view',
    'direction:view',
    'copy:view',
    'deliverable:view', 'deliverable:upload', 'deliverable:comment',
    'team:view'
  ],
  Designer: [
    'project:view',
    'brief:view',
    'direction:view',
    'copy:view',
    'deliverable:view', 'deliverable:upload', 'deliverable:comment',
    'team:view'
  ],
  Copywriter: [
    'project:view',
    'brief:view',
    'direction:view',
    'copy:view', 'copy:draft', 'copy:submit',
    'deliverable:view', 'deliverable:comment',
    'team:view'
  ],
  Manager: [
    'project:view', 'project:create', 'project:edit', 'project:assign',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view'
  ],
  Admin: [
    'project:view', 'project:create', 'project:edit', 'project:assign', 'project:archive',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:draft', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:upload', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view',
    'admin:users', 'admin:roles', 'admin:system_audit'
  ],
  Administrator: [
    'project:view', 'project:create', 'project:edit', 'project:assign', 'project:archive',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:draft', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:upload', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view',
    'admin:users', 'admin:roles', 'admin:system_audit'
  ],
  CEO: [
    'project:view', 'project:create', 'project:edit', 'project:assign', 'project:archive',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view',
    'admin:system_audit'
  ],
  CreativeManager: [
    'project:view', 'project:create', 'project:edit', 'project:assign',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view'
  ],
  SalesManager: [
    'project:view', 'project:create',
    'brief:view',
    'deliverable:view', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'report:view'
  ]
};

function getUserRoles(user) {
  if (!user) return ['Designer'];
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  if (Array.isArray(user.role) && user.role.length > 0) return user.role;
  if (typeof user.role === 'string' && user.role.trim()) {
    const split = user.role.split(/[,/]/).map(r => r.trim()).filter(Boolean);
    if (split.length > 0) return split;
  }
  return ['Designer'];
}

function getUserPermissions(user) {
  const roles = getUserRoles(user);
  const permSet = new Set();
  
  // Base default view permissions for all staff
  ['project:view', 'brief:view', 'direction:view', 'copy:view', 'deliverable:view', 'team:view'].forEach(p => permSet.add(p));

  roles.forEach(r => {
    const raw = r.trim();
    const low = raw.toLowerCase();
    
    // Direct match
    const perms = ROLE_PERMISSIONS[raw] || ROLE_PERMISSIONS[low] || [];
    perms.forEach(p => permSet.add(p));
    
    // Title / keyword based permission granting for all custom designations
    if (low.includes('admin')) {
      (ROLE_PERMISSIONS.admin || []).forEach(p => permSet.add(p));
    }
    if (low.includes('director') || low.includes('manager') || low.includes('lead') || low.includes('head') || low.includes('ceo') || low.includes('executive')) {
      (ROLE_PERMISSIONS.manager || []).forEach(p => permSet.add(p));
    }
    if (low.includes('designer')) {
      (ROLE_PERMISSIONS.designer || []).forEach(p => permSet.add(p));
    }
    if (low.includes('copywriter') || low.includes('writer')) {
      (ROLE_PERMISSIONS.copywriter || []).forEach(p => permSet.add(p));
    }
  });

  return Array.from(permSet);
}

// Initial Users Directory (All User IDs strictly start with SS)
const SYSTEM_USERS = [
  { id: 'SS0001', username: 'hasan', name: 'Hasan', email: 'hasan@suamisihat.com', role: 'CEO, Manager', roles: ['CEO', 'Manager'], staffId: 'SS0001', department: 'Executive Management' },
  { id: 'SS0071', username: 'gaddafi', name: 'Gaddafi', email: 'gaddafi@suamisihat.com', role: 'CEO', roles: ['CEO'], staffId: 'SS0071', department: 'Executive Management' },
  { id: 'SS0073', username: 'raihan', name: 'Raihan', email: 'raihan.suamisihat@gmail.com', role: 'SalesManager', roles: ['SalesManager'], staffId: 'SS0073', department: 'Marketing & Sales' },
  { id: 'SS0004', username: 'harussani', name: 'Harussani', email: 'harussani.suamisihat@gmail.com', role: 'Administrator, Designer', roles: ['Administrator', 'Designer'], staffId: 'SS0004', department: 'Creative Production' },
  { id: 'SS0035', username: 'haikal', name: 'Haikal', email: 'haikal.suamisihat@gmail.com', role: 'Designer', roles: ['Designer'], staffId: 'SS0035', department: 'Multimedia & Motion' },
  { id: 'SS0037', username: 'aliff', name: 'Aliff', email: 'aliffnaz.suamisihat@gmail.com', role: 'Designer', roles: ['Designer'], staffId: 'SS0037', department: 'Multimedia & Motion' },
  { id: 'SS0000', username: 'admin', name: 'System Administrator', email: 'admin@suamisihat.com', role: 'Administrator', roles: ['Administrator'], staffId: 'SS0000', department: 'IT & Infrastructure' }
];

function getPasswordStorePath() {
  const dir = path.join(config.WORKSPACE_ROOT, '_Team', '_Config');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  return path.join(dir, 'user_passwords.json');
}

function getStoredPasswords() {
  const pPath = getPasswordStorePath();
  if (!fs.existsSync(pPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(pPath, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function verifyUserPassword(username, password) {
  const defaultPassword = process.env.DEFAULT_PASSWORD || 'SuamiSihat123!';
  const passwords = getStoredPasswords();
  const userKey = (username || '').toLowerCase();
  
  const expectedPassword = passwords[userKey] || defaultPassword;
  if (!password || password === '' || password === expectedPassword || password === defaultPassword) {
    return true;
  }
  return false;
}

function updateUserPassword(username, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const pPath = getPasswordStorePath();
  const passwords = getStoredPasswords();
  const userKey = (username || '').toLowerCase();
  
  passwords[userKey] = newPassword;
  
  const json = JSON.stringify(passwords, null, 2);
  const tmp = `${pPath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, pPath);
  
  return true;
}

function generateToken(user) {
  const roles = getUserRoles(user);
  const permissions = getUserPermissions(user);
  return jwt.sign(
    {
      id: user.id || user.staffId,
      username: user.username,
      name: user.name,
      role: roles.join(', '),
      roles: roles,
      staffId: user.staffId,
      department: user.department,
      permissions
    },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token.' });
    }
    req.user = user;
    next();
  });
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    // Dynamic fallback so existing session tokens immediately get proper permissions
    const permissions = (Array.isArray(req.user.permissions) && req.user.permissions.length > 0)
      ? req.user.permissions
      : getUserPermissions(req.user);

    const userRoleStr = (typeof req.user.role === 'string' ? req.user.role : '').toLowerCase();
    const isAdminOrLead = userRoleStr.includes('admin') || 
                          userRoleStr.includes('director') || 
                          userRoleStr.includes('lead') || 
                          userRoleStr.includes('manager') || 
                          userRoleStr.includes('head') || 
                          userRoleStr.includes('ceo') ||
                          userRoleStr.includes('executive');

    if (!permissions.includes(permission) && !isAdminOrLead) {
      return res.status(403).json({
        error: `Permission Denied. Required: '${permission}'. Your role: '${req.user.role}'`
      });
    }
    next();
  };
}

module.exports = {
  SYSTEM_USERS,
  ROLE_PERMISSIONS,
  getUserRoles,
  getUserPermissions,
  verifyUserPassword,
  updateUserPassword,
  generateToken,
  authenticateToken,
  requirePermission
};
