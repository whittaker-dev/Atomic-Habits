import type { PlanTripRecord, PlanTripUpsertBody } from '@atomic-habits/shared';
import { isAxiosError } from 'axios';
import { apiClient, getErrorMessage } from './api-client';

type PlanTripResponse = { trip: PlanTripRecord };

export const planTripKey = (slug: string) => ['plan-trip', slug] as const;

export async function fetchPlanTrip(slug: string): Promise<PlanTripRecord | null> {
  try {
    const { data } = await apiClient.get<PlanTripResponse>(`/plan-trips/${slug}`);
    return data.trip;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw new Error(getErrorMessage(error));
  }
}

export async function savePlanTrip(
  slug: string,
  body: PlanTripUpsertBody,
): Promise<PlanTripRecord> {
  try {
    const { data } = await apiClient.put<PlanTripResponse>(`/plan-trips/${slug}`, body);
    return data.trip;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
