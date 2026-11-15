/**
 * Activity notifications for the header bell and drawer, built from every
 * project's `_review.md` (comments and approval decisions). Port of
 * CommentService.getNotifications, which read the audit log; the audit log is
 * gone (D2), so the review files are the source.
 */

import type { VaultFs } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';
import type { Project } from './projects';
import { readReview } from './review';

export type NotificationType = 'mention' | 'comment' | 'revision' | 'approval' | 'system' | 'info';

/** Same shape as the client's ActivityNotification. */
export interface ActivityNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  actor: string;
  role: string;
  route: string;
  routeId?: string;
  unread: boolean;
}

export const DEFAULT_NOTIFICATION_LIMIT = 25;
const SNIPPET = 60;

const snippet = (text: string) => (text.length > SNIPPET ? `${text.slice(0, SNIPPET)}...` : text);

/** Notifications for one project's review data, unsorted. */
export function reviewNotifications(project: Project, comments: any[], approvals: any[]): ActivityNotification[] {
  const ref = project.jobId || project.id;
  const out: ActivityNotification[] = [];
  comments.forEach((c, i) => {
    if (!c || typeof c !== 'object') return;
    const author = String(c.author || 'User');
    const content = String(c.content || '').trim();
    out.push({
      id: `notif_${c.id || `${project.id}_c${i}`}`,
      type: 'comment',
      title: `Comment by ${author}`,
      message: content ? snippet(content) : `New comment on project ${ref}`,
      timestamp: String(c.timestamp || ''),
      actor: author,
      role: String(c.authorRole || 'User'),
      route: 'project-detail',
      routeId: ref,
      // Resolved threads stay in the feed as history.
      unread: !c.resolved
    });
  });
  approvals.forEach((a, i) => {
    if (!a || typeof a !== 'object') return;
    const decision = String(a.decision || '').toLowerCase();
    const reviewer = String(a.reviewer || 'Reviewer');
    const base = {
      id: `notif_${a.id || `${project.id}_a${i}`}`,
      timestamp: String(a.timestamp || ''),
      actor: reviewer,
      role: String(a.role || 'Manager'),
      route: 'project-detail',
      routeId: ref,
      unread: true
    };
    if (decision.includes('revision')) {
      out.push({
        ...base,
        type: 'revision',
        title: `Revision Requested on ${ref}`,
        message: String(a.comment || a.feedback || a.reason || '').trim() || `${reviewer} requested revisions.`
      });
    } else if (decision.includes('approv')) {
      out.push({ ...base, type: 'approval', title: `Project Approved: ${ref}`, message: `${reviewer} signed off and approved deliverables.` });
    }
    // Other decisions (rejected / on hold) were not notifications on the server either.
  });
  return out;
}

const REVIEW_FILES = new Set(['_review.md', '_comments.jsonl']);

async function hasReview(fs: VaultFs, project: Project): Promise<boolean> {
  try {
    return (await fs.listDir(project.fullPath)).some((e) => !e.isDir && REVIEW_FILES.has(baseName(e.path)));
  } catch {
    return false;
  }
}

/** Newest first, at most `limit`. Projects without a review file cost one folder listing. */
export async function getNotifications(
  fs: VaultFs,
  projects: Project[],
  limit = DEFAULT_NOTIFICATION_LIMIT
): Promise<ActivityNotification[]> {
  const perProject = await Promise.all(
    projects.map(async (project) => {
      if (!(await hasReview(fs, project))) return [];
      try {
        const review = await readReview(fs, project.fullPath, project.jobId || project.id);
        return reviewNotifications(project, review.comments, review.approvals);
      } catch (err: any) {
        console.warn(`[notifications] Could not read review for ${project.id}:`, err?.message);
        return [];
      }
    })
  );
  const time = (n: ActivityNotification) => {
    const t = new Date(n.timestamp).getTime();
    return isNaN(t) ? 0 : t;
  };
  const max = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_NOTIFICATION_LIMIT;
  return perProject
    .flat()
    .sort((a, b) => time(b) - time(a) || a.id.localeCompare(b.id))
    .slice(0, max);
}
