import { format, parseISO, differenceInDays, isBefore, isAfter, addDays } from 'date-fns';
import type { ItemStatus } from '@/types';

export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return format(parseISO(date), 'MMM d, yyyy');
}

export function formatDateRange(start: string, end: string): string {
  const s = parseISO(start);
  const e = parseISO(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  if (sameYear) {
    return `${format(s, 'MMM yyyy')} - ${format(e, 'MMM yyyy')}`;
  }
  return `${format(s, 'MMM yyyy')} - ${format(e, 'MMM yyyy')}`;
}

export function isOverdue(endDate: string | null | undefined, status: ItemStatus): boolean {
  if (!endDate || status === 'complete') return false;
  return isBefore(parseISO(endDate), new Date());
}

export function daysOverdue(endDate: string): number {
  const end = parseISO(endDate);
  const now = new Date();
  if (isAfter(end, now)) return 0;
  return differenceInDays(now, end);
}

export function daysUntil(date: string): number {
  return differenceInDays(parseISO(date), new Date());
}

export function isWithinDays(date: string, days: number): boolean {
  const target = parseISO(date);
  const now = new Date();
  const limit = addDays(now, days);
  return isAfter(target, now) && isBefore(target, limit);
}
