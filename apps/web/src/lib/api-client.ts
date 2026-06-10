import axios, { isAxiosError } from 'axios';
import { getApiUrl } from './api-url';

export const apiClient = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (config.url) {
    config.url = getApiUrl(config.url);
  }
  return config;
});

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  }
  return 'Request failed';
}

export async function apiFetcher<T>(path: string): Promise<T> {
  const { data } = await apiClient.get<T>(path);
  return data;
}
