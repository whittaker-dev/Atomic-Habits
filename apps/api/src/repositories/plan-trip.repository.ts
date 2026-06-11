import type { PlanTripUpsertBody } from '@atomic-habits/shared';
import { prisma } from '../lib/prisma.js';

export const planTripRepository = {
  findBySlug(slug: string) {
    return prisma.planTrip.findUnique({ where: { slug } });
  },

  upsert(slug: string, data: PlanTripUpsertBody) {
    return prisma.planTrip.upsert({
      where: { slug },
      create: {
        slug,
        name: data.name,
        description: data.description,
        eyebrow: data.eyebrow,
        datesLabel: data.datesLabel,
        members: data.members,
        transport: data.transport,
        accommodation: data.accommodation,
        itinerary: data.itinerary,
      },
      update: {
        name: data.name,
        description: data.description,
        eyebrow: data.eyebrow,
        datesLabel: data.datesLabel,
        members: data.members,
        transport: data.transport,
        accommodation: data.accommodation,
        itinerary: data.itinerary,
      },
    });
  },
};
