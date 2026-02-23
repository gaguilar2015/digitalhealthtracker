import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  batchUpdateActivitySortOrder,
  batchUpdateTaskSortOrder,
  batchUpdateActivityGroupSortOrder,
  batchUpdateSheetSortOrder,
  batchUpdateSheetGroupSortOrder,
  batchUpdateDiagramSortOrder,
  batchUpdateDiagramGroupSortOrder,
} from '@/lib/utils/reorder';
import { toast } from 'sonner';
import type { Activity, Task, ActivityGroup, Sheet, SheetGroup, Diagram, DiagramGroup } from '@/types';

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

interface SheetSortUpdate extends SortUpdate {
  group_id?: string | null;
}

export function useReorderSheets() {
  const qc = useQueryClient();
  const qk = queryKeys.sheets.all();

  return useMutation({
    mutationFn: (updates: SheetSortUpdate[]) => batchUpdateSheetSortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Sheet[]>(qk);
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

export function useReorderSheetGroups() {
  const qc = useQueryClient();
  const qk = queryKeys.sheetGroups.all();

  return useMutation({
    mutationFn: (updates: SortUpdate[]) => batchUpdateSheetGroupSortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<SheetGroup[]>(qk);
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

interface DiagramSortUpdate extends SortUpdate {
  group_id?: string | null;
}

export function useReorderDiagrams() {
  const qc = useQueryClient();
  const qk = queryKeys.diagrams.all();

  return useMutation({
    mutationFn: (updates: DiagramSortUpdate[]) => batchUpdateDiagramSortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Diagram[]>(qk);
      if (prev) {
        const updateMap = new Map(updates.map(u => [u.id, u]));
        qc.setQueryData(
          qk,
          prev.map(d => {
            const upd = updateMap.get(d.id);
            if (!upd) return d;
            return {
              ...d,
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

export function useReorderDiagramGroups() {
  const qc = useQueryClient();
  const qk = queryKeys.diagramGroups.all();

  return useMutation({
    mutationFn: (updates: SortUpdate[]) => batchUpdateDiagramGroupSortOrder(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<DiagramGroup[]>(qk);
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
