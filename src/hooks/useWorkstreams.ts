import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { workstreamsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAccessibleWorkstreamIds } from './useAccessibleWorkstreamIds';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { CreateWorkstream, UpdateWorkstream } from '@/types';
import { useMemo } from 'react';

export function useWorkstreams() {
  const qc = useQueryClient();
  const { ids, isReady } = useAccessibleWorkstreamIds();
  const { logEvent } = useAuditLog();

  const queryKey = useMemo(
    () => [...queryKeys.workstreams.all(), ids] as const,
    [ids],
  );
  const keys = useMemo(() => [queryKeys.workstreams.all()], []);
  useRealtimeSubscription('workstreams', keys);

  const query = useQuery({
    queryKey,
    queryFn: () => workstreamsApi.getAll(ids ?? undefined),
    enabled: isReady,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkstream) => workstreamsApi.create(data),
    onSuccess: (data) => {
      // The auto-add trigger has just inserted into workstream_members. Force
      // the accessibility cache to refresh so the new ID enters the user's
      // accessible set before the workstreams refetch reads it back. Without
      // this, the workstreams list refetches against a stale accessibility
      // set and the just-created row briefly disappears until realtime fires.
      qc.invalidateQueries({ queryKey: ['workstreamMembers'] });
      qc.invalidateQueries({ queryKey: queryKeys.workstreams.all() });
      logEvent({ event_type: 'create', entity_type: 'workstream', entity_id: data.id });
      toast.success('Workstream created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkstream }) => workstreamsApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.workstreams.all() });
      logEvent({ event_type: 'update', entity_type: 'workstream', entity_id: id });
      toast.success('Workstream updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workstreamsApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.workstreams.all() });
      logEvent({ event_type: 'delete', entity_type: 'workstream', entity_id: id });
      toast.success('Workstream deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    workstreams: query.data ?? [],
    isLoading: query.isLoading || !isReady,
    error: query.error,
    createWorkstream: createMutation.mutateAsync,
    updateWorkstream: updateMutation.mutateAsync,
    deleteWorkstream: deleteMutation.mutateAsync,
  };
}
