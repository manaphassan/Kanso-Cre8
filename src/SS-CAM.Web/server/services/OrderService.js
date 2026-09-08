/**
 * OrderService.js — Creative Request Order Management & NAS Attachment Vault
 * Persists creative order submissions to JSON-Lines and manages temporary reference
 * attachment storage in \\SSNAS\Creative-Team\_Orders\<ORDER_ID>\.
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const config = require('../config');

// ─── NAS Directory & Storage Helpers ──────────────────────────────────────────

/**
 * Resolves the root _Orders folder on the Synology NAS / workspace.
 * Creates the folder if it does not exist.
 */
function getOrdersVaultDir() {
  const ordersDir = path.join(config.WORKSPACE_ROOT, '_Orders');
  if (!fs.existsSync(ordersDir)) {
    try {
      fs.mkdirSync(ordersDir, { recursive: true });
    } catch (e) {
      console.error('[OrderService] Failed to create _Orders directory:', e.message);
    }
  }
  return ordersDir;
}

/**
 * Resolves the per-order folder inside _Orders/<orderId>/.
 */
function getOrderDir(orderId) {
  const safeId = path.basename(orderId);
  const orderDir = path.join(getOrdersVaultDir(), safeId);
  if (!fs.existsSync(orderDir)) {
    try {
      fs.mkdirSync(orderDir, { recursive: true });
    } catch (e) {
      console.error(`[OrderService] Failed to create order folder for ${safeId}:`, e.message);
    }
  }
  return orderDir;
}

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

/**
 * Resolves the persistent orders database JSONL file.
 * Prioritizes the NAS workspace (_Orders/creative-orders.jsonl) with fallback to _Team/Orders or server/data.
 */
function getOrdersFilePath() {
  const nasOrdersFile = path.join(getOrdersVaultDir(), 'creative-orders.jsonl');
  if (fs.existsSync(nasOrdersFile)) return nasOrdersFile;

  if (config && config.WORKSPACE_ROOT) {
    const wsTeamOrders = path.join(config.WORKSPACE_ROOT, '_Team', 'Orders', 'creative-orders.jsonl');
    if (fs.existsSync(wsTeamOrders)) return wsTeamOrders;
  }

  const localDir = path.join(__dirname, '..', 'data');
  const localFile = path.join(localDir, 'creative-orders.jsonl');

  if (fs.existsSync(localFile)) {
    try {
      fs.copyFileSync(localFile, nasOrdersFile);
      return nasOrdersFile;
    } catch (e) {
      return localFile;
    }
  }

  try {
    const dir = getOrdersVaultDir();
    if (fs.existsSync(dir)) return nasOrdersFile;
  } catch (e) {}

  if (!fs.existsSync(localDir)) {
    try { fs.mkdirSync(localDir, { recursive: true }); } catch (e) {}
  }
  return localFile;
}

