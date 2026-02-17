import type { ItemStatus, Activity, Task } from '@/types';

interface HasStatus {
  status: ItemStatus;
}

export function calculateProgress(items: HasStatus[]): number {
  if (items.length === 0) return 0;
  const completed = items.filter(i => i.status === 'complete').length;
  return Math.round((completed / items.length) * 100);
}

/**
 * Calculate progress at the deepest granularity level.
 * For activities that have tasks, counts tasks instead of the activity itself.
 * For activities without tasks, counts the activity as a single leaf item.
 * This gives a more accurate picture of actual work completed.
 */
export function calculateDeepProgress(activities: Activity[], tasks: Task[]): number {
  if (activities.length === 0) return 0;

  const tasksByActivity = new Map<string, Task[]>();
  for (const task of tasks) {
    const existing = tasksByActivity.get(task.activity_id) ?? [];
    existing.push(task);
    tasksByActivity.set(task.activity_id, existing);
  }

  let totalLeafItems = 0;
  let completedLeafItems = 0;

  for (const activity of activities) {
    const activityTasks = tasksByActivity.get(activity.id);
    if (activityTasks && activityTasks.length > 0) {
      totalLeafItems += activityTasks.length;
      completedLeafItems += activityTasks.filter(t => t.status === 'complete').length;
    } else {
      totalLeafItems += 1;
      completedLeafItems += activity.status === 'complete' ? 1 : 0;
    }
  }

  return totalLeafItems === 0 ? 0 : Math.round((completedLeafItems / totalLeafItems) * 100);
}

export function calculateStatusCounts(items: HasStatus[]): Record<ItemStatus, number> {
  return {
    not_started: items.filter(i => i.status === 'not_started').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    complete: items.filter(i => i.status === 'complete').length,
    delayed: items.filter(i => i.status === 'delayed').length,
  };
}

/**
 * Calculate status counts at the deepest granularity level.
 * For activities that have tasks, counts task statuses.
 * For activities without tasks, counts the activity status as a single item.
 */
export function calculateDeepStatusCounts(activities: Activity[], tasks: Task[]): { counts: Record<ItemStatus, number>; total: number } {
  const tasksByActivity = new Map<string, Task[]>();
  for (const task of tasks) {
    const existing = tasksByActivity.get(task.activity_id) ?? [];
    existing.push(task);
    tasksByActivity.set(task.activity_id, existing);
  }

  const counts: Record<ItemStatus, number> = {
    not_started: 0,
    in_progress: 0,
    complete: 0,
    delayed: 0,
  };

  let total = 0;

  for (const activity of activities) {
    const activityTasks = tasksByActivity.get(activity.id);
    if (activityTasks && activityTasks.length > 0) {
      for (const task of activityTasks) {
        counts[task.status]++;
        total++;
      }
    } else {
      counts[activity.status]++;
      total++;
    }
  }

  return { counts, total };
}
