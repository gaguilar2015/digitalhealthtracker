import type { Activity } from '@/types';
import { isWithinDays } from './dates';

export type ActivityCategory = 'completed' | 'in_progress' | 'upcoming' | 'delayed' | 'not_started';

export const CATEGORY_CONFIGS: { key: ActivityCategory; label: string; statusColor: string }[] = [
  { key: 'completed', label: 'Completed', statusColor: '#d97706' },
  { key: 'in_progress', label: 'In Progress', statusColor: '#0d9488' },
  { key: 'upcoming', label: 'Upcoming', statusColor: '#3b82f6' },
  { key: 'delayed', label: 'Delayed', statusColor: '#dc2626' },
  { key: 'not_started', label: 'Not Started', statusColor: '#64748b' },
];

export function categorizeActivity(activity: Activity): ActivityCategory {
  if (activity.status === 'complete') return 'completed';
  if (activity.status === 'in_progress') return 'in_progress';
  if (activity.status === 'delayed') return 'delayed';
  // not_started — check if upcoming (starts within 14 days)
  if (activity.start_date && isWithinDays(activity.start_date, 14)) return 'upcoming';
  return 'not_started';
}

export function groupAndSortActivities(activities: Activity[]): Map<ActivityCategory, Activity[]> {
  const groups = new Map<ActivityCategory, Activity[]>();

  for (const config of CATEGORY_CONFIGS) {
    groups.set(config.key, []);
  }

  for (const activity of activities) {
    const category = categorizeActivity(activity);
    groups.get(category)!.push(activity);
  }

  // Sort each category
  const sortFns: Record<ActivityCategory, (a: Activity, b: Activity) => number> = {
    completed: (a, b) => b.end_date.localeCompare(a.end_date), // most recent first
    in_progress: (a, b) => a.end_date.localeCompare(b.end_date), // soonest deadline first
    upcoming: (a, b) => a.start_date.localeCompare(b.start_date), // soonest start first
    delayed: (a, b) => a.end_date.localeCompare(b.end_date), // most overdue first
    not_started: (a, b) => a.start_date.localeCompare(b.start_date), // soonest start first
  };

  for (const [category, items] of groups) {
    items.sort(sortFns[category]);
  }

  return groups;
}
