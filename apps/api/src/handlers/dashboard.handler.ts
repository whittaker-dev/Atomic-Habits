import type { NextFunction, Request, Response } from 'express';
import type { SessionRequest } from '../lib/session.js';
import { AuthMessages, AuthRouteStatus } from '../responses/auth.js';
import { DashboardRouteStatus, dashboardSummaryResponse } from '../responses/dashboard.js';
import { apiError } from '../schemas/parse.js';
import { authService } from '../services/auth.service.js';
import { dashboardService } from '../services/dashboard.service.js';

export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as SessionRequest).session?.userId;
    if (!userId) {
      throw apiError(AuthMessages.UNAUTHORIZED, AuthRouteStatus.me.unauthorized);
    }

    const user = await authService.getVerifiedUser(userId);
    const summary = await dashboardService.getSummary(user.id);
    res.status(DashboardRouteStatus.get.success).json(dashboardSummaryResponse(summary));
  } catch (error) {
    next(error);
  }
}
