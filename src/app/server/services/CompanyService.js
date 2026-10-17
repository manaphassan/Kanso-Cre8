const fs = require('fs');
const path = require('path');
const config = require('../config');
const FrontmatterService = require('./FrontmatterService');

/**
 * CompanyService (Client Hub) — Kanso Cre8
 *
 * Law: _Clients/<CODE>_<Name>/client.md is the sole source of truth for clients.
 * Zero JSON files in _Team/_Config/companies.json.
 */

const CANONICAL_SEEDS = [
  {
    folder: 'ACME_AcmeCorp',
    file: 'client.md',
    frontmatter: {
      id: 'acmecorp',
      name: 'Acme Corporation',
      code: 'ACME',
      contact_person: 'Sarah Jenkins',
      email: 'operations@acme.com',
      phone: '+1-555-0199',
      billing_address: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
      currency: 'USD',
      default_hourly_rate: 125,
      payment_terms_days: 15,
      palette: {
        primary: '#0066FF',
        secondary: '#0052CC',
        dark: '#0A0D14',
        light: '#F8FAFC',
        accent: '#00F0FF'
      },
      tags: ['fintech', 'banking', '3d', 'mobile'],
      isParent: true,
      establishedYear: '2020',
      status: 'active'
    },
    body: `# Acme Corporation (ACME)\n\n## Creative Direction\nModern, trustworthy, tech-forward fintech. Premium 3D isometric depth with cyber cyan accents.\n\n## Active Projects\n- \`202609_0001D_ACME_MobileAppIllustration\`\n`
  },
  {
    folder: 'NEX_NexusStudio',
    file: 'client.md',
    frontmatter: {
      id: 'nexusstudio',
      name: 'Nexus Studio',
      code: 'NEX',
      contact_person: 'Marcus Vance',
      email: 'hello@nexusstudio.io',
      phone: '+44-20-7946-0912',
      billing_address: '42 Shoreditch High St, Hackney, London E1 6JJ, UK',
      currency: 'USD',
      default_hourly_rate: 110,
      payment_terms_days: 14,
      palette: {
        primary: '#10B981',
        secondary: '#059669',
        dark: '#18181B',
        light: '#F0FDF4',
        accent: '#38BDF8'
      },
      tags: ['gaming', 'keyvisual', 'motion', '3d'],
      isParent: false,
      establishedYear: '2022',
      status: 'active'
    },
    body: `# Nexus Studio (NEX)\n\n## Creative Direction\nHigh contrast cyberpunk gaming aesthetic with neon emerald and cyan highlights.\n\n## Active Projects\n- \`202609_0002S_NEX_GameKeyVisual\`\n`
  },
  {
    folder: 'LUM_LuminaLabs',
    file: 'client.md',
    frontmatter: {
      id: 'luminalabs',
      name: 'Lumina Labs',
      code: 'LUM',
      contact_person: 'Elena Rostova',
      email: 'contact@luminalabs.dev',
      phone: '+65-6789-0123',
      billing_address: '71 Ayer Rajah Crescent, #03-01, Singapore 139951',
      currency: 'USD',
      default_hourly_rate: 140,
      payment_terms_days: 30,
      palette: {
        primary: '#8B5CF6',
        secondary: '#7C3AED',
        dark: '#09090B',
        light: '#FAF5FF',
        accent: '#F43F5E'
      },
      tags: ['ai', 'machine-learning', 'brand-identity', 'design-system'],
      isParent: false,
      establishedYear: '2023',
      status: 'active'
    },
    body: `# Lumina Labs (LUM)\n\n## Creative Direction\nIntelligent, refined visual language for artificial intelligence architecture. Violet & slate minimalism.\n\n## Active Projects\n- \`202609_0003P_LUM_BrandIdentity\`\n`
  }
];

class CompanyService {
  constructor() {
    this.memoryCompanies = null;
  }

  getClientsDir() {
    const clientsDir = path.join(config.WORKSPACE_ROOT, '_Clients');
    if (!fs.existsSync(clientsDir)) {
      try {
        fs.mkdirSync(clientsDir, { recursive: true });
      } catch (err) {
        console.warn('[CompanyService] Failed to create _Clients dir:', err.message);
      }
    }
    return clientsDir;
  }

