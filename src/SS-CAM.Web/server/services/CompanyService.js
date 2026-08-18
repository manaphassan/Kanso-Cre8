const fs = require('fs');
const path = require('path');
const config = require('../config');

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
          this.memoryCompanies = data;
          return this.memoryCompanies;
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
