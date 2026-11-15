/**
 * Project review file `<project>/_review.md`: comments and approvals in YAML
 * frontmatter plus a readable summary body. Port of CommentService.js.
 */

import type { VaultFs } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter';

export interface Review {
  path: string;
  frontmatter: Record<string, any>;
  comments: any[];
  approvals: any[];
}

export const reviewPath = (projectPath: string) => `${projectPath}/_review.md`;

export async function readReview(fs: VaultFs, projectPath: string, projectId?: string): Promise<Review> {
  const path = reviewPath(projectPath);
  try {
    const { frontmatter } = parseFrontmatter(await fs.readText(path));
    return {
      path,
      frontmatter,
      comments: Array.isArray(frontmatter.comments) ? frontmatter.comments : [],
      approvals: Array.isArray(frontmatter.approvals) ? frontmatter.approvals : []
    };
  } catch {
    // Missing file: an empty review. Legacy `_comments.jsonl` is folded in.
  }
  let migrated: any[] = [];
  try {
    migrated = (await fs.readText(`${projectPath}/_comments.jsonl`))
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    migrated = [];
  }
  const frontmatter = { project_id: projectId || baseName(projectPath), comments: migrated, approvals: [] };
  if (migrated.length) {
    await writeReview(fs, path, frontmatter);
    await fs.moveToArchive(`${projectPath}/_comments.jsonl`).catch(() => undefined);
  }
  return { path, frontmatter, comments: migrated, approvals: [] };
}

export function reviewBody(comments: any[], approvals: any[]): string {
  let md = '# Project Review & Approvals\n\n## Approvals History\n';
  if (!approvals.length) md += '_No formal approvals recorded yet._\n\n';
  else {
    for (const a of approvals) {
      const date = String(a.timestamp || '').split('T')[0] || 'Pending';
      md += `- **Round ${a.round || 1} [${String(a.decision || 'approved').toUpperCase()}]** by ${a.reviewer || 'Reviewer'} (${a.role || 'Manager'}) on ${date}: *${a.comment || 'No comment provided.'}*\n`;
    }
    md += '\n';
  }
  md += '## Comments Thread\n';
  if (!comments.length) md += '_No review comments posted yet._\n';
  else {
    for (const c of comments) {
      const date = String(c.timestamp || '').split('T')[0] || '';
      md += `- **${c.author || 'User'}** (${date})${c.resolved ? ' *(Resolved)*' : ''}: ${c.content}\n`;
    }
  }
  return md;
}

export async function writeReview(fs: VaultFs, path: string, frontmatter: Record<string, any>): Promise<void> {
  const comments = Array.isArray(frontmatter.comments) ? frontmatter.comments : [];
  const approvals = Array.isArray(frontmatter.approvals) ? frontmatter.approvals : [];
  await fs.writeText(path, serializeFrontmatter(frontmatter, reviewBody(comments, approvals)));
}

export async function getComments(fs: VaultFs, projectPath: string, projectId?: string): Promise<any[]> {
  const review = await readReview(fs, projectPath, projectId);
  return [...review.comments].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export interface NewComment {
  author?: string;
  authorRole?: string;
  authorAvatar?: string;
  content: string;
  deliverableId?: string | null;
  annotation?: unknown;
  mentions?: string[];
}

export async function addComment(fs: VaultFs, projectPath: string, projectId: string, input: NewComment, now = new Date()) {
  const content = String(input.content || '').trim();
  if (!content) throw new Error('Comment content cannot be empty');
  const extracted = (content.match(/@([a-zA-Z0-9_-]+)/g) || []).map((m) => m.slice(1).toLowerCase());
  const comment = {
    id: `cmt_${now.getTime()}_${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    deliverableId: input.deliverableId || null,
    annotation: input.annotation || null,
    author: input.author || 'Designer',
    authorRole: input.authorRole || 'User',
    authorAvatar: input.authorAvatar || '',
    content,
    mentions: [...new Set([...(input.mentions || []), ...extracted])],
    timestamp: now.toISOString(),
    resolved: false
  };
  const review = await readReview(fs, projectPath, projectId);
  await writeReview(fs, review.path, {
    ...review.frontmatter,
    project_id: projectId || review.frontmatter.project_id,
    comments: [...review.comments, comment]
  });
  return comment;
}

export async function resolveComment(
  fs: VaultFs,
  projectPath: string,
  projectId: string,
  commentId: string,
  resolved: boolean,
  actor: string,
  now = new Date()
) {
  const review = await readReview(fs, projectPath, projectId);
  if (!review.comments.some((c) => c.id === commentId)) throw new Error(`Comment with ID ${commentId} not found`);
  const comments = review.comments.map((c) =>
    c.id === commentId ? { ...c, resolved, resolvedBy: resolved ? actor : null, resolvedAt: resolved ? now.toISOString() : null } : c
  );
  await writeReview(fs, review.path, { ...review.frontmatter, comments });
  return { success: true, commentId, resolved };
}

/** Solo app: the owner may delete any comment (the team-role check is gone). */
export async function deleteComment(fs: VaultFs, projectPath: string, projectId: string, commentId: string) {
  const review = await readReview(fs, projectPath, projectId);
  if (!review.comments.some((c) => c.id === commentId)) throw new Error(`Comment with ID ${commentId} not found`);
  await writeReview(fs, review.path, { ...review.frontmatter, comments: review.comments.filter((c) => c.id !== commentId) });
  return { success: true, commentId };
}

export async function getApprovals(fs: VaultFs, projectPath: string, projectId?: string): Promise<any[]> {
  return (await readReview(fs, projectPath, projectId)).approvals;
}

export async function addApproval(fs: VaultFs, projectPath: string, projectId: string, record: Record<string, any>) {
  const review = await readReview(fs, projectPath, projectId);
  await writeReview(fs, review.path, {
    ...review.frontmatter,
    project_id: projectId || review.frontmatter.project_id,
    approvals: [record, ...review.approvals]
  });
  return record;
}
