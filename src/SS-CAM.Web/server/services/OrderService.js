/**
 * OrderService.js — Creative Request Order Management
 * Persists creative order submissions as JSON-Lines to the workspace data directory.
 * Each order is written atomically to prevent corruption.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os     = require('os');
const config = require('../config');

// ─── Path Resolution ──────────────────────────────────────────────────────────

function getOrdersFile() {
  if (config && config.WORKSPACE_ROOT) {
    const wsOrdersDir = path.join(config.WORKSPACE_ROOT, '_Team', 'Orders');
    try {
      if (!fs.existsSync(wsOrdersDir)) {
        fs.mkdirSync(wsOrdersDir, { recursive: true });
      }
      return path.join(wsOrdersDir, 'creative-orders.jsonl');
    } catch (e) {
      // Fallback if workspace is read-only or temporarily unavailable
    }
  }
  const fallbackDir = path.join(__dirname, '..', 'data');
  try {
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
  } catch (e) {}
  return path.join(fallbackDir, 'creative-orders.jsonl');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSeedOrders() {
  return [
    {
      id: 'ORD-260904-1001',
      title: 'Men Clinic Awareness POSM Poster',
      entity: 'SSC',
      priority: 'tier_1',
      format: 'print_posm',
      copy: '# Kempen Kesedaran Kesihatan Lelaki 2026\n\n## Headline\nKekal Bertenaga, Sihat & Berkeyakinan Setiap Hari.\n\n## Subhead\nKonsultasi professional & rawatan berperingkat daripada doktor bertauliah SuamiSihat Clinic.\n\n## Key Message Points\n- Ujian saringan pantas 15 minit tanpa rasa bimbang\n- Privasi pelanggan 100% terjaga rapi\n- Khidmat nasihat gaya hidup sihat dan suplemen semula jadi\n\n## Call to Action (CTA)\nImbas kod QR di kaunter untuk tempahan slot konsultasi percuma minggu ini.',
      targetDate: '2026-09-18',
      attachmentNote: 'Sila gunakan logo SuamiSihat Clinic (SSC) rasmi dan palet warna Medical Teal & Deep Slate.',
      requester: 'Dr. Danial',
      requesterRole: 'Medical Operations Lead',
      status: 'pending',
      submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      comments: [],
      assignedTo: null,
      projectId: null
    },
    {
      id: 'ORD-260904-1002',
      title: 'Kopi Pahlawan TikTok Reels 9:16 Promo',
      entity: 'SSE',
      priority: 'tier_2',
      format: '9_16_video',
      copy: '# Script Hook TikTok / Reels: Kopi Pahlawan\n\n## Scene 1 (0-3s) - The Pattern Interrupt\nVisual: Close-up buih kopi panas berkrim dituang ke cawan kaca berwap.\nVO: "Bro, jangan biar petang kau lemau tak bertenaga..."\nText on Screen: TENAGA PETANG PADU!\n\n## Scene 2 (3-8s) - Problem & Solution\nVisual: Lelaki aktif bekerja fokus depan komputer, senyum yakin.\nVO: "Secawan Kopi Pahlawan dengan herba premium Tongkat Ali & Maca asli. Halal & bertenaga."\n\n## Scene 3 (8-15s) - CTA\nVisual: Kotak Kopi Pahlawan & badge Promosi Kombo Jimat.\nVO: "Tekan beg kuning sekarang untuk harga pengenalan sebelum stok licin!"',
      targetDate: '2026-09-12',
      attachmentNote: 'Format vertikal 1080x1920 60fps. Margin selamat untuk UI TikTok bawah & kanan.',
      requester: 'Sarah Amin',
      requesterRole: 'E-Commerce Marketing Lead',
      status: 'pending',
      submittedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      comments: [],
      assignedTo: null,
      projectId: null
    },
    {
      id: 'ORD-260904-1003',
      title: 'SuamiSihat Annual Leadership Summit Backdrop',
      entity: 'SSH',
      priority: 'tier_3',
      format: '16_9_landscape',
      copy: '# SuamiSihat Leadership Summit 2026\n\n## Theme\n"Transformasi Kesihatan & Inovasi Lestari Menuju 2030"\n\n## Key Details\n- Tarikh: 28 Oktober 2026\n- Lokasi: Grand Ballroom, Putrajaya\n- Penganjur: SuamiSihat Holding Sdn. Bhd.\n\n## Visual Direction\nElegance, minimalis korporat, sentuhan gradien Falconia Gold dan Deep Obsidian Navy.',
      targetDate: '2026-09-08',
      attachmentNote: 'Resolusi tinggi untuk LED Screen 4K panggung utama.',
      requester: 'Harussani',
      requesterRole: 'Creative Director',
      status: 'pending',
      submittedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      comments: [],
      assignedTo: null,
      projectId: null
    }
  ];
}

function readAllOrders() {
  const filePath = getOrdersFile();
  if (!fs.existsSync(filePath)) {
    // Seed initial orders so all clients immediately have working creative requests
    const seeds = getSeedOrders();
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, seeds.map(o => JSON.stringify(o)).join('\n') + '\n', 'utf8');
      return seeds;
    } catch (e) {
      return seeds;
    }
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); }
      catch { return null; }
    })
    .filter(Boolean);

  if (parsed.length === 0) {
    const seeds = getSeedOrders();
    try {
      fs.writeFileSync(filePath, seeds.map(o => JSON.stringify(o)).join('\n') + '\n', 'utf8');
      return seeds;
    } catch (e) {
      return seeds;
    }
  }

  return parsed;
}

function writeOrders(orders) {
  const filePath = getOrdersFile();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp_' + Date.now();
  fs.writeFileSync(tmp, orders.map(o => JSON.stringify(o)).join('\n') + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

function appendOrder(order) {
  const filePath = getOrdersFile();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(order) + '\n', 'utf8');
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
