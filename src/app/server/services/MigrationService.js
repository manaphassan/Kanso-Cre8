const fs = require('fs');
const path = require('path');
const config = require('../config');
const AuditService = require('./AuditService');

class MigrationService {
  constructor() {
    this.workspaceRoot = config.WORKSPACE_ROOT;
  }

  /**
   * Recursively scan a source directory and preview how files will be mapped into Kanso's canonical 8-folder vault.
   * @param {string} sourceDir Absolute path to Obsidian vault or Notion export folder
   * @returns {Object} Preview manifest with categorizations, counts, and items
   */
  preview(sourceDir) {
    if (!sourceDir || !fs.existsSync(sourceDir)) {
      throw new Error(`Source directory does not exist: ${sourceDir}`);
    }

    const stat = fs.statSync(sourceDir);
    if (!stat.isDirectory()) {
      throw new Error(`Source path must be a directory: ${sourceDir}`);
    }

    const items = [];
    this._scanDirRecursive(sourceDir, sourceDir, items);

    const categories = {
      fleeting: items.filter(i => i.targetCategory === '01_Fleeting'),
      literature: items.filter(i => i.targetCategory === '02_Literature'),
      permanent: items.filter(i => i.targetCategory === '03_Permanent'),
      clients: items.filter(i => i.targetCategory === '_Clients'),
      finance: items.filter(i => i.targetCategory === '_Finance'),
      projects: items.filter(i => i.targetCategory === 'Projects'),
      notes: items.filter(i => i.targetCategory === '_Notes')
    };

    return {
      sourceDir,
      totalFiles: items.length,
      counts: {
        fleeting: categories.fleeting.length,
        literature: categories.literature.length,
        permanent: categories.permanent.length,
        clients: categories.clients.length,
        finance: categories.finance.length,
        projects: categories.projects.length,
        notes: categories.notes.length
      },
      items: items.slice(0, 100), // First 100 preview items
      hasMore: items.length > 100
    };
  }

  /**
   * Execute migration from source directory into target Kanso vault.
   * @param {string} sourceDir Source directory
   * @param {string} targetDir Destination vault root (defaults to active workspace root)
   * @param {Object} options Migration options: { mode: 'copy' | 'move', author: string }
   * @returns {Object} Execution summary report
   */
  execute(sourceDir, targetDir = null, options = {}) {
    const destRoot = targetDir || this.workspaceRoot;
    const mode = options.mode === 'move' ? 'move' : 'copy';
    const author = options.author || 'MigrationWizard';

    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory not found: ${sourceDir}`);
    }

    const previewManifest = this.preview(sourceDir);
    const allItems = [];
    this._scanDirRecursive(sourceDir, sourceDir, allItems);

    const migrated = [];
    const errors = [];

    // Ensure standard 8-folder vault skeleton exists in target
    const standardDirs = [
      '_Clients',
      '_Finance/Quotes',
      '_Finance/Invoices',
      '_Zettelkasten/01_Fleeting',
      '_Zettelkasten/02_Literature',
      '_Zettelkasten/03_Permanent',
      '_Notes'
    ];

    for (const d of standardDirs) {
      const fullDir = path.join(destRoot, d);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }
    }

    for (const item of allItems) {
      try {
        const destRelative = item.targetRelativePath;
        const destFullPath = path.join(destRoot, destRelative);
        const destDir = path.dirname(destFullPath);

        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        if (mode === 'move') {
          fs.renameSync(item.absolutePath, destFullPath);
        } else {
          fs.copyFileSync(item.absolutePath, destFullPath);
        }

        migrated.push({
          source: item.relativePath,
          destination: destRelative,
          category: item.targetCategory,
          size: item.size
        });
      } catch (err) {
        errors.push({
          file: item.relativePath,
          error: err.message
        });
      }
    }

    // Generate Migration Report Markdown File
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilename = `Migration_Report_${timestamp}.md`;
    const reportPath = path.join(destRoot, '_Notes', reportFilename);

    const reportContent = [
      '---',
      'title: Kanso Cre8 Vault Migration Report',
      `date: ${new Date().toISOString()}`,
      `source: "${sourceDir}"`,
      `migrated_count: ${migrated.length}`,
      `error_count: ${errors.length}`,
      `mode: "${mode}"`,
      'author: "Kanso Migration Wizard"',
      '---',
      '',
      '# 📦 Kanso Cre8 Vault Migration Report',
      '',
      `* **Source**: \`${sourceDir}\``,
      `* **Destination Vault**: \`${destRoot}\``,
      `* **Timestamp**: ${new Date().toLocaleString()}`,
      `* **Total Migrated**: **${migrated.length} files**`,
      `* **Errors**: ${errors.length}`,
      '',
      '## 📊 Category Breakdown',
      `- **Fleeting Notes**: ${migrated.filter(m => m.category === '01_Fleeting').length}`,
      `- **Literature Notes**: ${migrated.filter(m => m.category === '02_Literature').length}`,
      `- **Permanent Notes**: ${migrated.filter(m => m.category === '03_Permanent').length}`,
      `- **Clients**: ${migrated.filter(m => m.category === '_Clients').length}`,
      `- **Finance**: ${migrated.filter(m => m.category === '_Finance').length}`,
      `- **Projects**: ${migrated.filter(m => m.category === 'Projects').length}`,
      `- **General Notes**: ${migrated.filter(m => m.category === '_Notes').length}`,
      '',
      '## 📋 Migrated Files (First 50)',
      ...migrated.slice(0, 50).map(m => `- \`${m.source}\` ➔ \`${m.destination}\``),
      migrated.length > 50 ? `\n*... and ${migrated.length - 50} more files.*` : '',
      '',
      errors.length > 0 ? '## ⚠️ Errors\n' + errors.map(e => `- \`${e.file}\`: ${e.error}`).join('\n') : ''
    ].join('\n');