  ensureCanonicalSeeds() {
    const clientsDir = this.getClientsDir();
    for (const seed of CANONICAL_SEEDS) {
      const folderPath = path.join(clientsDir, seed.folder);
      const filePath = path.join(folderPath, seed.file);
      if (!fs.existsSync(filePath)) {
        try {
          fs.mkdirSync(folderPath, { recursive: true });
          const content = FrontmatterService.serializeContent(seed.frontmatter, seed.body);
          fs.writeFileSync(filePath, content, 'utf8');
        } catch (err) {
          console.warn(`[CompanyService] Failed to seed ${seed.folder}:`, err.message);
        }
      }
    }
  }

  getAll() {
    const clientsDir = this.getClientsDir();
    if (!fs.existsSync(clientsDir)) {
      this.ensureCanonicalSeeds();
    }

    let entries = [];
    try {
      entries = fs.readdirSync(clientsDir, { withFileTypes: true });
    } catch (err) {
      return CANONICAL_SEEDS.map(s => this._normalizeClient(s.frontmatter, s.body, s.folder, ''));
    }

    const clientFolders = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'));
    if (clientFolders.length === 0) {
      this.ensureCanonicalSeeds();
      try {
        entries = fs.readdirSync(clientsDir, { withFileTypes: true });
      } catch (_) {}
    }

    const results = [];
    for (const folder of entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('_'))) {
      const folderPath = path.join(clientsDir, folder.name);
      const filePath = path.join(folderPath, 'client.md');
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const { frontmatter, body } = FrontmatterService.parseRawContent(raw);
          results.push(this._normalizeClient(frontmatter, body, folder.name, filePath));
        } catch (err) {
          console.warn(`[CompanyService] Error reading ${filePath}:`, err.message);
        }
      }
    }

    if (results.length === 0) {
      return CANONICAL_SEEDS.map(s => this._normalizeClient(s.frontmatter, s.body, s.folder, ''));
    }

    // Sort: ACME first, then alphabetical by code
    results.sort((a, b) => {
      if (a.code === 'ACME') return -1;
      if (b.code === 'ACME') return 1;
      return a.code.localeCompare(b.code);
    });

    this.memoryCompanies = results;
    return results;
  }

  loadCompanies() {
    return this.getAll();
  }

  getByCode(code) {
    if (!code) return null;
    const cleanCode = String(code).trim().toUpperCase();
    const all = this.getAll();
    return all.find(c => c.code === cleanCode) || null;
  }

  saveCompany(companyData) {
    if (!companyData || !companyData.code || !companyData.name) {
      throw new Error('Company code and name are required.');
    }

    const clientsDir = this.getClientsDir();
    const code = String(companyData.code).trim().toUpperCase();
    const name = String(companyData.name).trim();

    // Look for existing folder matching this code
    let targetFolder = null;
    try {
      const items = fs.readdirSync(clientsDir, { withFileTypes: true });
      const match = items.find(e => e.isDirectory() && e.name.toUpperCase().startsWith(`${code}_`));
      if (match) {
        targetFolder = match.name;
      }
    } catch (_) {}

    if (!targetFolder) {
      const safeName = name.replace(/[^a-zA-Z0-9]/g, '');
      targetFolder = `${code}_${safeName}`;
    }

    const folderPath = path.join(clientsDir, targetFolder);
    const filePath = path.join(folderPath, 'client.md');
    fs.mkdirSync(folderPath, { recursive: true });

    let existingFm = {};
    let existingBody = `# ${name} (${code})\n\n## Creative Direction\nMindful craft and studio design systems.\n`;

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = FrontmatterService.parseRawContent(raw);
        existingFm = parsed.frontmatter || {};
        if (parsed.body && parsed.body.trim()) {
          existingBody = parsed.body;
        }
      } catch (_) {}
    }

    const mergedFm = {
      ...existingFm,
      id: existingFm.id || code.toLowerCase(),
      name,
      code,
      shortName: companyData.shortName || existingFm.shortName || code,
      contact_person: companyData.contactPerson || companyData.contact_person || companyData.contact || existingFm.contact_person || '',
      email: companyData.email || existingFm.email || '',
      phone: companyData.phone || existingFm.phone || '',
      billing_address: companyData.billingAddress || companyData.billing_address || companyData.address || existingFm.billing_address || '',
      location: companyData.location || existingFm.location || '',
      currency: companyData.currency || existingFm.currency || 'USD',
      default_hourly_rate: companyData.defaultHourlyRate || companyData.default_hourly_rate || existingFm.default_hourly_rate || 150,
      payment_terms_days: companyData.paymentTermsDays || companyData.payment_terms_days || existingFm.payment_terms_days || 14,
      palette: companyData.palette || existingFm.palette || {
        primary: companyData.color || '#0284C7',
        secondary: '#0052CC',
        dark: '#0A0D14',
        light: '#F8FAFC',
        accent: '#00F0FF'
      },
      tags: companyData.tags || existingFm.tags || ['client'],
      status: companyData.status || existingFm.status || 'active',
      isParent: companyData.isParent !== undefined ? Boolean(companyData.isParent) : (code === 'ACME' || Boolean(existingFm.isParent)),
      establishedYear: companyData.establishedYear || existingFm.establishedYear || new Date().getFullYear().toString(),
      regNo: companyData.regNo || companyData.registration_no || existingFm.regNo || '',
      updatedAt: new Date().toISOString()
    };

    if (companyData.color) {
      mergedFm.palette.primary = companyData.color;
    }

    const validation = FrontmatterService.validate('client', mergedFm);
    if (!validation.valid) {
      console.warn('[CompanyService] Client validation warnings:', validation.errors);
    }
    const finalFm = validation.data;

    const serialized = FrontmatterService.serializeContent(finalFm, existingBody);
    FrontmatterService.writeAtomic(filePath, serialized, 'utf8');

    return this._normalizeClient(finalFm, existingBody, targetFolder, filePath);
  }

  deleteCompany(code) {
    if (!code) throw new Error('Company code is required.');
    const cleanCode = String(code).trim().toUpperCase();
    const clientsDir = this.getClientsDir();

    let deleted = false;
    try {
      const items = fs.readdirSync(clientsDir, { withFileTypes: true });
      const match = items.find(e => e.isDirectory() && e.name.toUpperCase().startsWith(`${cleanCode}_`));
      if (match) {
        const folderPath = path.join(clientsDir, match.name);
        fs.rmSync(folderPath, { recursive: true, force: true });
        deleted = true;
      }
    } catch (err) {
      throw new Error(`Failed to delete client ${cleanCode}: ${err.message}`);
    }

    if (!deleted) {
      throw new Error(`Company with code "${code}" not found.`);
    }

    return { success: true, deletedCode: cleanCode };
  }

  _normalizeClient(fm, body, folderName, filePath) {
    const code = (fm.code || folderName.split('_')[0] || '').toUpperCase();
    const name = fm.name || folderName.replace(/^[A-Z0-9]+_/, '').replace(/_/g, ' ');
    const shortName = fm.shortName || fm.code || folderName.split('_')[0];
    const contactPerson = fm.contact_person || fm.contactPerson || '';
    const email = fm.email || '';
    const phone = fm.phone || '';
    const contactStr = fm.contact || (contactPerson ? `${phone} / ${email}`.trim().replace(/^ \/ | \/ $/, '') : '');
    const address = fm.billing_address || fm.address || '';
    const palette = fm.palette || {
      primary: fm.color || '#0284C7',
      secondary: '#0052CC',
      dark: '#0A0D14',
      light: '#F8FAFC',
      accent: '#00F0FF'
    };
    const color = palette.primary || fm.color || '#0284C7';

    return {
      code,
      name,
      shortName,
      id: fm.id || code.toLowerCase(),
      contact: contactStr,
      contactPerson,
      email,
      phone,
      address,
      billingAddress: address,
      location: fm.location || (address ? address.split(',').slice(-2).join(',').trim() : ''),
      currency: fm.currency || 'USD',
      defaultHourlyRate: fm.default_hourly_rate || fm.defaultHourlyRate || 150,
      paymentTermsDays: fm.payment_terms_days || fm.paymentTermsDays || 14,
      palette,
      color,
      tags: fm.tags || [],
      status: fm.status || 'active',
      isParent: fm.isParent !== undefined ? Boolean(fm.isParent) : (code === 'ACME'),
      establishedYear: fm.establishedYear || '2026',
      regNo: fm.regNo || fm.registration_no || '',
      notes: (body || '').replace(/^#\s+[^\n]+/, '').trim(),
      folderName,
      filePath
    };
  }
}

module.exports = new CompanyService();
