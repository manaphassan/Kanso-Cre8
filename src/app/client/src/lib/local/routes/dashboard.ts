/**
 * Dashboard and notification routes (P2.4). Mirrors GET /dashboard and
 * GET /notifications in server/routes/system.js.
 */

import { getDashboardMetrics } from '$lib/domain/dashboard';
import { DEFAULT_NOTIFICATION_LIMIT, getNotifications } from '$lib/domain/notifications';
import { allProjects } from '../projectIndex';
import type { LocalRouter } from '../router';

export function dashboardRoutes(router: LocalRouter): void {
  router.get('/dashboard', async ({ ctx, query }) =>
    getDashboardMetrics(await allProjects(ctx), { timeRange: query.timeRange || 'all', brand: query.brand || 'all' }, ctx.now())
  );

  router.get('/notifications', async ({ ctx, query }) => {
    const limit = parseInt(query.limit, 10) || DEFAULT_NOTIFICATION_LIMIT;
    const notifications = await getNotifications(await ctx.vault(), await allProjects(ctx), limit);
    return { notifications, unreadCount: notifications.filter((n) => n.unread).length };
  });
}
