const fs = require('fs');
const path = require('path');

const DEFAULT_COMPANIES = [
  {
    code: 'SSH',
    name: 'SuamiSihat Holding Sdn Bhd',
    shortName: 'Holding Group',
    regNo: '202401012345 (1550123-X)',
    address: 'Level 28, Menara SuamiSihat, Jalan Ampang, 50450 Kuala Lumpur, Malaysia',
    contact: '+603-2181-8888 / holding@suamisihat.com',
    location: 'Kuala Lumpur, Malaysia',
    status: 'active',
    isParent: true,
    establishedYear: '2020',
    color: '#022057'
  },
  {
    code: 'SSC',
    name: 'SuamiSihat Healthcare Sdn Bhd',
    shortName: 'Healthcare & Clinic',
    regNo: '202401012346 (1550124-Y)',
    address: 'SuamiSihat Clinic, No. 12, Ground Floor, Jalan Telawi 3, Bangsar, 59100 Kuala Lumpur',
    contact: '+603-2282-7777 / healthcare@suamisihat.com',
    location: 'Bangsar, Kuala Lumpur',
    status: 'active',
    isParent: false,
    establishedYear: '2021',
    color: '#043388'
  },
  {
    code: 'SSW',
    name: 'SuamiSihat Ellness Sdn Bhd',
    shortName: 'Wellness & Nutrition',
    regNo: '202401012347 (1550125-Z)',
    address: 'Unit 3A-01, Oval Damansara, 685 Jalan Damansara, 60000 Kuala Lumpur',
    contact: '+603-7733-6666 / wellness@suamisihat.com',
    location: 'Damansara, Kuala Lumpur',
    status: 'active',
    isParent: false,
    establishedYear: '2022',
    color: '#21A1F7'
  },
  {
    code: 'SSE',
    name: 'SuamiSihat Ecommerce Sdn Bhd',
    shortName: 'E-Commerce & Retail',
    regNo: '202401012348 (1550126-A)',
    address: 'Warehouse Hub 2, Jalan PJU 1A/41B, Ara Damansara, 47301 Petaling Jaya, Selangor',
    contact: '+603-7848-5555 / ecom@suamisihat.com',
    location: 'Petaling Jaya, Selangor',
    status: 'active',
    isParent: false,
    establishedYear: '2023',
    color: '#107C41'
  },
  {
    code: 'SST',
    name: 'SuamiSihat Technology Sdn Bhd',
    shortName: 'Technology & Digital',
    regNo: '202401012349 (1550127-B)',
    address: 'Cyberjaya Tech Park, Block 3, Persiaran APEC, 63000 Cyberjaya, Selangor',
    contact: '+603-8322-4444 / tech@suamisihat.com',
    location: 'Cyberjaya, Selangor',
    status: 'active',
    isParent: false,
    establishedYear: '2024',
    color: '#8764B8'
  }
];

const DEFAULT_STAFF = [
  { staffId: 'SS0004', username: 'harussani', name: 'Harussani', email: 'harussani.suamisihat@gmail.com', role: 'Art Director / Administrator', department: 'Creative Production', defaultBrand: 'SS', avatarColor: '#0078D4', active: true },
  { staffId: 'SS0035', username: 'haikal', name: 'Haikal', email: 'haikal.suamisihat@gmail.com', role: 'Multimedia Designer', department: 'Multimedia & Motion', defaultBrand: 'SS', avatarColor: '#106EBE', active: true },
  { staffId: 'SS0037', username: 'aliff', name: 'Aliff', email: 'aliffnaz.suamisihat@gmail.com', role: 'Multimedia Designer', department: 'Multimedia & Motion', defaultBrand: 'SSE', avatarColor: '#7C3AED', active: true },
  { staffId: 'SS0073', username: 'raihan', name: 'Raihan', email: 'raihan.suamisihat@gmail.com', role: 'Head of Marketing & Sale', department: 'Marketing & Sales', defaultBrand: 'SS', avatarColor: '#D97706', active: true },
  { staffId: 'SS0001', username: 'hasan', name: 'Hasan', email: 'hasan@suamisihat.com', role: 'Chief Executive Officer', department: 'Executive Management', defaultBrand: 'SS', avatarColor: '#21A1F7', active: true },
  { staffId: 'SS0071', username: 'gaddafi', name: 'Gaddafi', email: 'gaddafi@suamisihat.com', role: 'Co-Chief Executive Officer', department: 'Executive Management', defaultBrand: 'SS', avatarColor: '#059669', active: true }
];

const INITIAL_AUDIT_LOG = {
  id: `aud_init_${Date.now()}`,
  timestamp: new Date().toISOString(),
  actor: 'System',
  role: 'Administrator',
  action: 'SYSTEM_INITIALIZED',
  entityType: 'System',
  entityId: 'SS-CAM v4.0.0',
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
