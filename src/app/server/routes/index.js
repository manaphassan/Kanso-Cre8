/**
 * Kanso Cre8 Modular API Router
 * Aggregates all domain-specific sub-routers under /api
 */
const express = require('express');
const router = express.Router();

router.use('/', require('./system'));
router.use('/', require('./vault'));
router.use('/', require('./auth'));
router.use('/', require('./projects'));
router.use('/', require('./deliverables'));
router.use('/', require('./share'));
router.use('/', require('./ai'));
router.use('/', require('./clients'));
router.use('/', require('./finance'));
router.use('/', require('./journal'));
router.use('/', require('./notes'));

module.exports = router;
