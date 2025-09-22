import { format, startOfDay, isBefore } from 'date-fns';

export function getLocalTime(): Date {
  return new Date();
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return format(date, 'dd/MM/yyyy HH:mm');
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, 'dd/MM/yyyy');
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return format(date, 'HH:mm');
}

export function getDateKey(dateString: string): string {
  const date = new Date(dateString);
  return format(startOfDay(date), 'yyyy-MM-dd');
}

export function isOlderThan72Hours(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - (72 * 60 * 60 * 1000));
  return isBefore(date, cutoffDate);
}

export function getTimeDifference(dateString: string): string {
  const date = new Date(dateString);
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