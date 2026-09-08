/**
 * Kanso Cre8 — Pure Markdown Vault Engine (Zero-Database Architecture)
 * Handles local filesystem scanning, YAML frontmatter parsing,
 * cloud sync detection, and 8-folder canonical structure management.
 */

import type { VaultConfig, VaultFile, VaultStats, SyncProvider, ProjectFrontmatter, ClientProfile } from '$lib/types/kanso';

export interface ParsedMarkdown<T = Record<string, any>> {
  frontmatter: T;
  content: string;
  hasFrontmatter: boolean;
  raw: string;
}

export interface ExtractedTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  sourceFile: string;
  lineIndex: number;
  rawLine: string;
}

export class VaultService {
  /**
   * Canonical 8-folder modular vault layout
   */
  static readonly CANONICAL_DIRECTORIES = [
    '_Clients',
    '_Finance/Quotes',
    '_Finance/Invoices',
    '_Zettelkasten/01_Fleeting',
    '_Zettelkasten/02_Literature',
    '_Zettelkasten/03_Permanent',
    '_Notes'
  ];

  /**
   * Standardized 5-folder creative project structure
   */
  static readonly PROJECT_SUBFOLDERS = [
    '01_BRIEF',
    '02_SOURCE',
    '03_COPY',
    '04_WIP',
    '05_DELIVERABLES'
  ];

  /**
   * Detects cloud synchronization provider from filesystem path
   */
  static detectSyncProvider(path: string): SyncProvider {
    if (!path) return 'local';
    const lower = path.toLowerCase().replace(/\\/g, '/');
    if (lower.includes('dropbox')) return 'dropbox';
    if (lower.includes('google drive') || lower.includes('gdrive') || lower.includes('my drive')) return 'gdrive';
    if (lower.includes('onedrive')) return 'onedrive';
    if (lower.includes('synology') || lower.includes('synologydrive')) return 'synology';
    return 'local';
  }

