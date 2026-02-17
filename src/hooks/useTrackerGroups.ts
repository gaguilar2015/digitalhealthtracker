import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { trackerGroupsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateTrackerGroup, UpdateTrackerGroup } from '@/types';
import { useMemo } from 'react';

export function useTrackerGroups() {
  const qc = useQueryClient();
  const keys = useMemo(() => [queryKeys.trackerGroups.all()], []);
  useRealtimeSubscription('tracker_groups', keys);

  const query = useQuery({
    queryKey: queryKeys.trackerGroups.all(),
    queryFn: trackerGroupsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTrackerGroup) => trackerGroupsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerGroups.all() });
      toast.success('Group created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTrackerGroup }) => trackerGroupsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerGroups.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trackerGroupsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerGroups.all() });
      // ON DELETE SET NULL modifies tracker rows, so refresh them too
      qc.invalidateQueries({ queryKey: queryKeys.trackers.all() });
      toast.success('Group deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    createGroup: createMutation.mutateAsync,
    updateGroup: updateMutation.mutateAsync,
    deleteGroup: deleteMutation.mutateAsync,
  };
}