function readAllOrders() {
  const filePath = getOrdersFilePath();
  if (!fs.existsSync(filePath)) {
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

  try {
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
  } catch (err) {
    console.error('[OrderService] readAllOrders error:', err.message);
    return [];
  }
}

function writeOrders(orders) {
  const filePath = getOrdersFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp_' + Date.now();
  fs.writeFileSync(tmp, orders.map(o => JSON.stringify(o)).join('\n') + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

function appendOrder(order) {
  const filePath = getOrdersFilePath();
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

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Attachment Operations ───────────────────────────────────────────────────

/**
 * List all attachments physically stored in _Orders/<orderId>/.
 */
function listOrderAttachments(orderId) {
  const safeId = path.basename(orderId);
  const dir = path.join(getOrdersVaultDir(), safeId);
  if (!fs.existsSync(dir)) return [];

  try {
    const files = fs.readdirSync(dir);
    return files
      .filter(f => !f.startsWith('.') && !f.startsWith('~') && f !== 'creative-orders.jsonl')
      .map(filename => {
        const filePath = path.join(dir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          uploadedAt: stats.mtime.toISOString(),
          url: `/api/orders/${encodeURIComponent(safeId)}/attachments/${encodeURIComponent(filename)}`
        };
      });
  } catch (err) {
    console.error(`[OrderService] listOrderAttachments error for ${orderId}:`, err.message);
    return [];
  }
}

/**
 * Save an attachment to an order's NAS folder.
 * Accepts Buffer or base64 data string.
 */
function saveOrderAttachment(orderId, filename, data, actor = 'Requester') {
  const safeId = path.basename(orderId);
  const safeFilename = path.basename(filename).replace(/[\/\\:*?"<>|]/g, '_');
  if (!safeFilename) throw new Error('Invalid filename.');

  const dir = getOrderDir(safeId);
  const targetPath = path.join(dir, safeFilename);

  const buffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.replace(/^data:.*?;base64,/, ''), 'base64');

  fs.writeFileSync(targetPath, buffer);

  const attachments = listOrderAttachments(safeId);
  updateOrder(safeId, { attachments });

  return {
    filename: safeFilename,
    size: buffer.length,
    sizeFormatted: formatFileSize(buffer.length),
    uploadedAt: new Date().toISOString(),
    url: `/api/orders/${encodeURIComponent(safeId)}/attachments/${encodeURIComponent(safeFilename)}`
  };
}

/**
 * Resolves the physical path of an order attachment for downloading or inline preview.
 */
function getOrderAttachmentPath(orderId, filename) {
  const safeId = path.basename(orderId);
  const safeFilename = path.basename(filename);
  const filePath = path.join(getOrdersVaultDir(), safeId, safeFilename);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

/**
 * Delete a specific attachment from the order folder.
 */
function deleteOrderAttachment(orderId, filename) {
  const safeId = path.basename(orderId);
  const safeFilename = path.basename(filename);
  const filePath = path.join(getOrdersVaultDir(), safeId, safeFilename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (e) {}
  }
  const attachments = listOrderAttachments(safeId);
  updateOrder(safeId, { attachments });
  return { success: true, remaining: attachments };
}

/**
 * Ingest / copy all attachments from _Orders/<orderId>/ into the target project's 01_BRIEF_ASSETS.
 */
function copyAttachmentsToProject(orderId, projectId, actor = 'Designer') {
  const safeId = path.basename(orderId);
  const orderDir = path.join(getOrdersVaultDir(), safeId);
  if (!fs.existsSync(orderDir)) {
    throw new Error(`Order folder "${safeId}" does not exist on NAS.`);
  }

  const WorkspaceService = require('./WorkspaceService');
  const project = WorkspaceService.getProjectById(projectId);
  if (!project) {
    throw new Error(`Project "${projectId}" not found in workspace.`);
  }

  const briefAssetsDir = path.join(project.fullPath, '01_BRIEF_ASSETS');
  if (!fs.existsSync(briefAssetsDir)) {
    fs.mkdirSync(briefAssetsDir, { recursive: true });
  }

  const files = fs.readdirSync(orderDir).filter(f => !f.startsWith('.'));
  const copied = [];

  for (const file of files) {
    const srcPath = path.join(orderDir, file);
    try {
      const stat = fs.statSync(srcPath);
      if (stat.isFile()) {
        const destPath = path.join(briefAssetsDir, file);
        fs.copyFileSync(srcPath, destPath);
        copied.push({ filename: file, size: stat.size, sizeFormatted: formatFileSize(stat.size) });
      }
    } catch (e) {
      console.error(`[OrderService] Failed to copy file ${file}:`, e.message);
    }
  }

  // Link project in order metadata
  updateOrder(safeId, { projectId: project.jobId || project.id });

  return {
    success: true,
    copiedFiles: copied,
    count: copied.length,
    destination: '01_BRIEF_ASSETS',
    projectFolder: project.fullPath
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * List all creative orders, newest first, enriched with live attachment lists.
 * @param {object} [filters] Optional { status, entity, priority }
 */
function listOrders(filters = {}) {
  let orders = readAllOrders().reverse();
  if (filters.status   && filters.status   !== 'all') orders = orders.filter(o => o.status   === filters.status);
  if (filters.entity   && filters.entity   !== 'all') orders = orders.filter(o => o.entity   === filters.entity);
  if (filters.priority && filters.priority !== 'all') orders = orders.filter(o => o.priority === filters.priority);

  return orders.map(o => {
    const liveAttachments = listOrderAttachments(o.id);
    const nasPath = path.join(getOrdersVaultDir(), o.id);
    return {
      ...o,
      attachments: liveAttachments,
      attachmentCount: liveAttachments.length,
      nasPath
    };
  });
}

/**
 * Get a single order by ID, enriched with live attachment list and NAS path.
 */
function getOrder(id) {
  const order = readAllOrders().find(o => o.id === id) || null;
  if (!order) return null;
  const liveAttachments = listOrderAttachments(order.id);
  const nasPath = path.join(getOrdersVaultDir(), order.id);
  return {
    ...order,
    attachments: liveAttachments,
    attachmentCount: liveAttachments.length,
    nasPath
  };
}

/**
 * Submit a new creative order with optional attachments.
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
    attachments: incomingAttachments
  } = payload;

  // Validation
  if (!title || !title.trim())      throw new Error('Project title is required.');
  if (!entity)                       throw new Error('Requesting entity is required.');
  if (!priority)                     throw new Error('Priority tier is required.');
  if (!format)                       throw new Error('Format & size is required.');
  if (!copy || !copy.trim())         throw new Error('Copy / script field is required.');
  if (!targetDate)                   throw new Error('Target date is required.');

  const id = generateOrderId();
  const nasPath = path.join(getOrdersVaultDir(), id);

  const order = {
    id,
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
    projectId:      null,
    attachments:    [],
    nasPath
  };

  appendOrder(order);

  // If any initial attachments were provided, save them now
  if (Array.isArray(incomingAttachments) && incomingAttachments.length > 0) {
    for (const att of incomingAttachments) {
      if (att.filename && (att.fileData || att.data || att.buffer)) {
        try {
          saveOrderAttachment(id, att.filename, att.fileData || att.data || att.buffer, requester);
        } catch (e) {
          console.error(`[OrderService] Failed to save initial attachment ${att.filename}:`, e.message);
        }
      }
    }
  }

  return getOrder(id);
}

/**
 * Update order status, assignment, or project linking.
 * Allowed status transitions: pending → in_progress → for_approval → done | cancelled
 */
function updateOrder(id, patch) {
  const orders = readAllOrders();
  const idx    = orders.findIndex(o => o.id === id);
  if (idx === -1) throw new Error(`Order "${id}" not found.`);

  const allowed = ['status', 'assignedTo', 'projectId', 'comments', 'internalNote', 'attachments'];
  const updated = { ...orders[idx], updatedAt: new Date().toISOString() };
  for (const key of allowed) {
    if (patch[key] !== undefined) updated[key] = patch[key];
  }

  orders[idx] = updated;
  writeOrders(orders);
  return getOrder(id);
}

/**
 * Delete / cancel an order (soft-delete via status).
 */
function cancelOrder(id) {
  return updateOrder(id, { status: 'cancelled' });
}

module.exports = {
  getOrdersVaultDir,
  getOrderDir,
  listOrders,
  getOrder,
  submitOrder,
  updateOrder,
  cancelOrder,
  listOrderAttachments,
  saveOrderAttachment,
  getOrderAttachmentPath,
  deleteOrderAttachment,
  copyAttachmentsToProject,
};
