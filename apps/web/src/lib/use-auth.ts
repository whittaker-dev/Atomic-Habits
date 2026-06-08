import useSWR from 'swr';
import { fetchCurrentUser } from './auth-api';

export const CURRENT_USER_KEY = '/auth/me';

export function useCurrentUser() {
  return useSWR(CURRENT_USER_KEY, fetchCurrentUser);
}
