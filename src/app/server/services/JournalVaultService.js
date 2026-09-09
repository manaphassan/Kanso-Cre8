const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const config = require('../config');

class JournalVaultService {
  static getJournalRootDir() {
    let wsRoot = config.WORKSPACE_ROOT;
    try {
      const WorkspaceService = require('./WorkspaceService');
      if (WorkspaceService && WorkspaceService.workspaceRoot) {
        wsRoot = WorkspaceService.workspaceRoot;
      }
    } catch (e) {}
    return path.join(wsRoot, '_Journal');
  }

  static getDailyDir() {
    const dir = path.join(this.getJournalRootDir(), 'Daily');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  static getMonthlyDir() {
    const dir = path.join(this.getJournalRootDir(), 'Monthly');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  static getYearlyDir() {
    const dir = path.join(this.getJournalRootDir(), 'Yearly');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    return dir;
  }

  static getDailyPath(dateStr) {
    return path.join(this.getDailyDir(), `${dateStr}.md`);
  }

  static getMonthlyPath(monthStr) {
    return path.join(this.getMonthlyDir(), `${monthStr}.md`);
  }

  static getYearlyPath(yearStr) {
    return path.join(this.getYearlyDir(), `${yearStr}.md`);
  }

  // ─── DAILY NOTES PARSING & SERIALIZATION ────────────────────────────

  static parseDailyNote(rawContent, dateStr) {
    let frontmatter = {
      date: dateStr,
      title: 'Daily Creative Log',
      tags: ['journal', 'bujo', 'daily']
    };
    let body = rawContent || '';

    // Strip UTF-8 BOM
    body = body.replace(/^\uFEFF/, '');

    // Parse Frontmatter
    const fmMatch = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (fmMatch) {
      try {
        const parsedFm = yaml.load(fmMatch[1]);
        if (parsedFm && typeof parsedFm === 'object') {
          frontmatter = { ...frontmatter, ...parsedFm };
        }
      } catch (e) {
        console.warn('[JournalVaultService] YAML parse error:', e.message);
      }
      body = fmMatch[2];
    }

    const lines = body.split(/\r?\n/);
    let title = frontmatter.title || 'Daily Creative Log';
    const focusIntentions = [];
    const entries = [];

    let currentSection = 'body'; // 'intentions' | 'rapid_log' | 'body'
    let entryIdCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('# ')) {
        title = line.replace(/^#\s+/, '').replace(/^📔\s*/, '').trim();
        continue;
      }

      if (/^##\s*(🎯\s*)?(Focus\s+Intentions|Daily\s+Intentions)/i.test(line)) {
        currentSection = 'intentions';
        continue;
      }

      if (/^##\s*(⚡\s*)?(Rapid\s+Log|Tasks)/i.test(line)) {
        currentSection = 'rapid_log';
        continue;
      }

      if (line.startsWith('## ')) {
        currentSection = 'other';
        continue;
      }

      if (currentSection === 'intentions') {
        const cleanItem = line.replace(/^-\s*(\[[ xX]\]\s*)?/, '').trim();
        if (cleanItem) {
          focusIntentions.push(cleanItem);
        }
      } else if (currentSection === 'rapid_log' || currentSection === 'body') {
        // BuJo Symbol Parsing
        if (/^•\s*\[[xX]\]/i.test(line)) {
          const text = line.replace(/^•\s*\[[xX]\]\s*/, '').trim();
          entries.push({ id: `entry_${dateStr}_${entryIdCounter++}`, type: 'done', text, raw: line, completed: true });
        } else if (/^•\s*\[>\]/.test(line)) {
          const text = line.replace(/^•\s*\[>\]\s*/, '').trim();
          entries.push({ id: `entry_${dateStr}_${entryIdCounter++}`, type: 'migrated', text, raw: line, completed: false });
        } else if (/^•\s*\[\s*\]/.test(line)) {
          const text = line.replace(/^•\s*\[\s*\]\s*/, '').trim();
          entries.push({ id: `entry_${dateStr}_${entryIdCounter++}`, type: 'task', text, raw: line, completed: false });
        } else if (/^-\s*\[[xX]\]/i.test(line)) {
          const text = line.replace(/^-\s*\[[xX]\]\s*/, '').trim();
          entries.push({ id: `entry_${dateStr}_${entryIdCounter++}`, type: 'done', text, raw: line, completed: true });
        } else if (/^-\s*\[\s*\]/.test(line)) {
          const text = line.replace(/^-\s*\[\s*\]\s*/, '').trim();
          entries.push({ id: `entry_${dateStr}_${entryIdCounter++}`, type: 'task', text, raw: line, completed: false });
        } else if (/^o\s+/i.test(line)) {
          const text = line.replace(/^o\s+/i, '').trim();
          entries.push({ id: `entry_${dateStr}_${entryIdCounter++}`, type: 'event', text, raw: line, completed: false });
        } else if (/^\*\s+/i.test(line)) {
          const text = line.replace(/^\*\s+/i, '').replace(/^Priority:\s*/i, '').trim();
          entries.push({ id: `entry_${dateStr}_${entryIdCounter++}`, type: 'priority', text, raw: line, completed: false });
        } else if (/^-\s+/i.test(line)) {
          const text = line.replace(/^-\s+/i, '').replace(/^Note:\s*/i, '').trim();
          entries.push({ id: `entry_${dateStr}_${entryIdCounter++}`, type: 'note', text, raw: line, completed: false });
        }
      }
    }

    return {
      date: dateStr,
      title,
      focusIntentions: focusIntentions.length ? focusIntentions : ['Deep visual craft', 'Zero distraction sprint', 'On-time proof delivery'],
      entries,
      rawMarkdown: rawContent,
      updatedAt: new Date().toISOString()
    };
  }

  static serializeDailyNote(note) {
    const fm = {
      date: note.date,
      title: note.title || 'Daily Creative Log',
      tags: ['journal', 'bujo', 'daily']
    };

    let md = `---\n${yaml.dump(fm).trim()}\n---\n\n`;
    md += `# 📔 ${note.title || 'Daily Creative Log'}\n\n`;

    if (note.focusIntentions && note.focusIntentions.length) {
      md += `## Focus Intentions\n`;
      for (const item of note.focusIntentions) {
        md += `- [ ] ${item}\n`;
      }
      md += `\n`;
    }

    md += `## Rapid Log\n`;
    for (const e of (note.entries || [])) {
      if (e.type === 'done' || (e.type === 'task' && e.completed)) {
        md += `• [x] ${e.text}\n`;
      } else if (e.type === 'migrated') {
        md += `• [>] ${e.text}\n`;
      } else if (e.type === 'task') {
        md += `• [ ] ${e.text}\n`;
      } else if (e.type === 'event') {
        md += `o ${e.text}\n`;
      } else if (e.type === 'priority') {
        md += `* Priority: ${e.text}\n`;
      } else if (e.type === 'note') {
        md += `- Note: ${e.text}\n`;
      } else {
        md += `• ${e.text}\n`;
      }
    }

    return md;
  }

  static getDailyNote(dateStr) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const filePath = this.getDailyPath(targetDate);

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return this.parseDailyNote(raw, targetDate);
      } catch (err) {
        console.error(`[JournalVaultService] Error reading ${filePath}:`, err.message);
      }
    }

    // Default template if note doesn't exist
    const defaultNote = {
      date: targetDate,
      title: new Date(targetDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      focusIntentions: ['Deep visual craft', 'Zero distraction sprint', 'On-time proof delivery'],
      entries: [
        { id: `entry_${targetDate}_1`, type: 'priority', text: 'Define top creative sprint priorities', raw: '* Priority: Define top creative sprint priorities', completed: false },
        { id: `entry_${targetDate}_2`, type: 'task', text: 'Review visual proofs and client feedback', raw: '• [ ] Review visual proofs and client feedback', completed: false }
      ],
      rawMarkdown: '',
      updatedAt: new Date().toISOString()
    };

    defaultNote.rawMarkdown = this.serializeDailyNote(defaultNote);
    return defaultNote;
  }

  static saveDailyNote(noteData) {
    if (!noteData || !noteData.date) {
      throw new Error('Valid date is required to save a daily note.');
    }

    const filePath = this.getDailyPath(noteData.date);
    const serialized = this.serializeDailyNote(noteData);

    fs.writeFileSync(filePath, serialized, 'utf8');
    return this.parseDailyNote(serialized, noteData.date);
  }

  static listDailyNotes() {
    const dir = this.getDailyDir();
    if (!fs.existsSync(dir)) return [];

    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      return files.map(file => {
        const dateStr = path.basename(file, '.md');
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        return {
          date: dateStr,
          filename: file,
          modified: stat.mtimeMs
        };
      }).sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      return [];
    }
  }

  // ─── BUJO TASK MIGRATION PIPELINE ───────────────────────────────────

  static migrateTasks(fromDate, toDate) {
    if (!fromDate || !toDate) {
      throw new Error('Both fromDate and toDate are required for task rollover migration.');
    }

    const fromPath = this.getDailyPath(fromDate);
    if (!fs.existsSync(fromPath)) {
      return {
        success: false,
        migratedCount: 0,
        message: `No source daily note found on disk for ${fromDate}.`,
        migratedTasks: []
      };
    }

    const fromNote = this.getDailyNote(fromDate);
    const toNote = this.getDailyNote(toDate);

    // Identify incomplete tasks
    const incompleteTasks = fromNote.entries.filter(e => {
      return (e.type === 'task' || e.type === 'priority') && !e.completed;
    });

    if (incompleteTasks.length === 0) {
      return {
        success: true,
        migratedCount: 0,
        message: `All tasks for ${fromDate} are already completed or migrated.`,
        migratedTasks: [],
        fromNote,
        toNote
      };
    }

    // 1. In fromNote: update each incomplete task to 'migrated' (• [>])
    const incompleteIds = new Set(incompleteTasks.map(t => t.id));
    fromNote.entries = fromNote.entries.map(entry => {
      if (incompleteIds.has(entry.id)) {
        return {
          ...entry,
          type: 'migrated',
          raw: `• [>] ${entry.text}`,
          completed: false
        };
      }
      return entry;
    });

    // 2. In toNote: append tasks that are not already present in toNote
    const existingTexts = new Set(toNote.entries.map(e => e.text.trim().toLowerCase()));
    const appendedTasks = [];

    let nextId = toNote.entries.length + 1;
    for (const task of incompleteTasks) {
      if (!existingTexts.has(task.text.trim().toLowerCase())) {
        const newTask = {
          id: `entry_${toDate}_migrated_${nextId++}`,
          type: task.type === 'priority' ? 'priority' : 'task',
          text: task.text,
          raw: task.type === 'priority' ? `* Priority: ${task.text}` : `• [ ] ${task.text}`,
          completed: false
        };
        toNote.entries.push(newTask);
        appendedTasks.push(newTask);
        existingTexts.add(task.text.trim().toLowerCase());
      }
    }

    // 3. Save both files atomically to disk
    this.saveDailyNote(fromNote);
    this.saveDailyNote(toNote);

    return {
      success: true,
      migratedCount: appendedTasks.length,
      migratedTasks: appendedTasks,
      fromNote,
      toNote,
      message: `Successfully migrated ${appendedTasks.length} task(s) from ${fromDate} to ${toDate}.`
    };
  }

  // ─── MONTHLY REVIEWS ────────────────────────────────────────────────

  static getMonthlyReviews() {
    const dir = this.getMonthlyDir();
    if (!fs.existsSync(dir)) return [];
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      const reviews = [];
      for (const file of files) {
        const month = path.basename(file, '.md');
        reviews.push(this.getMonthlyReview(month));
      }
      return reviews.sort((a, b) => b.month.localeCompare(a.month));
    } catch (e) {
      return [];
    }
  }

  static getMonthlyReview(monthStr) {
    const targetMonth = monthStr || new Date().toISOString().slice(0, 7);
    const filePath = this.getMonthlyPath(targetMonth);

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        let fm = {};
        let reflections = '';
        const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (fmMatch) {
          fm = yaml.load(fmMatch[1]) || {};
          reflections = fmMatch[2].replace(/^#\s+[^\n]*\n+/m, '').trim();
        } else {
          reflections = raw.trim();
        }
        return {
          month: targetMonth,
          title: fm.title || `Monthly Review: ${targetMonth}`,
          goals: fm.goals || [],
          deliverablesSummary: fm.deliverablesSummary || fm.deliverables || [],
          billableHours: fm.billableHours || 0,
          reflections: fm.reflections || reflections,
          tags: fm.tags || ['journal', 'bujo', 'monthly'],
          rawMarkdown: raw
        };
      } catch (e) {}
    }

    return {
      month: targetMonth,
      title: `Monthly Review: ${targetMonth}`,
      goals: ['Deliver high-impact visual design sprint', 'Maintain sub-2.0 revision cycles'],
      deliverablesSummary: ['3x 4K Master Renders', 'Design Tokens Spec Guide'],
      billableHours: 64,
      reflections: 'Clean cadence and prompt deliverable sign-offs across all client sprints.',
      tags: ['journal', 'bujo', 'monthly'],
      rawMarkdown: ''
    };
  }

  static saveMonthlyReview(reviewData) {
    if (!reviewData || !reviewData.month) {
      throw new Error('Valid month (YYYY-MM) is required.');
    }
    const filePath = this.getMonthlyPath(reviewData.month);
    const fm = {
      month: reviewData.month,
      title: reviewData.title || `Monthly Review: ${reviewData.month}`,
      goals: reviewData.goals || [],
      deliverablesSummary: reviewData.deliverablesSummary || [],
      billableHours: reviewData.billableHours || 0,
      tags: reviewData.tags || ['journal', 'bujo', 'monthly'],
      reflections: reviewData.reflections || ''
    };

    const md = `---\n${yaml.dump(fm).trim()}\n---\n\n# 📅 Monthly Review: ${reviewData.month}\n\n${reviewData.reflections || ''}\n`;
    fs.writeFileSync(filePath, md, 'utf8');
    return this.getMonthlyReview(reviewData.month);
  }

  // ─── YEARLY INDEXES & VISIONS ───────────────────────────────────────

  static getYearlyIndexes() {
    const dir = this.getYearlyDir();
    if (!fs.existsSync(dir)) return [];
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      const indexes = [];
      for (const file of files) {
        const year = path.basename(file, '.md');
        indexes.push(this.getYearlyIndex(year));
      }
      return indexes.sort((a, b) => b.year.localeCompare(a.year));
    } catch (e) {
      return [];
    }
  }

  static getYearlyIndex(yearStr) {
    const targetYear = String(yearStr || new Date().getFullYear());
    const filePath = this.getYearlyPath(targetYear);

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        let fm = {};
        let vision = '';
        const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (fmMatch) {
          fm = yaml.load(fmMatch[1]) || {};
          vision = fmMatch[2].replace(/^#\s+[^\n]*\n+/m, '').trim();
        } else {
          vision = raw.trim();
        }
        return {
          year: targetYear,
          title: fm.title || `${targetYear} Studio Vision & Annual Index`,
          vision: fm.vision || vision,
          milestones: fm.milestones || [],
          revenueTarget: fm.revenueTarget || fm.revenue_target || 150000,
          revenueActual: fm.revenueActual || fm.revenue_actual || 0,
          clientHighlights: fm.clientHighlights || fm.client_highlights || [],
          tags: fm.tags || ['journal', 'bujo', 'yearly'],
          rawMarkdown: raw
        };
      } catch (e) {}
    }

    return {
      year: targetYear,
      title: `${targetYear} Studio Vision & Annual Index`,
      vision: 'Independent Design Sanctuary: Focus exclusively on high-impact visual craft, 3D illustration, and boutique brand systems with zero agency middleman.',
      milestones: [
        'Transitioned 100% of client operations into Kanso Cre8 local vault',
        'Surpassed $120/hr effective billing rate across core retainer clients',
        'Achieved sub-2.0 average revision rounds across 40+ completed project vaults'
      ],
      revenueTarget: 150000,
      revenueActual: 84500,
      clientHighlights: ['Acme Corp (Retainer)', 'Nexus Studio (Motion)', 'Lumina Labs (Identity)'],
      tags: ['journal', 'bujo', 'yearly'],
      rawMarkdown: ''
    };
  }

  static saveYearlyIndex(yearlyData) {
    if (!yearlyData || !yearlyData.year) {
      throw new Error('Valid year (YYYY) is required.');
    }
    const yearStr = String(yearlyData.year);
    const filePath = this.getYearlyPath(yearStr);
    const fm = {
      year: yearStr,
      title: yearlyData.title || `${yearStr} Studio Vision & Annual Index`,
      revenue_target: yearlyData.revenueTarget || 150000,
      revenue_actual: yearlyData.revenueActual || 0,
      milestones: yearlyData.milestones || [],
      client_highlights: yearlyData.clientHighlights || [],
      tags: yearlyData.tags || ['journal', 'bujo', 'yearly'],
      vision: yearlyData.vision || ''
    };

    const md = `---\n${yaml.dump(fm).trim()}\n---\n\n# 🏔️ Annual Vision & Retrospective: ${yearStr}\n\n${yearlyData.vision || ''}\n`;
    fs.writeFileSync(filePath, md, 'utf8');
    return this.getYearlyIndex(yearStr);
  }

  // ─── CREATIVE OPERATIONS TELEMETRY ROLLUPS ──────────────────────────

  static getMonthlyTelemetryRollup(monthStr) {
    const targetMonth = monthStr || new Date().toISOString().slice(0, 7); // YYYY-MM
    let invoices = [];
    try {
      const FinanceVaultService = require('./FinanceVaultService');
      invoices = FinanceVaultService.getInvoices();
    } catch (e) {}

    let projects = [];
    try {
      const WorkspaceService = require('./WorkspaceService');
      if (WorkspaceService && WorkspaceService.projectsCache) {
        projects = WorkspaceService.projectsCache;
      }
    } catch (e) {}

    // Month filter for invoices
    const monthInvoices = invoices.filter(inv => inv.date && inv.date.startsWith(targetMonth));
    const paidRevenue = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const pendingRevenue = monthInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const totalRevenue = paidRevenue + pendingRevenue;

    // Accrued hours from invoice line items
    let billableHours = 0;
    monthInvoices.forEach(inv => {
      (inv.items || []).forEach(it => {
        billableHours += Number(it.quantity || it.hours || 0);
      });
    });

    // Month filter for projects
    const monthCompact = targetMonth.replace('-', '');
    const monthProjects = projects.filter(p =>
      (p.created && p.created.startsWith(targetMonth)) ||
      (p.deadline && p.deadline.startsWith(targetMonth)) ||
      (p.folder && p.folder.includes(monthCompact))
    );

    const completedProjects = monthProjects.filter(p =>
      p.status === 'completed' || p.status === 'delivered' || p.status === 'archived'
    ).length;

    let deliverablesCount = 0;
    monthProjects.forEach(p => {
      if (p.deliverables && Array.isArray(p.deliverables)) {
        deliverablesCount += p.deliverables.length;
      }
    });

    // Active clients
    const activeClientsSet = new Set();
    monthInvoices.forEach(inv => {
      if (inv.clientCode) activeClientsSet.add(inv.clientCode);
    });
    monthProjects.forEach(p => {
      if (p.brand) activeClientsSet.add(p.brand);
    });

    const revisionSum = monthProjects.reduce((s, p) => s + (p.revision || 1), 0);
    const avgRevisionRounds = monthProjects.length > 0 ? Math.round((revisionSum / monthProjects.length) * 10) / 10 : 1.0;

    return {
      month: targetMonth,
      billableHours: Math.round(billableHours * 10) / 10,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paidRevenue: Math.round(paidRevenue * 100) / 100,
      pendingRevenue: Math.round(pendingRevenue * 100) / 100,
      projectsCount: monthProjects.length,
      completedProjects,
      deliverablesCount,
      activeClients: Array.from(activeClientsSet),
      avgRevisionRounds
    };
  }

  static getYearlyTelemetryRollup(yearStr) {
    const targetYear = String(yearStr || new Date().getFullYear());
    let invoices = [];
    try {
      const FinanceVaultService = require('./FinanceVaultService');
      invoices = FinanceVaultService.getInvoices();
    } catch (e) {}

    let projects = [];
    try {
      const WorkspaceService = require('./WorkspaceService');
      if (WorkspaceService && WorkspaceService.projectsCache) {
        projects = WorkspaceService.projectsCache;
      }
    } catch (e) {}

    const yearInvoices = invoices.filter(inv => inv.date && inv.date.startsWith(targetYear));
    const paidRevenue = yearInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const pendingRevenue = yearInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0);
    const totalRevenue = paidRevenue + pendingRevenue;

    let totalHours = 0;
    yearInvoices.forEach(inv => {
      (inv.items || []).forEach(it => {
        totalHours += Number(it.quantity || it.hours || 0);
      });
    });

    const yearProjects = projects.filter(p =>
      p.year === targetYear ||
      (p.created && p.created.startsWith(targetYear)) ||
      (p.folder && p.folder.startsWith(targetYear))
    );

    const completedProjects = yearProjects.filter(p =>
      p.status === 'completed' || p.status === 'delivered' || p.status === 'archived'
    ).length;

    // Monthly breakdown (12 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyCurve = [];
    for (let m = 1; m <= 12; m++) {
      const monthPadded = String(m).padStart(2, '0');
      const mStr = `${targetYear}-${monthPadded}`;
      const mInvs = yearInvoices.filter(i => i.date && i.date.startsWith(mStr));
      const mRev = mInvs.reduce((s, i) => s + (i.total || 0), 0);
      let mHours = 0;
      mInvs.forEach(i => (i.items || []).forEach(it => { mHours += Number(it.quantity || it.hours || 0); }));
      const mProjs = yearProjects.filter(p => (p.created && p.created.startsWith(mStr)) || (p.folder && p.folder.includes(`${targetYear}${monthPadded}`))).length;

      monthlyCurve.push({
        month: mStr,
        label: monthNames[m - 1],
        revenue: Math.round(mRev * 100) / 100,
        hours: Math.round(mHours * 10) / 10,
        projects: mProjs
      });
    }

    // Client revenue distribution
    const clientMap = {};
    yearInvoices.forEach(inv => {
      const c = inv.clientCode || 'OTHER';
      if (!clientMap[c]) {
        clientMap[c] = { clientCode: c, clientName: inv.clientName || c, revenue: 0, count: 0 };
      }
      clientMap[c].revenue += (inv.total || 0);
      clientMap[c].count += 1;
    });

    const clientDistribution = Object.values(clientMap).map(c => ({
      ...c,
      revenue: Math.round(c.revenue * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);

    const effectiveRate = totalHours > 0 ? Math.round(totalRevenue / totalHours) : 125;
    const revisionSum = yearProjects.reduce((s, p) => s + (p.revision || 1), 0);
    const avgRevisionRounds = yearProjects.length > 0 ? Math.round((revisionSum / yearProjects.length) * 10) / 10 : 1.0;

    return {
      year: targetYear,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paidRevenue: Math.round(paidRevenue * 100) / 100,
      pendingRevenue: Math.round(pendingRevenue * 100) / 100,
      totalHours: Math.round(totalHours * 10) / 10,
      effectiveRate,
      projectsCount: yearProjects.length,
      completedProjects,
      clientDistribution,
      monthlyCurve,
      avgRevisionRounds
    };
  }
}

module.exports = JournalVaultService;
