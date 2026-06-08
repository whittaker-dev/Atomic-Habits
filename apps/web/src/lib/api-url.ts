const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `/api${path}`;
  }
  return `${apiBase}${path}`;
}
