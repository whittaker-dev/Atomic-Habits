'use client';

import {
  DEFAULT_PLAN_TRIP_SLUG,
  type PlanTripRecord,
  type PlanTripUpsertBody,
} from '@atomic-habits/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetchPlanTrip, planTripKey, savePlanTrip } from '@/lib/plan-trip-api';
import type {
  AccommodationPlanData,
  ItineraryDayData,
  ItineraryPlanData,
  TransportItemData,
  TripPlanData,
} from './trip-plan-types';
import type { TripMember } from './trip-plan-types';

const LEGACY_MEMBERS_KEY = 'vung-tau-trip-members';
const LEGACY_PLAN_KEY = 'vung-tau-trip-plan';
const SAVE_DEBOUNCE_MS = 600;

export type TripMeta = {
  name: string;
  description: string;
  eyebrow: string;
  datesLabel: string;
};

function createId() {
  return crypto.randomUUID();
}

export function createItineraryIds(data: ItineraryPlanData): ItineraryPlanData {
  return {
    days: data.days.map((day) => ({
      ...day,
      id: day.id || createId(),
      entries: day.entries.map((entry) => ({
        ...entry,
        id: entry.id || createId(),
      })),
    })),
  };
}

function normalizeTransportItems(items: TransportItemData[]): TransportItemData[] {
  return items.map((item) => ({
    ...item,
    id: item.id || createId(),
    details: Array.isArray(item.details) ? item.details : [],
  }));
}

function readLegacyLocalStorage(): Partial<PlanTripUpsertBody> | null {
  if (typeof window === 'undefined') return null;

  try {
    const membersRaw = localStorage.getItem(LEGACY_MEMBERS_KEY);
    const planRaw = localStorage.getItem(LEGACY_PLAN_KEY);
    if (!membersRaw && !planRaw) return null;

    const payload: Partial<PlanTripUpsertBody> = {};

    if (membersRaw) {
      const parsed = JSON.parse(membersRaw) as TripMember[];
      if (Array.isArray(parsed)) {
        payload.members = parsed;
      }
    }

    if (planRaw) {
      const parsed = JSON.parse(planRaw) as Partial<TripPlanData>;
      if (parsed.transport) {
        payload.transport = normalizeTransportItems(
          Array.isArray(parsed.transport) ? parsed.transport : [],
        );
      }
      if (parsed.accommodation) {
        payload.accommodation = parsed.accommodation;
      }
      if (parsed.itinerary) {
        payload.itinerary = createItineraryIds(parsed.itinerary);
      }
    }

    return payload;
  } catch {
    return null;
  }
}

function clearLegacyLocalStorage() {
  localStorage.removeItem(LEGACY_MEMBERS_KEY);
  localStorage.removeItem(LEGACY_PLAN_KEY);
}

function toUpsertBody(
  meta: TripMeta,
  members: TripMember[],
  transport: TransportItemData[],
  accommodation: AccommodationPlanData,
  itinerary: ItineraryPlanData,
): PlanTripUpsertBody {
  return {
    name: meta.name,
    description: meta.description,
    eyebrow: meta.eyebrow,
    datesLabel: meta.datesLabel,
    members,
    transport,
    accommodation,
    itinerary,
  };
}

function serializeRecord(record: PlanTripRecord) {
  return JSON.stringify(
    toUpsertBody(
      {
        name: record.name,
        description: record.description,
        eyebrow: record.eyebrow,
        datesLabel: record.datesLabel,
      },
      record.members,
      record.transport,
      record.accommodation,
      record.itinerary,
    ),
  );
}

type UsePlanTripOptions = {
  slug?: string;
  defaults: TripMeta & TripPlanData;
};

