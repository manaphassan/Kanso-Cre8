const fs = require('fs');
const path = require('path');

const DEFAULT_COMPANIES = [
  {
    code: 'ACME',
    name: 'Acme Corporation',
    shortName: 'Acme Corp',
    regNo: 'US-DEL-202401',
    address: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
    contact: '+1-555-0199 / operations@acme.com',
    location: 'San Francisco, CA',
    status: 'active',
    isParent: true,
    establishedYear: '2020',
    color: '#0284C7'
  },
  {
    code: 'NEX',
    name: 'Nexus Studio',
    shortName: 'Nexus Creative',
    regNo: 'UK-LON-889201',
    address: '42 Shoreditch High St, Hackney, London E1 6JJ, UK',
    contact: '+44-20-7946-0912 / hello@nexusstudio.io',
    location: 'London, UK',
    status: 'active',
    isParent: false,
    establishedYear: '2022',
    color: '#8B5CF6'
  },
  {
    code: 'LUM',
    name: 'Lumina Labs',
    shortName: 'Lumina Research',
    regNo: 'SG-UEN-202399',
    address: '71 Ayer Rajah Crescent, #03-01, Singapore 139951',
    contact: '+65-6789-0123 / contact@luminalabs.dev',
    location: 'Singapore',
    status: 'active',
    isParent: false,
    establishedYear: '2023',
    color: '#10B981'
  }
];

const DEFAULT_STAFF = [
  { staffId: 'ACME001', username: 'harussani', name: 'Harussani', email: 'harussani@acme.com', role: 'Art Director / Administrator', department: 'Creative Production', defaultBrand: 'ACME', avatarColor: '#0284C7', active: true },
  { staffId: 'NEX002', username: 'alex', name: 'Alex Vance', email: 'alex@nexusstudio.io', role: 'Multimedia Designer', department: 'Multimedia & Motion', defaultBrand: 'NEX', avatarColor: '#8B5CF6', active: true },
  { staffId: 'LUM003', username: 'elena', name: 'Elena Rostova', email: 'elena@luminalabs.dev', role: 'Creative Strategist', department: 'Research & Strategy', defaultBrand: 'LUM', avatarColor: '#10B981', active: true },
  { staffId: 'ACME004', username: 'marcus', name: 'Marcus Brody', email: 'marcus@acme.com', role: 'Lead Copywriter', department: 'Content & Copy', defaultBrand: 'ACME', avatarColor: '#F59E0B', active: true },
  { staffId: 'NEX005', username: 'maya', name: 'Maya Lin', email: 'maya@nexusstudio.io', role: 'Senior Designer', department: 'Brand & Identity', defaultBrand: 'NEX', avatarColor: '#EC4899', active: true },
  { staffId: 'LUM006', username: 'david', name: 'David Chen', email: 'david@luminalabs.dev', role: 'Motion Graphic Designer', department: 'Multimedia & Motion', defaultBrand: 'LUM', avatarColor: '#6366F1', active: true }
];

const INITIAL_AUDIT_LOG = {
  id: `aud_init_${Date.now()}`,
  timestamp: new Date().toISOString(),
  actor: 'System',
  role: 'Administrator',
  action: 'SYSTEM_INITIALIZED',
  entityType: 'System',
  entityId: 'Kanso Cre8 v1.0.0',
  details: { message: 'Fresh install metadata reset completed successfully.' }
};

const targetDirs = [
  'E:\\SynologyDrive\\Creative-Team',
  '\\\\SSNAS\\Creative-Team',
  path.resolve(__dirname, '../sample-workspace')
];

function deleteFolderRecursive(itemPath) {
  if (fs.existsSync(itemPath)) {
    const entries = fs.readdirSync(itemPath);
    for (const file of entries) {
      const curPath = path.join(itemPath, file);
      try {
        if (fs.lstatSync(curPath).isDirectory()) {
          deleteFolderRecursive(curPath);
        } else {
          try { fs.chmodSync(curPath, 0o666); } catch (e) {}
          fs.unlinkSync(curPath);
        }
      } catch (err) {
        // Retry with force
      }
    }
    try {
      fs.rmdirSync(itemPath);
    } catch (e) {
      try { fs.rmSync(itemPath, { recursive: true, force: true }); } catch (e2) {}
    }
  }
}

for (const dir of targetDirs) {
  try {
    if (!fs.existsSync(dir)) continue;
    const teamDir = path.join(dir, '_Team');
    const configDir = path.join(teamDir, '_Config');

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write fresh companies.json
    fs.writeFileSync(path.join(configDir, 'companies.json'), JSON.stringify(DEFAULT_COMPANIES, null, 2), 'utf8');
    // Write fresh staff_directory.json
    fs.writeFileSync(path.join(configDir, 'staff_directory.json'), JSON.stringify(DEFAULT_STAFF, null, 2), 'utf8');
    // Write clean audit-log.jsonl
    fs.writeFileSync(path.join(teamDir, 'audit-log.jsonl'), JSON.stringify(INITIAL_AUDIT_LOG) + '\n', 'utf8');

    // Remove all project and sub-directories (except _Team, #recycle, and hidden files)
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '_Team' || entry.name === '#recycle' || entry.name.startsWith('.')) continue;
      const fullEntryPath = path.join(dir, entry.name);
      try {
        deleteFolderRecursive(fullEntryPath);
        console.log(`[RESET] Removed project directory: ${fullEntryPath}`);
      } catch (rmErr) {
        console.warn(`[RESET] Could not remove ${fullEntryPath}:`, rmErr.message);
      }
    }

    console.log(`[RESET] Clean fresh install metadata written to: ${teamDir}`);
  } catch (err) {
    console.warn(`[RESET] Skipping inaccessible target ${dir}:`, err.message);
  }
}
