/**
 * Markdown & Obsidian Callout Parser Service for Svelte 5
 */
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface MarkdownToken {
  type: string;
  raw: string;
  text?: string;
  lang?: string;
  tokens?: any[];
  [key: string]: any;
}

export class MarkdownService {
  /**
   * Transforms Obsidian / GFM callout blockquotes into styled alert containers.
   * e.g. > [!NOTE] -> <div class="callout callout-note">...</div>
   */
  static transformCallouts(markdown: string): string {
    if (!markdown) return '';

    // Match > [!TYPE] Title on blockquote line
    const calloutRegex = /^>\s*\[!(NOTE|WARNING|IMPORTANT|CAUTION|DANGER|TIP|SUCCESS)\]\s*(.*)$/gim;

    const lines = markdown.split('\n');
    let inCallout = false;
    let calloutType = '';
    let calloutTitle = '';
    let outputLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^>\s*\[!(NOTE|WARNING|IMPORTANT|CAUTION|DANGER|TIP|SUCCESS)\]\s*(.*)$/i);

      if (match) {
        if (inCallout) {
          outputLines.push('</div>');
        }
        inCallout = true;
        calloutType = match[1].toLowerCase();
        calloutTitle = match[2].trim() || match[1].toUpperCase();
        outputLines.push(`<div class="callout callout-${calloutType}"><div class="callout-title">${calloutTitle}</div>`);
        continue;
      }

      if (inCallout) {
        if (line.startsWith('>')) {
          outputLines.push(line.replace(/^>\s?/, ''));
        } else if (line.trim() === '') {
          outputLines.push('');
        } else {
          inCallout = false;
          outputLines.push('</div>');
          outputLines.push(line);
        }
      } else {
        outputLines.push(line);
      }
    }

    if (inCallout) {
      outputLines.push('</div>');
    }

    return outputLines.join('\n');
  }

  /**
   * Parses Markdown string to sanitized HTML.
   */
  static renderToHtml(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') return '';
    
    const withCallouts = this.transformCallouts(markdown);
    const rawHtml = marked.parse(withCallouts, { gfm: true, breaks: true }) as string;
    
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['div', 'span', 'svg', 'path', 'code', 'pre', 'input'],
      ADD_ATTR: ['class', 'id', 'style', 'type', 'checked', 'disabled', 'viewBox', 'd', 'fill']
    });
  }

  /**
   * Tokenizes markdown into blocks (used by Svelte to separate standard markdown from Mermaid code blocks).
   */
  static tokenize(markdown: string): MarkdownToken[] {
    if (!markdown) return [];
    return marked.lexer(markdown, { gfm: true }) as MarkdownToken[];
  }
}