  /**
   * Lightweight YAML frontmatter parser (pure TypeScript, zero binary database)
   */
  static parseMarkdown<T = Record<string, any>>(rawText: string): ParsedMarkdown<T> {
    if (!rawText) {
      return { frontmatter: {} as T, content: '', hasFrontmatter: false, raw: '' };
    }

    const trimmed = rawText.trimStart();
    if (!trimmed.startsWith('---')) {
      return { frontmatter: {} as T, content: rawText, hasFrontmatter: false, raw: rawText };
    }

    const endMatch = trimmed.indexOf('\n---', 3);
    if (endMatch === -1) {
      return { frontmatter: {} as T, content: rawText, hasFrontmatter: false, raw: rawText };
    }

    const yamlBlock = trimmed.slice(3, endMatch).trim();
    const content = trimmed.slice(endMatch + 4).trimStart();
    const frontmatter: Record<string, any> = {};

    const lines = yamlBlock.split('\n');
    let currentKey = '';
    let inArray = false;
    let currentArray: any[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      // Handle array items
      if (line.startsWith('- ') && currentKey) {
        const itemVal = line.slice(2).trim().replace(/^["']|["']$/g, '');
        currentArray.push(this.castValue(itemVal));
        frontmatter[currentKey] = currentArray;
        continue;
      }

      // Key-Value pair
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        if (inArray && currentKey) {
          frontmatter[currentKey] = currentArray;
          inArray = false;
        }

        currentKey = line.slice(0, colonIdx).trim();
        const rawVal = line.slice(colonIdx + 1).trim();

        if (rawVal === '' || rawVal === '[]') {
          inArray = true;
          currentArray = [];
          frontmatter[currentKey] = [];
        } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
          // Inline array: [tag1, tag2]
          const items = rawVal.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
          frontmatter[currentKey] = items.map(s => this.castValue(s));
          inArray = false;
        } else {
          inArray = false;
          frontmatter[currentKey] = this.castValue(rawVal.replace(/^["']|["']$/g, ''));
        }
      }
    }

    return {
      frontmatter: frontmatter as T,
      content,
      hasFrontmatter: true,
      raw: rawText
    };
  }

  /**
   * Helper to cast string values to booleans, numbers, or strings
   */
  private static castValue(val: string): any {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null' || val === '~') return null;
    if (/^-?\d+$/.test(val)) return parseInt(val, 10);
    if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
    return val;
  }

  /**
   * Serializes an object to YAML frontmatter block prepended to markdown body
   */
  static stringifyMarkdown(frontmatter: Record<string, any>, content: string): string {
    const yamlLines: string[] = ['---'];

    for (const [key, val] of Object.entries(frontmatter)) {
      if (val === undefined || val === null) {
        yamlLines.push(`${key}: null`);
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          yamlLines.push(`${key}: []`);
        } else {
          yamlLines.push(`${key}: [${val.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`);
        }
      } else if (typeof val === 'string') {
        if (val.includes('\n') || val.includes(':') || val.includes('#')) {
          yamlLines.push(`${key}: "${val.replace(/"/g, '\\"')}"`);
        } else {
          yamlLines.push(`${key}: "${val}"`);
        }
      } else {
        yamlLines.push(`${key}: ${val}`);
      }
    }

    yamlLines.push('---');
    return `${yamlLines.join('\n')}\n\n${content.trimStart()}`;
  }

  /**
   * Extracts universal task items from Markdown text
   * Pattern: - [ ] #task <Title> [📅 YYYY-MM-DD] [⏫ low|normal|high|urgent]
   */
  static extractTasks(markdown: string, sourceFilePath: string = ''): ExtractedTask[] {
    if (!markdown) return [];
    const tasks: ExtractedTask[] = [];
    const lines = markdown.split('\n');

    const taskRegex = /^\s*-\s*\[([ xX])\]\s*#task\s+(.+?)(?:\s+📅\s*(\d{4}-\d{2}-\d{2}))?(?:\s+⏫\s*(low|normal|high|urgent))?\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(taskRegex);
      if (match) {
        const completed = match[1].toLowerCase() === 'x';
        const title = match[2].trim();
        const dueDate = match[3] || undefined;
        const priority = (match[4] as ExtractedTask['priority']) || 'normal';

        tasks.push({
          id: `task-${sourceFilePath}-${i}`,
          title,
          completed,
          dueDate,
          priority,
          sourceFile: sourceFilePath,
          lineIndex: i,
          rawLine: line
        });
      }
    }

    return tasks;
  }

  /**
   * Toggles task completion in raw markdown text preserving formatting
   */
  static toggleTaskInMarkdown(markdown: string, lineIndex: number, completed: boolean): string {
    const lines = markdown.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return markdown;

    const line = lines[lineIndex];
    const newBox = completed ? '[x]' : '[ ]';
    lines[lineIndex] = line.replace(/-\s*\[([ xX])\]/, `- ${newBox}`);
    return lines.join('\n');
  }

  /**
   * Generates a template project README.md with YAML frontmatter
   */
  static createProjectReadmeTemplate(options: {
    id: string;
    title: string;
    clientCode: string;
    clientName: string;
    deadline?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    budget?: number;
    currency?: string;
    description?: string;
  }): string {
    const frontmatter: Partial<ProjectFrontmatter> = {
      id: options.id,
      title: options.title,
      client: options.clientName,
      client_code: options.clientCode,
      status: 'in-progress',
      priority: options.priority || 'normal',
      created_at: new Date().toISOString().split('T')[0],
      due_date: options.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      budget: options.budget || 0,
      currency: options.currency || 'USD',
      revisions_count: 0,
      tags: ['design', options.clientCode.toLowerCase()]
    };

    const body = `# ${options.title}\n\n> [!NOTE]\n> ${options.description || 'Project creative brief and specifications.'}\n\n## Sprint Checklist\n- [ ] #task Review client brief and references 📅 ${frontmatter.due_date} ⏫ normal\n- [ ] #task Prepare initial source drafts in 02_SOURCE/\n- [ ] #task Export review renders to 04_WIP/\n- [ ] #task Finalize deliverables in 05_DELIVERABLES/\n`;

    return this.stringifyMarkdown(frontmatter, body);
  }

  /**
   * Generates a template client client.md with YAML frontmatter
   */
  static createClientTemplate(options: {
    code: string;
    name: string;
    contactPerson: string;
    email: string;
    currency?: string;
    hourlyRate?: number;
    palette?: { primary: string; secondary: string; dark: string; accent: string };
  }): string {
    const clientData = {
      code: options.code,
      name: options.name,
      contactName: options.contactPerson,
      contactEmail: options.email,
      currency: options.currency || 'USD',
      hourlyRate: options.hourlyRate || 100,
      paymentTerms: 'Net 15',
      colorPalette: [
        { name: 'Primary', hex: options.palette?.primary || '#0066FF' },
        { name: 'Dark', hex: options.palette?.dark || '#09090B' },
        { name: 'Accent', hex: options.palette?.accent || '#38BDF8' }
      ]
    };

    const body = `# ${options.name} (${options.code})\n\nBrand assets, guidelines, and active contracts.\n\n## Brand Assets\n- Vector Logos: \`Assets/Logo/\`\n- Guidelines: \`Assets/Guidelines.pdf\`\n`;

    return this.stringifyMarkdown(clientData, body);
  }
}
