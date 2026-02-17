import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { deliverablesApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAccessibleWorkstreamIds } from './useAccessibleWorkstreamIds';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { Deliverable, CreateDeliverable, UpdateDeliverable } from '@/types';
import { useMemo } from 'react';

export function useDeliverables(workstreamId: string | undefined) {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();

  const query = useQuery({
    queryKey: queryKeys.deliverables.byWorkstream(workstreamId ?? ''),
    queryFn: () => deliverablesApi.getByWorkstream(workstreamId!),
    enabled: !!workstreamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDeliverable) => deliverablesApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.deliverables.byWorkstream(workstreamId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.deliverables.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      logEvent({ event_type: 'create', entity_type: 'deliverable', entity_id: data.id });
      toast.success('Deliverable created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeliverable }) => deliverablesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      const qk = queryKeys.deliverables.byWorkstream(workstreamId ?? '');
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<Deliverable[]>(qk);
      if (prev) {
        qc.setQueryData(qk, prev.map(d => d.id === id ? { ...d, ...data } : d));
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.deliverables.byWorkstream(workstreamId ?? ''), context.prev);
      }
      toast.error(e.message);
    },
    onSuccess: (_data, { id }) => {
      logEvent({ event_type: 'update', entity_type: 'deliverable', entity_id: id });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliverables.byWorkstream(workstreamId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.deliverables.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deliverablesApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.deliverables.byWorkstream(workstreamId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.deliverables.all() });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
      logEvent({ event_type: 'delete', entity_type: 'deliverable', entity_id: id });
      toast.success('Deliverable deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    deliverables: query.data ?? [],
    isLoading: query.isLoading,
    createDeliverable: createMutation.mutateAsync,
    updateDeliverable: updateMutation.mutateAsync,
    deleteDeliverable: deleteMutation.mutateAsync,
  };
}

export function useAllDeliverables() {
  const { ids, isReady } = useAccessibleWorkstreamIds();

  const queryKey = useMemo(
    () => [...queryKeys.deliverables.all(), ids] as const,
    [ids],
  );
  const keys = useMemo(() => [queryKeys.deliverables.all()], []);
  useRealtimeSubscription('deliverables', keys);

  const query = useQuery({
    queryKey,
    queryFn: () => deliverablesApi.getAll(ids ?? undefined),
    enabled: isReady,
  });

  return {
    deliverables: query.data ?? [],
    isLoading: query.isLoading || !isReady,
  };
}
