const fs = require('fs');
const path = require('path');
const config = require('../config');

const DEFAULT_COMPANIES = [
  {
    code: 'JOM',
    name: 'JomParking™',
    shortName: 'JomParking',
    regNo: 'MY-KL-1149201',
    address: 'Level 12, Menara LGB, Taman Tun Dr Ismail, 60000 Kuala Lumpur, Malaysia',
    contact: '+60-3-7887-8899 / billing@jomparking.com',
    location: 'Kuala Lumpur, Malaysia',
    status: 'active',
    isParent: true,
    establishedYear: '2016',
    color: '#FF6600'
  },
  {
    code: 'GOV',
    name: 'Govicle®',
    shortName: 'Govicle Mobility',
    regNo: 'MY-SEL-992834',
    address: 'Tech Hub Cyberjaya, Block 3502, Jalan Teknokrat 5, 63000 Cyberjaya, Selangor',
    contact: '+60-3-8322-6677 / accounts@govicle.com',
    location: 'Cyberjaya, Malaysia',
    status: 'active',
    isParent: false,
    establishedYear: '2021',
    color: '#1E40AF'
  },
  {
    code: 'SS',
    name: 'SuamiSihat™',
    shortName: 'SuamiSihat',
    regNo: 'MY-KL-772810',
    address: 'Atelier 08, Bukit Damansara, 50490 Kuala Lumpur, Malaysia',
    contact: '+60-12-345-6789 / creative@suamisihat.myds.me',
    location: 'Kuala Lumpur, Malaysia',
    status: 'active',
    isParent: false,
    establishedYear: '2023',
    color: '#059669'
  },
  {
    code: 'ACME',
    name: 'Acme Corporation',
    shortName: 'Acme Corp',
    regNo: 'US-DEL-202401',
    address: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
    contact: '+1-555-0199 / operations@acme.com',
    location: 'San Francisco, CA',
    status: 'active',
    isParent: false,
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

class CompanyService {
  constructor() {
    this.memoryCompanies = null;
  }

  getStoragePath() {
    const configDir = path.join(config.WORKSPACE_ROOT, '_Team', '_Config');
    if (!fs.existsSync(configDir)) {
      try {
        fs.mkdirSync(configDir, { recursive: true });
      } catch (e) {
        // Fallback to local config if workspace is read-only
      }
    }
    return path.join(configDir, 'companies.json');
  }

  loadCompanies() {
    const p = this.getStoragePath();
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          const hasLegacy = data.some(c => c.code === 'SS' || c.code === 'SSH' || (c.name && c.name.toLowerCase().includes('suamisihat')));
          if (!hasLegacy) {
            this.memoryCompanies = data;
            return this.memoryCompanies;
          }
        }
      } catch (err) {
        console.error('[CompanyService] Error reading companies.json:', err.message);
      }
    }

    // Default Seed
    this.memoryCompanies = JSON.parse(JSON.stringify(DEFAULT_COMPANIES));
    this.persistCompanies();
    return this.memoryCompanies;
  }

  persistCompanies() {
    if (!this.memoryCompanies) return;
    const p = this.getStoragePath();
    try {
      fs.writeFileSync(p, JSON.stringify(this.memoryCompanies, null, 2), 'utf8');
    } catch (err) {
      console.error('[CompanyService] Error writing companies.json:', err.message);
    }
  }

  getAll() {
    if (!this.memoryCompanies) {
      this.loadCompanies();
    }
    return this.memoryCompanies || DEFAULT_COMPANIES;
  }

  getByCode(code) {
    const all = this.getAll();
    return all.find((c) => c.code.toUpperCase() === (code || '').toUpperCase()) || null;
  }

  saveCompany(companyData) {
    if (!companyData || !companyData.code || !companyData.name) {
      throw new Error('Company code and name are required.');
    }

    const all = this.getAll();
    const code = companyData.code.trim().toUpperCase();
    const existingIndex = all.findIndex((c) => c.code.toUpperCase() === code);

    const updatedItem = {
      code,
      name: companyData.name.trim(),
      shortName: companyData.shortName ? companyData.shortName.trim() : code,
      regNo: companyData.regNo ? companyData.regNo.trim() : '',
      address: companyData.address ? companyData.address.trim() : '',
      contact: companyData.contact ? companyData.contact.trim() : '',
      location: companyData.location ? companyData.location.trim() : '',
      status: companyData.status || 'active',
      isParent: Boolean(companyData.isParent),
      establishedYear: companyData.establishedYear || new Date().getFullYear().toString(),
      color: companyData.color || '#043388',
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...updatedItem };
    } else {
      all.push(updatedItem);
    }

    this.memoryCompanies = all;
    this.persistCompanies();
    return updatedItem;
  }

  deleteCompany(code) {
    if (!code) throw new Error('Company code is required.');
    const upper = code.trim().toUpperCase();
    const all = this.getAll();
    const filtered = all.filter((c) => c.code.toUpperCase() !== upper);

    if (filtered.length === all.length) {
      throw new Error(`Company with code "${code}" not found.`);
    }

    this.memoryCompanies = filtered;
    this.persistCompanies();
    return { success: true, deletedCode: upper };
  }
}

module.exports = new CompanyService();
