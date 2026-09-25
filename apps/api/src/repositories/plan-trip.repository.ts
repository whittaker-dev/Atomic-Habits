import type { PlanTripUpsertBody } from '@atomic-habits/shared';
import { prisma } from '../lib/prisma.js';

// Prisma maps a DATE column to a Date at UTC midnight, so parse and print in UTC
// to keep the calendar day unchanged whatever the server's time zone is.
function toDbDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

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
        startDate: toDbDate(data.startDate),
        endDate: toDbDate(data.endDate),
        startDayPart: data.startDayPart,
        endDayPart: data.endDayPart,
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
        startDate: toDbDate(data.startDate),
        endDate: toDbDate(data.endDate),
        startDayPart: data.startDayPart,
        endDayPart: data.endDayPart,
        members: data.members,
        transport: data.transport,
        accommodation: data.accommodation,
        itinerary: data.itinerary,
      },
    });
  },
};
