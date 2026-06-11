export type TripMember = {
  id: string;
  name: string;
  role: string;
  phone: string;
  note: string;
};

export type TransportIcon = 'car' | 'ferry';

export type TransportItemData = {
  id: string;
  icon: TransportIcon;
  title: string;
  description: string;
  details: string[];
};

export type TransportPlanData = TransportItemData[];

export type AccommodationPlanData = {
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

export type ItineraryEntryType = 'activity' | 'meal' | 'travel';

export type ItineraryEntryData = {
  id: string;
  time: string;
  title: string;
  location: string;
  meal?: string;
  type: ItineraryEntryType;
};

export type ItineraryDayData = {
  id: string;
  label: string;
  entries: ItineraryEntryData[];
};

export type ItineraryPlanData = {
  days: ItineraryDayData[];
};

export type TripPlanData = {
  transport: TransportPlanData;
  accommodation: AccommodationPlanData;
  itinerary: ItineraryPlanData;
};
