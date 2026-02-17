import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { tasksApi, activitiesApi } from '@/lib/api';
import { useAccessibleWorkstreamIds } from './useAccessibleWorkstreamIds';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { Task, CreateTask, UpdateTask } from '@/types';
import { useMemo } from 'react';

export function useTasks(activityId: string | undefined) {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();

  const query = useQuery({
    queryKey: queryKeys.tasks.byActivity(activityId ?? ''),
    queryFn: () => tasksApi.getByActivity(activityId!),
    enabled: !!activityId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTask) => tasksApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.byActivity(activityId ?? '') });
      logEvent({ event_type: 'create', entity_type: 'task', entity_id: data.id });
      toast.success('Task created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTask }) => tasksApi.update(id, data),
    onMutate: async ({ id, data }) => {
      const qk = queryKeys.tasks.byActivity(activityId ?? '');
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Task[]>(qk);
      if (prev) {
        qc.setQueryData(qk, prev.map(t => t.id === id ? { ...t, ...data } : t));
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.tasks.byActivity(activityId ?? ''), context.prev);
      }
      toast.error(e.message);
    },
    onSuccess: (_data, { id }) => {
      logEvent({ event_type: 'update', entity_type: 'task', entity_id: id });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.byActivity(activityId ?? '') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.byActivity(activityId ?? '') });
      logEvent({ event_type: 'delete', entity_type: 'task', entity_id: id });
      toast.success('Task deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
  };
}

export function useAllTasks() {
  const { ids, isReady } = useAccessibleWorkstreamIds();

  const queryKey = useMemo(
    () => [...queryKeys.tasks.all(), ids] as const,
    [ids],
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const allTasks = await tasksApi.getAll();
      // Admin: no filtering needed
      if (ids === null) return allTasks;
      // Non-admin: filter tasks to those belonging to accessible workstreams
      const activities = await activitiesApi.getAll(ids);
      const accessibleActivityIds = new Set(activities.map(a => a.id));
      return allTasks.filter(t => accessibleActivityIds.has(t.activity_id));
    },
    enabled: isReady,
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading || !isReady,
  };
}
