import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  batchUpdateActivitySortOrder,
  batchUpdateTaskSortOrder,
  batchUpdateActivityGroupSortOrder,
  batchUpdateTrackerSortOrder,
  batchUpdateTrackerGroupSortOrder,
} from '@/lib/utils/reorder';
import { toast } from 'sonner';
import type { Activity, Task, ActivityGroup, Tracker, TrackerGroup } from '@/types';

interface ActivitySortUpdate {
  id: string;
  sort_order: number;
  activity_group_id?: string | null;
}

interface SortUpdate {
  id: string;
  sort_order: number;
}

export function useReorderActivities(workstreamId: string) {
  const qc = useQueryClient();
  const qk = queryKeys.activities.byWorkstream(workstreamId);

  return useMutation({
    mutationFn: (updates: ActivitySortUpdate[]) => batchUpdateActivitySortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Activity[]>(qk);
      if (prev) {
        const updateMap = new Map(updates.map(u => [u.id, u]));
        qc.setQueryData(
          qk,
          prev.map(a => {
            const upd = updateMap.get(a.id);
            if (!upd) return a;
            return {
              ...a,
              sort_order: upd.sort_order,
              ...(upd.activity_group_id !== undefined
                ? { activity_group_id: upd.activity_group_id }
                : {}),
            };
          }),
        );
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(qk, context.prev);
      }
      toast.error(`Reorder failed: ${e.message}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk });
    },
  });
}

export function useReorderTasks(activityId: string) {
  const qc = useQueryClient();
  const qk = queryKeys.tasks.byActivity(activityId);

  return useMutation({
    mutationFn: (updates: SortUpdate[]) => batchUpdateTaskSortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Task[]>(qk);
      if (prev) {
        const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
        qc.setQueryData(
          qk,
          prev.map(t => {
            const newOrder = updateMap.get(t.id);
            return newOrder !== undefined ? { ...t, sort_order: newOrder } : t;
          }),
        );
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(qk, context.prev);
      }
      toast.error(`Reorder failed: ${e.message}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk });
    },
  });
}

export function useReorderActivityGroups(workstreamId: string) {
  const qc = useQueryClient();
  const qk = queryKeys.activityGroups.byWorkstream(workstreamId);

  return useMutation({
    mutationFn: (updates: SortUpdate[]) => batchUpdateActivityGroupSortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<ActivityGroup[]>(qk);
      if (prev) {
        const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
        qc.setQueryData(
          qk,
          prev.map(g => {
            const newOrder = updateMap.get(g.id);
            return newOrder !== undefined ? { ...g, sort_order: newOrder } : g;
          }),
        );
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(qk, context.prev);
      }
      toast.error(`Reorder failed: ${e.message}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk });
    },
  });
}

interface TrackerSortUpdate extends SortUpdate {
  group_id?: string | null;
}

export function useReorderTrackers() {
  const qc = useQueryClient();
  const qk = queryKeys.trackers.all();

  return useMutation({
    mutationFn: (updates: TrackerSortUpdate[]) => batchUpdateTrackerSortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Tracker[]>(qk);
      if (prev) {
        const updateMap = new Map(updates.map(u => [u.id, u]));
        qc.setQueryData(
          qk,
          prev.map(t => {
            const upd = updateMap.get(t.id);
            if (!upd) return t;
            return {
              ...t,
              sort_order: upd.sort_order,
              ...(upd.group_id !== undefined ? { group_id: upd.group_id } : {}),
            };
          }),
        );
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(qk, context.prev);
      }
      toast.error(`Reorder failed: ${e.message}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk });
    },
  });
}

export function useReorderTrackerGroups() {
  const qc = useQueryClient();
  const qk = queryKeys.trackerGroups.all();

  return useMutation({
    mutationFn: (updates: SortUpdate[]) => batchUpdateTrackerGroupSortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<TrackerGroup[]>(qk);
      if (prev) {
        const updateMap = new Map(updates.map(u => [u.id, u.sort_order]));
        qc.setQueryData(
          qk,
          prev.map(g => {
            const newOrder = updateMap.get(g.id);
            return newOrder !== undefined ? { ...g, sort_order: newOrder } : g;
          }),
        );
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(qk, context.prev);
      }
      toast.error(`Reorder failed: ${e.message}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk });
    },
  });
}
