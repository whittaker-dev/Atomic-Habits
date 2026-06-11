import type { PlanTripRecord, PlanTripUpsertBody } from '@atomic-habits/shared';
import { planTripRepository } from '../repositories/plan-trip.repository.js';
import { apiError } from '../schemas/parse.js';

function toRecord(
  slug: string,
  row: {
    name: string;
    description: string;
    eyebrow: string;
    datesLabel: string;
    members: unknown;
    transport: unknown;
    accommodation: unknown;
    itinerary: unknown;
  },
): PlanTripRecord {
  return {
    slug,
    name: row.name,
    description: row.description,
    eyebrow: row.eyebrow,
    datesLabel: row.datesLabel,
    members: row.members as PlanTripRecord['members'],
    transport: row.transport as PlanTripRecord['transport'],
    accommodation: row.accommodation as PlanTripRecord['accommodation'],
    itinerary: row.itinerary as PlanTripRecord['itinerary'],
  };
}

export const planTripService = {
  async getBySlug(slug: string): Promise<PlanTripRecord | null> {
    const row = await planTripRepository.findBySlug(slug);
    if (!row) return null;
    return toRecord(slug, row);
  },

  async upsert(slug: string, body: PlanTripUpsertBody): Promise<PlanTripRecord> {
    const row = await planTripRepository.upsert(slug, body);
    return toRecord(slug, row);
  },

  assertSlug(slug: string): string {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw apiError('Invalid trip slug', 400);
    }
    return slug;
  },
};
