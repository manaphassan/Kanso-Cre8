const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');

const DELIMITER = '---';

class FrontmatterService {
  /**
   * Reads and parses frontmatter and body from a project's README.md.
   * @param {string} projectFolderPath 
   * @returns {Object} { frontmatter, body, raw, versionHash, exists }
   */
  static readProjectReadme(projectFolderPath) {
    const readmePath = path.join(projectFolderPath, 'README.md');
    if (!fs.existsSync(readmePath)) {
      return {
        exists: false,
        frontmatter: {
          status: 'backlog',
          priority: 'medium',
          revision: 0,
          tags: []
        },
        body: '',
        versionHash: null
      };
    }

    try {
      const raw = fs.readFileSync(readmePath, 'utf8');
      const versionHash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 12);
      const parsed = this.parseRawContent(raw);
      let body = parsed.body;

      if (!body || !body.trim()) {
        const folderName = path.basename(projectFolderPath);
        const titleMatch = folderName.replace(/^\d{6}_([A-Za-z0-9]+)_([A-Za-z0-9]+)_?/, '').replace(/_/g, ' ');
        const cleanTitle = titleMatch || 'Creative Project Brief';

        body = `# 🎨 ${cleanTitle}

## 🎯 Campaign & Objective Overview
Deliver high-converting visual assets, compliant packaging, and campaign creatives according to studio brand standards.

## 📋 Creative Deliverables & Milestones
- [ ] 01. Packaging Box Dieline & Label (AI/PDF, CMYK 300 DPI)
- [ ] 02. Product 3D Render & Mockup (PNG 4K transparent)
- [ ] 03. Social Media Ad Carousel (1080x1080, 5 slides)
- [ ] 04. Short-form Video Hook (9:16, 15s)

## 🧭 Visual Direction & Brand Voice
- **Tone**: Clean, Minimalist, Precision Studio.
- **Primary Palette**: Deep Canvas \`#09090B\`, Electric Sky \`#38BDF8\`, Pure Surface \`#18181B\`.

## 📊 Production & Review Flow
\`\`\`mermaid
flowchart LR
  Intake[📥 Intake & Brief] --> Concept[🎨 Concept & Dieline]
  Concept --> Review[🔍 Art Director Review]
  Review --> Approved[✅ Final Sign-Off]
\`\`\`
`;
      }

      return {
        exists: true,
        frontmatter: parsed.frontmatter,
        body,
        versionHash
      };
    } catch (err) {
      console.error(`[FrontmatterService] Failed to read ${readmePath}:`, err.message);
      return {
        exists: true,
        frontmatter: { status: 'backlog', priority: 'medium', revision: 0, tags: [] },
        body: '',
        versionHash: null,
        error: err.message
      };
    }
  }

  /**
   * Parses raw markdown text containing optional YAML frontmatter.
   */
  static parseRawContent(raw) {
    if (!raw || typeof raw !== 'string') {
      return { frontmatter: {}, body: '' };
    }

    const lines = raw.split(/\r?\n/);
    if (lines.length === 0 || lines[0].trim() !== DELIMITER) {
      return {
        frontmatter: {},
        body: raw.trim()
      };
    }

    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === DELIMITER) {
        endIdx = i;
        break;
      }
    }

    if (endIdx === -1) {
      return {
        frontmatter: {},
        body: raw.trim()
      };
    }

    const yamlBlock = lines.slice(1, endIdx).join('\n');
    const bodyLines = lines.slice(endIdx + 1);
    const body = bodyLines.join('\n').replace(/^[\r\n]+/, '');

    let frontmatter = {};
    try {
      frontmatter = yaml.load(yamlBlock) || {};
    } catch (e) {
      console.warn('[FrontmatterService] YAML parse error, fallback line parsing:', e.message);
      // Fallback simple line-by-line key:value parser
      frontmatter = {};
      for (const line of lines.slice(1, endIdx)) {
        const colon = line.indexOf(':');
        if (colon > 0) {
          const key = line.substring(0, colon).trim();
          const val = line.substring(colon + 1).trim();
          frontmatter[key] = val;
        }
      }
    }

    // Normalize standard fields
    if (typeof frontmatter.tags === 'string') {
      frontmatter.tags = frontmatter.tags
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    } else if (!Array.isArray(frontmatter.tags)) {
      frontmatter.tags = [];
    }

    if (frontmatter.revision !== undefined) {
      frontmatter.revision = parseInt(frontmatter.revision, 10) || 0;
    }

    return { frontmatter, body };
  }

  /**
   * Serializes frontmatter and body into Markdown string.
   */
  static serializeContent(frontmatter, body) {
    // Format YAML frontmatter
    let yamlString = yaml.dump(frontmatter, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    }).trim();

    return `${DELIMITER}\n${yamlString}\n${DELIMITER}\n\n${(body || '').trimStart()}`;
  }

  /**
   * Safely writes updated frontmatter and/or body to README.md atomically.
   * @param {string} projectFolderPath 
   * @param {Object} updatedFrontmatter 
   * @param {string|null} newBody 
   * @param {string|null} expectedHash - Optional OCC hash check
   */
  static writeProjectReadme(projectFolderPath, updatedFrontmatter, newBody = null, expectedHash = null) {
    const readmePath = path.join(projectFolderPath, 'README.md');
    
    let existingBody = '';
    let existingFm = {};

    if (fs.existsSync(readmePath)) {
      const currentRaw = fs.readFileSync(readmePath, 'utf8');
      if (expectedHash) {
        const currentHash = crypto.createHash('sha256').update(currentRaw).digest('hex').substring(0, 12);
        if (currentHash !== expectedHash) {
          throw new Error(`Concurrency Conflict: File was modified by another client (expected ${expectedHash}, got ${currentHash})`);
        }
      }
      const parsed = this.parseRawContent(currentRaw);
      existingFm = parsed.frontmatter;
      existingBody = parsed.body;
    }

    const mergedFrontmatter = {
      ...existingFm,
      ...updatedFrontmatter
    };

    // Validate frontmatter and preserve all keys
    const validation = this.validate('project', mergedFrontmatter);
    if (!validation.valid) {
      console.warn('[FrontmatterService] Validation warnings for project:', validation.errors);
    }
    const finalFrontmatter = validation.data;

    const finalBody = newBody !== null && newBody !== undefined ? newBody : existingBody;
    const finalContent = this.serializeContent(finalFrontmatter, finalBody);

    // Atomic write via temp file
    const tempFile = `${readmePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    fs.writeFileSync(tempFile, finalContent, 'utf8');
    fs.renameSync(tempFile, readmePath);

    const newHash = crypto.createHash('sha256').update(finalContent).digest('hex').substring(0, 12);
    return { success: true, versionHash: newHash, frontmatter: finalFrontmatter, body: finalBody };
  }

  /**
   * Validates frontmatter data against the schema for a given document type.
   * Unknown keys are strictly preserved and never dropped.
   * 
   * @param {string} type - 'project' | 'client' | 'quote' | 'invoice' | 'journal_day' | 'note'
   * @param {Object} data - Raw frontmatter dictionary
   * @returns {{ valid: boolean, errors: string[], data: Object }}
   */
  static validate(type, data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        valid: false,
        errors: ['Frontmatter data must be a non-null object'],
        data: data || {}
      };
    }

    // Preserve all unknown and custom user keys
    const validated = { ...data };
    const errors = [];

    const normType = String(type || '').toLowerCase();

    // Helper: validate ISO date YYYY-MM-DD
    const isIsoDate = (str) => {
      if (!str || typeof str !== 'string') return false;
      return /^\d{4}-\d{2}-\d{2}$/.test(str.trim());
    };

    switch (normType) {
      case 'project': {
        const allowedStatuses = ['backlog', 'in-progress', 'in_progress', 'review', 'revision', 'approved', 'archived', 'done', 'completed'];
        if (validated.status && !allowedStatuses.includes(String(validated.status).toLowerCase())) {
          errors.push(`Invalid project status: "${validated.status}". Expected one of: ${allowedStatuses.join(', ')}`);
        }
        if (validated.revision !== undefined) {
          const rev = Number(validated.revision);
          if (isNaN(rev) || rev < 0) {
            errors.push(`Project revision must be a non-negative integer, got: ${validated.revision}`);
          } else {
            validated.revision = Math.floor(rev);
          }
        }
        if (validated.deadline && !isIsoDate(validated.deadline)) {
          errors.push(`Project deadline must be an ISO date (YYYY-MM-DD), got: ${validated.deadline}`);
        }
        if (validated.created && !isIsoDate(validated.created)) {
          errors.push(`Project created date must be an ISO date (YYYY-MM-DD), got: ${validated.created}`);
        }
        if (validated.tags) {
          if (typeof validated.tags === 'string') {
            validated.tags = validated.tags.replace(/^\[|\]$/g, '').split(',').map(t => t.trim()).filter(Boolean);
          } else if (!Array.isArray(validated.tags)) {
            errors.push('Project tags must be an array of strings');
          }
        }
        break;
      }

      case 'client': {
        if (!validated.code) {
          errors.push('Client code is required');
        } else if (!/^[A-Za-z0-9_-]{2,8}$/.test(String(validated.code).trim())) {
          errors.push(`Client code should be 2-8 alphanumeric characters, got: "${validated.code}"`);
        }
        if (!validated.name) {
          errors.push('Client name is required');
        }
        if (validated.default_hourly_rate !== undefined && (isNaN(Number(validated.default_hourly_rate)) || Number(validated.default_hourly_rate) < 0)) {
          errors.push('Client default_hourly_rate must be a non-negative number');
        }
        if (validated.payment_terms_days !== undefined && (isNaN(Number(validated.payment_terms_days)) || Number(validated.payment_terms_days) < 0)) {
          errors.push('Client payment_terms_days must be a non-negative integer');
        }
        break;
      }

      case 'quote': {
        const docNum = validated.documentNumber || validated.id;
        if (!docNum) {
          errors.push('Quote requires a documentNumber or id');
        }
        if (validated.date && !isIsoDate(validated.date)) {
          errors.push(`Quote date must be an ISO date (YYYY-MM-DD), got: ${validated.date}`);
        }
        if (validated.valid_until && !isIsoDate(validated.valid_until)) {
          errors.push(`Quote valid_until must be an ISO date (YYYY-MM-DD), got: ${validated.valid_until}`);
        }
        if (validated.items && !Array.isArray(validated.items)) {
          errors.push('Quote items must be an array');
        }
        break;
      }

      case 'invoice': {
        const docNum = validated.documentNumber || validated.id;
        if (!docNum) {
          errors.push('Invoice requires a documentNumber or id');
        }
        if (validated.date && !isIsoDate(validated.date)) {
          errors.push(`Invoice date must be an ISO date (YYYY-MM-DD), got: ${validated.date}`);
        }
        if (validated.due_date && !isIsoDate(validated.due_date)) {
          errors.push(`Invoice due_date must be an ISO date (YYYY-MM-DD), got: ${validated.due_date}`);
        }
        if (validated.items && !Array.isArray(validated.items)) {
          errors.push('Invoice items must be an array');
        }
        break;
      }

      case 'journal_day':
      case 'journal_daily':
      case 'daily':
      case 'daily_log': {
        if (!validated.date) {
          errors.push('Daily journal note requires a date');
        } else if (!isIsoDate(validated.date)) {
          errors.push(`Daily journal date must be an ISO date (YYYY-MM-DD), got: ${validated.date}`);
        }
        if (validated.habits && !Array.isArray(validated.habits)) {
          errors.push('habits must be an array of strings');
        }
        break;
      }

      case 'note':
      case 'atomic_note': {
        if (!validated.title && !validated.id) {
          errors.push('Atomic note requires a title or id');
        }
        const allowedCategories = ['fleeting', 'literature', 'permanent'];
        const cat = validated.category || validated.type;
        if (cat && !allowedCategories.includes(String(cat).toLowerCase())) {
          errors.push(`Invalid note category: "${cat}". Expected one of: ${allowedCategories.join(', ')}`);
        }
        break;
      }

      default:
        // Generic document type: preserve all keys
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      data: validated
    };
  }
}

module.exports = FrontmatterService;
