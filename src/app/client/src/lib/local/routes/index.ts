/**
 * Every local route module. Each MASTER_PLAN Phase 2 task adds one line.
 * Order matters only where two modules could match the same path; specific
 * routes are registered before generic ones within each module.
 */

import type { LocalRouter } from '../router';
import { clientRoutes } from './clients';
import { dashboardRoutes } from './dashboard';
import { exportRoutes } from './export';
import { financeRoutes } from './finance';
import { healthRoutes } from './health';
import { journalRoutes } from './journal';
import { notesRoutes } from './notes';
import { ownerRoutes } from './owner';
import { projectRoutes } from './projects';
import { projectWorkRoutes } from './projectWork';
import { systemRoutes } from './system';
import { timerRoutes } from './timer';

export function registerRoutes(router: LocalRouter): void {
  router.use(
    systemRoutes,
    ownerRoutes,
    projectRoutes,
    projectWorkRoutes,
    clientRoutes,
    dashboardRoutes,
    notesRoutes,
    journalRoutes,
    exportRoutes,
    healthRoutes,
    financeRoutes,
    timerRoutes
  );
}
