/** Calendar date (YYYY-MM-DD) for the given IANA timezone. */
export function getTodayDateString(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Midnight UTC for a YYYY-MM-DD string — matches PostgreSQL DATE storage. */
export function dateStringToUtcDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

/** Previous calendar day (YYYY-MM-DD) in the given IANA timezone. */
export function getYesterdayDateString(timezone: string): string {
  const today = dateStringToUtcDate(getTodayDateString(timezone));
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}
