import type { ItemStatus } from '@/types';

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bgClass: string; textClass: string }> = {
  not_started: { label: 'Not Started', color: '#64748b', bgClass: 'bg-slate-100', textClass: 'text-slate-600' },
  in_progress: { label: 'In Progress', color: '#0d9488', bgClass: 'bg-primary-100', textClass: 'text-primary-800' },
  complete: { label: 'Complete', color: '#d97706', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
  delayed: { label: 'Delayed', color: '#dc2626', bgClass: 'bg-red-100', textClass: 'text-red-800' },
};

export function getStatusLabel(status: ItemStatus): string {
  return STATUS_CONFIG[status].label;
}

export function getStatusColor(status: ItemStatus): string {
  return STATUS_CONFIG[status].color;
}

export function getStatusBgClass(status: ItemStatus): string {
  return `${STATUS_CONFIG[status].bgClass} ${STATUS_CONFIG[status].textClass}`;
}
