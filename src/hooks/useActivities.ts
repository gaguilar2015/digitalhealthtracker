import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { activitiesApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAccessibleWorkstreamIds } from './useAccessibleWorkstreamIds';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { Activity, CreateActivity, UpdateActivity } from '@/types';
import { useMemo } from 'react';

export function useActivities(workstreamId: string | undefined) {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();
  const keys = useMemo(
    () => [queryKeys.activities.byWorkstream(workstreamId ?? '')],
    [workstreamId],
  );
  useRealtimeSubscription('activities', keys);

  const query = useQuery({
    queryKey: queryKeys.activities.byWorkstream(workstreamId ?? ''),
    queryFn: () => activitiesApi.getByWorkstream(workstreamId!),
    enabled: !!workstreamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateActivity) => activitiesApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.byWorkstream(workstreamId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      logEvent({ event_type: 'create', entity_type: 'activity', entity_id: data.id });
      toast.success('Activity created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivity }) => activitiesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      const qk = queryKeys.activities.byWorkstream(workstreamId ?? '');
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Activity[]>(qk);
      if (prev) {
        qc.setQueryData(qk, prev.map(a => a.id === id ? { ...a, ...data } : a));
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.activities.byWorkstream(workstreamId ?? ''), context.prev);
      }
      toast.error(e.message);
    },
    onSuccess: (_data, { id }) => {
      logEvent({ event_type: 'update', entity_type: 'activity', entity_id: id });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.byWorkstream(workstreamId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activitiesApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.byWorkstream(workstreamId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      logEvent({ event_type: 'delete', entity_type: 'activity', entity_id: id });
      toast.success('Activity deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    activities: query.data ?? [],
    isLoading: query.isLoading,
    createActivity: createMutation.mutateAsync,
    updateActivity: updateMutation.mutateAsync,
    deleteActivity: deleteMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

export function useAllActivities() {
  const { ids, isReady } = useAccessibleWorkstreamIds();

  const queryKey = useMemo(
    () => [...queryKeys.activities.all(), ids] as const,
    [ids],
  );
  const keys = useMemo(() => [queryKeys.activities.all()], []);
  useRealtimeSubscription('activities', keys);

  const query = useQuery({
    queryKey,
    queryFn: () => activitiesApi.getAll(ids ?? undefined),
    enabled: isReady,
  });

  return {
    activities: query.data ?? [],
    isLoading: query.isLoading || !isReady,
  };
}