    try {
      fs.writeFileSync(reportPath, reportContent, 'utf8');
    } catch (e) {
      console.warn('[MigrationService] Could not write report file:', e.message);
    }

    AuditService.logEvent({
      action: 'VAULT_MIGRATION',
      entityType: 'Vault',
      entityId: path.basename(destRoot),
      actor: author,
      role: 'User',
      details: {
        source: sourceDir,
        destination: destRoot,
        migratedCount: migrated.length,
        errorCount: errors.length
      }
    });

    return {
      success: true,
      migratedCount: migrated.length,
      errorCount: errors.length,
      reportPath: path.join('_Notes', reportFilename),
      errors
    };
  }

  _scanDirRecursive(baseDir, currentDir, acc) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const entry of entries) {
      // Skip hidden directories (like .obsidian, .git, .trash)
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        this._scanDirRecursive(baseDir, fullPath, acc);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // Index Markdown, text, image, and document files
        const validExtensions = ['.md', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.pdf', '.mp4'];
        if (validExtensions.includes(ext)) {
          const categorization = this._classifyFile(relativePath, entry.name);
          acc.push({
            name: entry.name,
            relativePath,
            absolutePath: fullPath,
            size: fs.statSync(fullPath).size,
            targetCategory: categorization.category,
            targetRelativePath: categorization.targetRelativePath
          });
        }
      }
    }
  }

  _classifyFile(relativePath, filename) {
    const lowerRel = relativePath.toLowerCase();
    const lowerName = filename.toLowerCase();

    // 1. Zettelkasten: Fleeting (Daily, inbox, fleeting, scratch)
    if (
      lowerRel.includes('daily') ||
      lowerRel.includes('inbox') ||
      lowerRel.includes('fleeting') ||
      lowerRel.includes('journal') ||
      /^\d{4}-\d{2}-\d{2}/.test(lowerName)
    ) {
      return {
        category: '01_Fleeting',
        targetRelativePath: path.join('_Zettelkasten', '01_Fleeting', filename).replace(/\\/g, '/')
      };
    }

    // 2. Zettelkasten: Literature (Books, reading, articles, references, swipe)
    if (
      lowerRel.includes('literature') ||
      lowerRel.includes('reading') ||
      lowerRel.includes('reference') ||
      lowerRel.includes('swipe') ||
      lowerRel.includes('articles') ||
      lowerRel.includes('teardown')
    ) {
      return {
        category: '02_Literature',
        targetRelativePath: path.join('_Zettelkasten', '02_Literature', filename).replace(/\\/g, '/')
      };
    }

    // 3. Zettelkasten: Permanent (Permanent, atomic, concepts, rules, hooks)
    if (
      lowerRel.includes('permanent') ||
      lowerRel.includes('atomic') ||
      lowerRel.includes('concept') ||
      lowerRel.includes('rule') ||
      lowerRel.includes('principle') ||
      lowerRel.includes('hook')
    ) {
      return {
        category: '03_Permanent',
        targetRelativePath: path.join('_Zettelkasten', '03_Permanent', filename).replace(/\\/g, '/')
      };
    }

    // 4. Clients
    if (lowerRel.includes('client') || lowerRel.includes('brand') || lowerRel.includes('customer')) {
      return {
        category: '_Clients',
        targetRelativePath: path.join('_Clients', filename).replace(/\\/g, '/')
      };
    }

    // 5. Finance
    if (lowerRel.includes('invoice') || lowerName.startsWith('inv-')) {
      return {
        category: '_Finance',
        targetRelativePath: path.join('_Finance', 'Invoices', filename).replace(/\\/g, '/')
      };
    }
    if (lowerRel.includes('quote') || lowerName.startsWith('quote-')) {
      return {
        category: '_Finance',
        targetRelativePath: path.join('_Finance', 'Quotes', filename).replace(/\\/g, '/')
      };
    }

    // 6. Project Vaults (check for project folders)
    if (lowerRel.includes('project') || /^\d{6}/.test(lowerName) || /^\d{4}/.test(lowerRel)) {
      return {
        category: 'Projects',
        targetRelativePath: path.join('2026', filename).replace(/\\/g, '/')
      };
    }

    // 7. General Notes Fallback
    return {
      category: '_Notes',
      targetRelativePath: path.join('_Notes', filename).replace(/\\/g, '/')
    };
  }
}

module.exports = new MigrationService();
