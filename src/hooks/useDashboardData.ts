import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { deliverablesApi, activitiesApi, tasksApi } from '@/lib/api';
import { useAccessibleWorkstreamIds } from './useAccessibleWorkstreamIds';
import { isOverdue, isWithinDays, daysOverdue } from '@/lib/utils';
import { calculateProgress, calculateDeepStatusCounts } from '@/lib/utils/progress';
import type { Activity, Deliverable, Task } from '@/types';
import { useMemo } from 'react';

interface DashboardData {
  totalDeliverables: number;
  overallProgress: number;
  onTrack: number;
  needsAttention: number;
  upcomingDeadlines: (Activity | Deliverable)[];
  attentionItems: AttentionItem[];
  statusCounts: Record<string, number>;
  allActivities: Activity[];
  allDeliverables: Deliverable[];
  allTasks: Task[];
}

export interface AttentionItem {
  id: string;
  name: string;
  type: 'activity' | 'task' | 'deliverable';
  workstream_id: string;
  reason: string;
  daysOverdue?: number;
}

export function useDashboardData() {
  const { ids, isReady } = useAccessibleWorkstreamIds();

  const queryKey = useMemo(
    () => [...queryKeys.dashboard.all(), ids] as const,
    [ids],
  );

  return useQuery<DashboardData>({
    queryKey,
    queryFn: async () => {
      const wsFilter = ids ?? undefined;
      const [deliverables, activities, allTasks] = await Promise.all([
        deliverablesApi.getAll(wsFilter),
        activitiesApi.getAll(wsFilter),
        tasksApi.getAll(),
      ]);

      // Filter tasks client-side for non-admins
      let tasks: Task[];
      if (ids === null) {
        tasks = allTasks;
      } else {
        const accessibleActivityIds = new Set(activities.map(a => a.id));
        tasks = allTasks.filter(t => accessibleActivityIds.has(t.activity_id));
      }

      const totalDeliverables = deliverables.length;
      const overallProgress = calculateProgress(deliverables);

      const overdueOrDelayedDels = deliverables.filter(
        d => d.status === 'delayed' || isOverdue(d.due_date, d.status),
      );
      const onTrack = totalDeliverables - overdueOrDelayedDels.length;
      const needsAttention = overdueOrDelayedDels.length;

      // Upcoming deadlines: items due in next 30 days, not complete
      const upcoming: (Activity | Deliverable)[] = [];
      for (const d of deliverables) {
        if (d.status !== 'complete' && isWithinDays(d.due_date, 30)) {
          upcoming.push(d);
        }
      }
      for (const a of activities) {
        if (a.status !== 'complete' && isWithinDays(a.end_date, 30)) {
          upcoming.push(a);
        }
      }
      upcoming.sort((a, b) => {
        const dateA = 'due_date' in a ? a.due_date : a.end_date;
        const dateB = 'due_date' in b ? b.due_date : b.end_date;
        return dateA.localeCompare(dateB);
      });

      // Attention items
      const attentionItems: AttentionItem[] = [];
      for (const a of activities) {
        if (isOverdue(a.end_date, a.status)) {
          attentionItems.push({
            id: a.id, name: a.name, type: 'activity', workstream_id: a.workstream_id,
            reason: `${daysOverdue(a.end_date)} days overdue`, daysOverdue: daysOverdue(a.end_date),
          });
        } else if (a.status === 'delayed') {
          attentionItems.push({
            id: a.id, name: a.name, type: 'activity', workstream_id: a.workstream_id, reason: 'Delayed',
          });
        }
      }
      for (const d of deliverables) {
        if (isOverdue(d.due_date, d.status)) {
          attentionItems.push({
            id: d.id, name: d.name, type: 'deliverable', workstream_id: d.workstream_id,
            reason: `${daysOverdue(d.due_date)} days overdue`, daysOverdue: daysOverdue(d.due_date),
          });
        } else if (d.status === 'delayed') {
          attentionItems.push({
            id: d.id, name: d.name, type: 'deliverable', workstream_id: d.workstream_id, reason: 'Delayed',
          });
        }
      }
      for (const t of tasks) {
        if (t.end_date && isOverdue(t.end_date, t.status)) {
          attentionItems.push({
            id: t.id, name: t.name, type: 'task', workstream_id: '',
            reason: `${daysOverdue(t.end_date)} days overdue`, daysOverdue: daysOverdue(t.end_date),
          });
        }
      }
      attentionItems.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

      const { counts: statusCounts } = calculateDeepStatusCounts(activities, tasks);

      return {
        totalDeliverables,
        overallProgress,
        onTrack,
        needsAttention,
        upcomingDeadlines: upcoming.slice(0, 10),
        attentionItems: attentionItems.slice(0, 10),
        statusCounts,
        allActivities: activities,
        allDeliverables: deliverables,
        allTasks: tasks,
      };
    },
    enabled: isReady,
  });
}
