const express = require('express');
const router = express.Router();
const TeamService = require('../services/TeamService');
const AuditService = require('../services/AuditService');
const SseService = require('../services/SseService');
const { SYSTEM_USERS, ROLE_PERMISSIONS, getUserRoles, getUserPermissions, verifyUserPassword, updateUserPassword, generateToken, authenticateToken, requirePermission } = require('../middleware/auth');

router.get('/auth/roster', (req, res) => {
  try {
    const roster = TeamService.getStaffRoster()
      .filter(u => u.active !== false)
      .map(u => ({
        staffId: u.staffId || u.id,
        username: u.username || (u.name || '').toLowerCase().replace(/\s+/g, ''),
        name: u.name,
        role: u.role || 'Designer',
        department: u.department || 'Creative Production',
        avatarColor: u.avatarColor || '#0078D4'
      }))
      .sort((a, b) => (b.staffId || '').localeCompare(a.staffId || ''));
    res.json({ success: true, staff: roster });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const staffRoster = TeamService.getStaffRoster();
  const searchKey = username.trim().toLowerCase();

  let user = staffRoster.find(
    u => (u.username && u.username.toLowerCase() === searchKey) || 
         (u.name && u.name.toLowerCase() === searchKey) ||
         (u.staffId && u.staffId.toLowerCase() === searchKey)
  );

  if (!user) {
    user = SYSTEM_USERS.find(
      u => (u.username && u.username.toLowerCase() === searchKey) || 
           (u.name && u.name.toLowerCase() === searchKey) ||
           (u.id && u.id.toLowerCase() === searchKey)
    );
  }

  if (!user) return res.status(401).json({ error: 'User not found in staff directory' });
  if (user.active === false) return res.status(403).json({ error: 'Account has been suspended' });
  if (!verifyUserPassword(user.username, password)) {
    return res.status(401).json({ error: 'Invalid password. Please try again.' });
  }

  const token = generateToken(user);
  const roles = getUserRoles(user);
  const permissions = getUserPermissions(user);
  res.json({
    success: true,
    token,
    user: {
      id: user.staffId || user.id,
      staffId: user.staffId || user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      roles,
      permissions,
      department: user.department || 'Creative Production',
      avatarColor: user.avatarColor || '#0078D4'
    }
  });
});

router.post('/auth/refresh', authenticateToken, (req, res) => {
  const token = generateToken(req.user);
  res.json({ success: true, token, user: req.user });
});

router.get('/auth/me', authenticateToken, (req, res) => {
  const staffRoster = TeamService.getStaffRoster();
  const currentUser = staffRoster.find(u => u.username === req.user.username || u.staffId === req.user.id) || req.user;
  const roles = getUserRoles(currentUser);
  const permissions = getUserPermissions(currentUser);
  res.json({
    user: {
      ...currentUser,
      id: currentUser.staffId || currentUser.id,
      staffId: currentUser.staffId || currentUser.id,
      roles,
      permissions
    }
  });
});

router.post('/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }
  const username = req.user.username;
  if (!verifyUserPassword(username, currentPassword)) {
    return res.status(401).json({ error: 'Current password does not match.' });
  }
  updateUserPassword(username, newPassword);
  AuditService.logEvent({
    actor: req.user.name,
    role: req.user.role,
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: req.user.id,
    details: { username }
  });
  res.json({ success: true, message: 'Password updated successfully.' });
});

router.get('/auth/users', authenticateToken, (req, res) => {
  res.json({ users: SYSTEM_USERS, roles: Object.keys(ROLE_PERMISSIONS) });
});

router.get('/team', authenticateToken, (req, res) => {
  try {
    const team = TeamService.getTeamDirectory();
    res.json({ team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleGetUsers = (req, res) => {
  try {
    const roster = TeamService.getStaffRoster();
    res.json({ success: true, users: roster, roster });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/users', handleGetUsers);
router.get('/team/roster', handleGetUsers);

router.post('/users', authenticateToken, (req, res) => {
  try {
    const newMember = TeamService.addStaffMember(req.body);
    if (req.body.password) updateUserPassword(newMember.username, req.body.password);
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newMember.staffId,
      details: { staffId: newMember.staffId, name: newMember.name, role: newMember.role }
    });
    SseService.broadcast('team:updated', { member: newMember, action: 'created' });
    res.json({ success: true, user: newMember, member: newMember });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/users/:id', authenticateToken, (req, res) => {
  try {
    const updated = TeamService.updateStaffMember(req.params.id, req.body);
    if (req.body.password) updateUserPassword(updated.username, req.body.password);
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: req.params.id,
      details: updated
    });
    SseService.broadcast('team:updated', { member: updated, action: 'updated' });
    res.json({ success: true, user: updated, member: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/users/:id', authenticateToken, (req, res) => {
  try {
    const result = TeamService.deleteStaffMember(req.params.id);
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: req.params.id
    });
    SseService.broadcast('team:updated', { deletedStaffId: req.params.id, action: 'deleted' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/users/:username/reset-password', authenticateToken, (req, res) => {
  try {
    const { newPassword } = req.body;
    updateUserPassword(req.params.username, newPassword || 'KansoCre8!');
    AuditService.logEvent({
      actor: req.user.name,
      role: req.user.role,
      action: 'USER_PASSWORD_RESET',
      entityType: 'User',
      entityId: req.params.username
    });
    res.json({ success: true, message: `Password reset successfully for ${req.params.username}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
