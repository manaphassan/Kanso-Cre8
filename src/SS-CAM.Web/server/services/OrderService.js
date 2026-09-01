/**
 * OrderService.js — Creative Request Order Management
 * Persists creative order submissions as JSON-Lines to the workspace data directory.
 * Each order is written atomically to prevent corruption.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ORDERS_DIR  = path.join(__dirname, '..', 'data');
const ORDERS_FILE = path.join(ORDERS_DIR, 'creative-orders.jsonl');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(ORDERS_DIR)) {
    fs.mkdirSync(ORDERS_DIR, { recursive: true });
  }
}

function readAllOrders() {
  ensureDataDir();
  if (!fs.existsSync(ORDERS_FILE)) return [];
  const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
  return raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); }
      catch { return null; }
    })
    .filter(Boolean);
}

function writeOrders(orders) {
  ensureDataDir();
  const tmp = ORDERS_FILE + '.tmp_' + Date.now();
  fs.writeFileSync(tmp, orders.map(o => JSON.stringify(o)).join('\n') + '\n', 'utf8');
  fs.renameSync(tmp, ORDERS_FILE);
}

function appendOrder(order) {
  ensureDataDir();
  fs.appendFileSync(ORDERS_FILE, JSON.stringify(order) + '\n', 'utf8');
}

function generateOrderId() {
  const now  = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const mo   = String(now.getMonth() + 1).padStart(2, '0');
  const day  = String(now.getDate()).padStart(2, '0');
  const rnd  = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${year}${mo}${day}-${rnd}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all creative orders, newest first.
 * @param {object} [filters] Optional { status, entity, priority }
 */
function listOrders(filters = {}) {
  let orders = readAllOrders().reverse();
  if (filters.status   && filters.status   !== 'all') orders = orders.filter(o => o.status   === filters.status);
  if (filters.entity   && filters.entity   !== 'all') orders = orders.filter(o => o.entity   === filters.entity);
  if (filters.priority && filters.priority !== 'all') orders = orders.filter(o => o.priority === filters.priority);
  return orders;
}

/**
 * Get a single order by ID.
 */
function getOrder(id) {
  return readAllOrders().find(o => o.id === id) || null;
}

/**
 * Submit a new creative order.
 */
function submitOrder(payload) {
  const {
    title,
    entity,
    priority,
    format,
    copy,
    targetDate,
    attachmentNote,
    requester,
    requesterRole,
  } = payload;

  // Validation
  if (!title || !title.trim())      throw new Error('Project title is required.');
  if (!entity)                       throw new Error('Requesting entity is required.');
  if (!priority)                     throw new Error('Priority tier is required.');
  if (!format)                       throw new Error('Format & size is required.');
  if (!copy || !copy.trim())         throw new Error('Copy / script field is required.');
  if (!targetDate)                   throw new Error('Target date is required.');

  const order = {
    id:             generateOrderId(),
    title:          title.trim(),
    entity,
    priority,
    format,
    copy:           copy.trim(),
    targetDate,
    attachmentNote: (attachmentNote || '').trim(),
    requester:      requester || 'Unknown',
    requesterRole:  requesterRole || '',
    status:         'pending',
    submittedAt:    new Date().toISOString(),
    updatedAt:      new Date().toISOString(),
    comments:       [],
    assignedTo:     null,
    projectId:      null,  // Will be linked once a project folder is created by designer
  };

  appendOrder(order);
  return order;
}

/**
 * Update order status or assignment.
 * Allowed status transitions: pending → in_progress → for_approval → done | cancelled
 */
function updateOrder(id, patch) {
  const orders = readAllOrders();
  const idx    = orders.findIndex(o => o.id === id);
  if (idx === -1) throw new Error(`Order "${id}" not found.`);

  const allowed = ['status', 'assignedTo', 'projectId', 'comments', 'internalNote'];
  const updated = { ...orders[idx], updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (patch[key] !== undefined) updated[key] = patch[key];
  }

  orders[idx] = updated;
  writeOrders(orders);
  return updated;
}

/**
 * Delete / cancel an order (soft-delete via status).
 */
function cancelOrder(id) {
  return updateOrder(id, { status: 'cancelled' });
}

module.exports = {
  listOrders,
  getOrder,
  submitOrder,
  updateOrder,
  cancelOrder,
};
