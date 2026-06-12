import type { NextFunction, Request, Response } from 'express';
import type { SessionRequest } from '../lib/session.js';
import { AuthMessages, AuthRouteStatus } from '../responses/auth.js';
import { DashboardRouteStatus, dashboardSummaryResponse } from '../responses/dashboard.js';
import { apiError } from '../schemas/parse.js';
import { authService } from '../services/auth.service.js';
import { missionService } from '../services/mission.service.js';

function readMissionIdParam(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value;
  return id ?? '';
}

export async function completeMission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = (req as SessionRequest).session?.userId;
    if (!userId) {
      throw apiError(AuthMessages.UNAUTHORIZED, AuthRouteStatus.me.unauthorized);
    }

    const user = await authService.getVerifiedUser(userId);
    const missionId = readMissionIdParam(req.params.id);
    if (!missionId) {
      throw apiError('Invalid mission id', 400);
    }

    const summary = await missionService.completeMission(user.id, missionId);
    res.status(DashboardRouteStatus.get.success).json(dashboardSummaryResponse(summary));
  } catch (error) {
    next(error);
  }
}
