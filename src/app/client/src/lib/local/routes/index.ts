/**
 * Every local route module. Each MASTER_PLAN Phase 2 task adds one line.
 */

import type { LocalRouter } from '../router';
import { systemRoutes } from './system';

export function registerRoutes(router: LocalRouter): void {
  router.use(systemRoutes);
}
