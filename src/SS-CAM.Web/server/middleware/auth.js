const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Granular RBAC Permissions Map
const ROLE_PERMISSIONS = {
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
  ],
  Copywriter: [
    'project:view',
    'brief:view',
    'copy:view', 'copy:draft', 'copy:submit',
    'deliverable:view', 'deliverable:comment'
  ],
  Designer: [
    'project:view',
    'brief:view',
    'direction:view',
    'copy:view',
    'deliverable:view', 'deliverable:upload',
    'team:view'
  ],
  Administrator: [
    'project:view', 'project:create', 'project:edit', 'project:assign', 'project:archive',
    'brief:view', 'brief:edit',
    'direction:view', 'direction:edit',
    'copy:view', 'copy:draft', 'copy:review', 'copy:approve',
    'deliverable:view', 'deliverable:upload', 'deliverable:comment', 'deliverable:approve', 'deliverable:revision',
    'team:view', 'team:manage_workload', 'report:view',
    'admin:users', 'admin:roles', 'admin:system_audit'
  ]
};

// Initial Users Directory (All User IDs strictly start with SS)
const SYSTEM_USERS = [
  { id: 'SS0001', username: 'hasan', name: 'Hasan', email: 'hasan@suamisihat.com', role: 'CEO', staffId: 'SS0001', department: 'Executive Management' },
  { id: 'SS0071', username: 'gaddafi', name: 'Gaddafi', email: 'gaddafi@suamisihat.com', role: 'CEO', staffId: 'SS0071', department: 'Executive Management' },
  { id: 'SS0073', username: 'raihan', name: 'Raihan', email: 'raihan.suamisihat@gmail.com', role: 'SalesManager', staffId: 'SS0073', department: 'Marketing & Sales' },
  { id: 'SS0004', username: 'harussani', name: 'Harussani', email: 'harussani.suamisihat@gmail.com', role: 'Administrator', staffId: 'SS0004', department: 'Creative Production' },
  { id: 'SS0035', username: 'haikal', name: 'Haikal', email: 'haikal.suamisihat@gmail.com', role: 'Designer', staffId: 'SS0035', department: 'Multimedia & Motion' },
  { id: 'SS0037', username: 'aliff', name: 'Aliff', email: 'aliffnaz.suamisihat@gmail.com', role: 'Designer', staffId: 'SS0037', department: 'Multimedia & Motion' },
  { id: 'SS0000', username: 'admin', name: 'System Administrator', email: 'admin@suamisihat.com', role: 'Administrator', staffId: 'SS0000', department: 'IT & Infrastructure' }
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
  return password === expectedPassword;
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
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
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
    const permissions = req.user.permissions || [];
    if (!permissions.includes(permission)) {
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
  verifyUserPassword,
  updateUserPassword,
  generateToken,
  authenticateToken,
  requirePermission
};
