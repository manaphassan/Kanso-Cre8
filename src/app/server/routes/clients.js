const express = require('express');
const router = express.Router();
const CompanyService = require('../services/CompanyService');
const AuditService = require('../services/AuditService');
const SseService = require('../services/SseService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.get('/clients', (req, res) => {
  try {
    res.json({ success: true, clients: CompanyService.getCompanies() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/clients', authenticateToken, (req, res) => {
  try {
    const client = CompanyService.saveCompany(req.body);
    AuditService.logEvent({
      actor: req.user ? req.user.name : 'Administrator',
      role: req.user ? req.user.role : 'Admin',
      action: 'CLIENT_CREATED',
      entityType: 'Client',
      entityId: client.code,
      details: { code: client.code, name: client.name }
    });
    SseService.broadcast('client:updated', { client, action: 'created' });
    res.status(201).json({ success: true, client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/clients/:code', (req, res) => {
  try {
    const client = CompanyService.getCompany(req.params.code);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ success: true, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/clients/:code', authenticateToken, (req, res) => {
  try {
    const client = CompanyService.saveCompany({ ...req.body, code: req.params.code });
    AuditService.logEvent({
      actor: req.user ? req.user.name : 'Administrator',
      role: req.user ? req.user.role : 'Admin',
      action: 'CLIENT_UPDATED',
      entityType: 'Client',
      entityId: client.code,
      details: { code: client.code, name: client.name }
    });
    SseService.broadcast('client:updated', { client, action: 'updated' });
    res.json({ success: true, client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/clients/:code', authenticateToken, (req, res) => {
  try {
    const result = CompanyService.deleteCompany(req.params.code);
    AuditService.logEvent({
      actor: req.user ? req.user.name : 'Administrator',
      role: req.user ? req.user.role : 'Admin',
      action: 'CLIENT_DELETED',
      entityType: 'Client',
      entityId: req.params.code
    });
    SseService.broadcast('client:updated', { code: req.params.code, action: 'deleted' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/companies', (req, res) => {
  try {
    res.json({ success: true, companies: CompanyService.getCompanies() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/companies', authenticateToken, (req, res) => {
  try {
    const company = CompanyService.saveCompany(req.body);
    res.status(201).json({ success: true, company });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/companies/:code', (req, res) => {
  try {
    const company = CompanyService.getCompany(req.params.code);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
