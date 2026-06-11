import { z } from 'zod';

const planTripMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  role: z.string().max(120).default(''),
  phone: z.string().max(40).default(''),
  note: z.string().max(500).default(''),
});

const planTripTransportItemSchema = z.object({
  id: z.string().min(1),
  icon: z.enum(['car', 'ferry']),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  details: z.array(z.string().max(300)).max(20).default([]),
});

const planTripAccommodationSchema = z.object({
  eyebrow: z.string().max(120).default(''),
  name: z.string().max(200).default(''),
  address: z.string().max(500).default(''),
  checkInTime: z.string().max(120).default(''),
  checkOutTime: z.string().max(120).default(''),
  contactInfo: z.string().max(500).default(''),
  amenities: z.array(z.string().max(120)).max(30).default([]),
  notes: z.string().max(2000).default(''),
  images: z.array(z.string().max(2000)).max(30).default([]),
});

const planTripItineraryEntrySchema = z.object({
  id: z.string().min(1),
  time: z.string().max(10),
  title: z.string().min(1).max(200),
  location: z.string().max(300).default(''),
  meal: z.string().max(200).optional(),
  type: z.enum(['activity', 'meal', 'travel']),
});

const planTripItineraryDaySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  entries: z.array(planTripItineraryEntrySchema).max(50).default([]),
});

export const planTripUpsertBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  eyebrow: z.string().max(120).default(''),
  datesLabel: z.string().max(200).default(''),
  members: z.array(planTripMemberSchema).max(100).default([]),
  transport: z.array(planTripTransportItemSchema).max(30).default([]),
  accommodation: planTripAccommodationSchema,
  itinerary: z.object({
    days: z.array(planTripItineraryDaySchema).max(30).default([]),
  }),
});

export type PlanTripUpsertBodyInput = z.infer<typeof planTripUpsertBodySchema>;

export const planTripSlugParamSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid trip slug');
