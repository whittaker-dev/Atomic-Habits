import type { DashboardSummary } from '@atomic-habits/shared';
import { HttpStatus } from './http-status.js';

export const DashboardRouteStatus = {
  get: {
    success: HttpStatus.OK,
    unauthorized: HttpStatus.UNAUTHORIZED,
  },
} as const;

export function dashboardSummaryResponse(summary: DashboardSummary): DashboardSummary {
  return summary;
}
