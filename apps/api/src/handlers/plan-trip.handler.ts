import type { NextFunction, Request, Response } from 'express';
import { planTripService } from '../services/plan-trip.service.js';
import { parseBody, planTripSlugParamSchema, planTripUpsertBodySchema } from '../schemas/index.js';
import { apiError } from '../schemas/parse.js';

function readSlugParam(value: string | string[] | undefined): string {
  const slug = Array.isArray(value) ? value[0] : value;
  return slug ?? '';
}

export async function getPlanTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const slug = planTripService.assertSlug(readSlugParam(req.params.slug));
    const trip = await planTripService.getBySlug(slug);
    if (!trip) {
      throw apiError('Trip not found', 404);
    }
    res.json({ trip });
  } catch (error) {
    next(error);
  }
}

export async function upsertPlanTrip(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const slug = planTripSlugParamSchema.parse(readSlugParam(req.params.slug));
    const body = parseBody(planTripUpsertBodySchema, req.body);
    const trip = await planTripService.upsert(slug, body);
    res.json({ trip });
  } catch (error) {
    next(error);
  }
}
