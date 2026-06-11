export const DEFAULT_PLAN_TRIP_SLUG = 'default';

export type PlanTripMember = {
  id: string;
  name: string;
  role: string;
  phone: string;
  note: string;
};

export type PlanTripTransportIcon = 'car' | 'ferry';

export type PlanTripTransportItem = {
  id: string;
  icon: PlanTripTransportIcon;
  title: string;
  description: string;
  details: string[];
};

export type PlanTripAccommodation = {
  eyebrow: string;
  name: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  contactInfo: string;
  amenities: string[];
  notes: string;
  images: string[];
};

export type PlanTripItineraryEntryType = 'activity' | 'meal' | 'travel';

export type PlanTripItineraryEntry = {
  id: string;
  time: string;
  title: string;
  location: string;
  meal?: string;
  type: PlanTripItineraryEntryType;
};

export type PlanTripItineraryDay = {
  id: string;
  label: string;
  entries: PlanTripItineraryEntry[];
};

export type PlanTripItinerary = {
  days: PlanTripItineraryDay[];
};

export type PlanTripRecord = {
  slug: string;
  name: string;
  description: string;
  eyebrow: string;
  datesLabel: string;
  members: PlanTripMember[];
  transport: PlanTripTransportItem[];
  accommodation: PlanTripAccommodation;
  itinerary: PlanTripItinerary;
};

export type PlanTripUpsertBody = Omit<PlanTripRecord, 'slug'>;
