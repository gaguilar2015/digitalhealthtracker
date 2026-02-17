import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { trackersApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { CreateTracker, UpdateTracker } from '@/types';
import { useMemo } from 'react';

export function useTrackers() {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();
  const keys = useMemo(() => [queryKeys.trackers.all()], []);
  useRealtimeSubscription('trackers', keys);

  const query = useQuery({
    queryKey: queryKeys.trackers.all(),
    queryFn: trackersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTracker) => trackersApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers.all() });
      logEvent({ event_type: 'create', entity_type: 'tracker', entity_id: data.id });
      toast.success('Tracker created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTracker }) => trackersApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers.all() });
      logEvent({ event_type: 'update', entity_type: 'tracker', entity_id: id });
      toast.success('Tracker updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trackersApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers.all() });
      logEvent({ event_type: 'delete', entity_type: 'tracker', entity_id: id });
      toast.success('Tracker deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    trackers: query.data ?? [],
    isLoading: query.isLoading,
    createTracker: createMutation.mutateAsync,
    updateTracker: updateMutation.mutateAsync,
    deleteTracker: deleteMutation.mutateAsync,
  };
}
