import { format, parseISO, addHours, startOfDay, isAfter, isBefore, isEqual } from 'date-fns';

// UTC+2 timezone offset
const TIMEZONE_OFFSET = 2;

export function getLocalTime(): Date {
  const now = new Date();
  return addHours(now, TIMEZONE_OFFSET);
}

export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString);
  const localDate = addHours(date, TIMEZONE_OFFSET);
  return format(localDate, 'dd/MM/yyyy HH:mm');
}

export function formatDate(dateString: string): string {
  const date = parseISO(dateString);
  const localDate = addHours(date, TIMEZONE_OFFSET);
  return format(localDate, 'dd/MM/yyyy');
}

export function formatTime(dateString: string): string {
  const date = parseISO(dateString);
  const localDate = addHours(date, TIMEZONE_OFFSET);
  return format(localDate, 'HH:mm');
}

export function getDateKey(dateString: string): string {
  const date = parseISO(dateString);
  const localDate = addHours(date, TIMEZONE_OFFSET);
  return format(startOfDay(localDate), 'yyyy-MM-dd');
}

export function isOlderThan72Hours(dateString: string): boolean {
  const date = parseISO(dateString);
  const now = new Date();
  const cutoffDate = addHours(now, -72);
  return isBefore(date, cutoffDate);
}

export function getTimeDifference(dateString: string): string {
  const date = parseISO(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  }
  return `${minutes}m ago`;
}

export function groupByDate<T extends { createdAt: string }>(items: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  items.forEach(item => {
    const dateKey = getDateKey(item.createdAt);
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, item]);
  });

  // Sort dates in descending order
  const sortedMap = new Map(
    Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
  );

  return sortedMap;
}