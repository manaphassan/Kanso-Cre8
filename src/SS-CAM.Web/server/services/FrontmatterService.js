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

      return {
        exists: true,
        frontmatter: parsed.frontmatter,
        body: parsed.body,
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

    const finalBody = newBody !== null && newBody !== undefined ? newBody : existingBody;
    const finalContent = this.serializeContent(mergedFrontmatter, finalBody);

    // Atomic write via temp file
    const tempFile = `${readmePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    fs.writeFileSync(tempFile, finalContent, 'utf8');
    fs.renameSync(tempFile, readmePath);

    const newHash = crypto.createHash('sha256').update(finalContent).digest('hex').substring(0, 12);
    return { success: true, versionHash: newHash, frontmatter: mergedFrontmatter, body: finalBody };
  }
}

module.exports = FrontmatterService;