export function usePlanTrip({ slug = DEFAULT_PLAN_TRIP_SLUG, defaults }: UsePlanTripOptions) {
  const [meta, setMeta] = useState<TripMeta>({
    name: defaults.name ?? '',
    description: defaults.description ?? '',
    eyebrow: defaults.eyebrow ?? '',
    datesLabel: defaults.datesLabel ?? '',
  });
  const [members, setMembers] = useState<TripMember[]>([]);
  const [transport, setTransport] = useState<TransportItemData[]>(
    normalizeTransportItems(defaults.transport),
  );
  const [accommodation, setAccommodation] = useState<AccommodationPlanData>(defaults.accommodation);
  const [itinerary, setItinerary] = useState<ItineraryPlanData>(
    createItineraryIds(defaults.itinerary),
  );
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipSaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef('');
  const saveVersionRef = useRef(0);
  const bootstrappedRef = useRef(false);

  const {
    data: remote,
    error: loadError,
    isLoading,
  } = useSWR(planTripKey(slug), () => fetchPlanTrip(slug), { revalidateOnFocus: true });

  const applyRecord = useCallback((record: PlanTripRecord) => {
    setMeta({
      name: record.name,
      description: record.description,
      eyebrow: record.eyebrow,
      datesLabel: record.datesLabel,
    });
    setMembers(record.members);
    setTransport(normalizeTransportItems(record.transport));
    setAccommodation(record.accommodation);
    setItinerary(createItineraryIds(record.itinerary));
  }, []);

  useEffect(() => {
    if (isLoading || remote === undefined) return;

    if (remote) {
      skipSaveRef.current = true;
      applyRecord(remote);
      lastSavedRef.current = serializeRecord(remote);
      setHydrated(true);
      setSaveError(null);
      return;
    }

    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const legacy = readLegacyLocalStorage();
    const initialMeta: TripMeta = {
      name: defaults.name ?? '',
      description: defaults.description ?? '',
      eyebrow: defaults.eyebrow ?? '',
      datesLabel: defaults.datesLabel ?? '',
    };
    const initialMembers = legacy?.members ?? [];
    const initialTransport = normalizeTransportItems(legacy?.transport ?? defaults.transport);
    const initialAccommodation = legacy?.accommodation ?? defaults.accommodation;
    const initialItinerary = createItineraryIds(legacy?.itinerary ?? defaults.itinerary);

    setMeta(initialMeta);
    setMembers(initialMembers);
    setTransport(initialTransport);
    setAccommodation(initialAccommodation);
    setItinerary(initialItinerary);
    setHydrated(true);

    if (!legacy) return;

    const legacyBody = toUpsertBody(
      initialMeta,
      initialMembers,
      initialTransport,
      initialAccommodation,
      initialItinerary,
    );

    void savePlanTrip(slug, legacyBody)
      .then(() => {
        lastSavedRef.current = JSON.stringify(legacyBody);
        clearLegacyLocalStorage();
      })
      .catch((error: Error) => {
        setSaveError(error.message);
      });
  }, [remote, isLoading, slug, defaults, applyRecord]);

  useEffect(() => {
    if (!loadError) return;
    setSaveError(loadError instanceof Error ? loadError.message : 'Failed to load trip');
    setHydrated(true);
  }, [loadError]);

  useEffect(() => {
    if (!hydrated) return;

    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const body = toUpsertBody(meta, members, transport, accommodation, itinerary);
      const serialized = JSON.stringify(body);
      if (serialized === lastSavedRef.current) return;

      const saveVersion = ++saveVersionRef.current;
      setSaving(true);
      setSaveError(null);
      void savePlanTrip(slug, body)
        .then(() => {
          if (saveVersion === saveVersionRef.current) {
            lastSavedRef.current = serialized;
          }
        })
        .catch((error: Error) => {
          if (saveVersion === saveVersionRef.current) {
            setSaveError(error.message);
          }
        })
        .finally(() => {
          if (saveVersion === saveVersionRef.current) {
            setSaving(false);
          }
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [meta, members, transport, accommodation, itinerary, hydrated, slug]);

  const updateMeta = useCallback((data: TripMeta) => {
    setMeta(data);
  }, []);

  const addMember = useCallback((member: Omit<TripMember, 'id'>) => {
    setMembers((prev) => [...prev, { ...member, id: createId() }]);
  }, []);

  const updateMember = useCallback((id: string, member: Omit<TripMember, 'id'>) => {
    setMembers((prev) => prev.map((item) => (item.id === id ? { ...member, id } : item)));
  }, []);

  const deleteMember = useCallback((id: string) => {
    setMembers((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addTransportItem = useCallback((item: Omit<TransportItemData, 'id'>) => {
    setTransport((prev) => [...prev, { ...item, id: createId() }]);
  }, []);

  const updateTransportItem = useCallback((id: string, item: Omit<TransportItemData, 'id'>) => {
    setTransport((prev) => prev.map((entry) => (entry.id === id ? { ...item, id } : entry)));
  }, []);

  const deleteTransportItem = useCallback((id: string) => {
    setTransport((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const updateAccommodation = useCallback((data: AccommodationPlanData) => {
    setAccommodation(data);
  }, []);

  const addItineraryDay = useCallback((day: Omit<ItineraryDayData, 'id'>) => {
    setItinerary((prev) =>
      createItineraryIds({
        days: [...prev.days, { ...day, id: createId() }],
      }),
    );
  }, []);

  const updateItineraryDay = useCallback((id: string, day: Omit<ItineraryDayData, 'id'>) => {
    setItinerary((prev) =>
      createItineraryIds({
        days: prev.days.map((entry) => (entry.id === id ? { ...day, id } : entry)),
      }),
    );
  }, []);

  const deleteItineraryDay = useCallback((id: string) => {
    setItinerary((prev) => createItineraryIds({ days: prev.days.filter((day) => day.id !== id) }));
  }, []);

  return {
    meta,
    members,
    transport,
    accommodation,
    itinerary,
    hydrated,
    saving,
    saveError,
    updateMeta,
    addMember,
    updateMember,
    deleteMember,
    addTransportItem,
    updateTransportItem,
    deleteTransportItem,
    updateAccommodation,
    addItineraryDay,
    updateItineraryDay,
    deleteItineraryDay,
  };
}
