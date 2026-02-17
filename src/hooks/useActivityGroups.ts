import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { activityGroupsApi } from '@/lib/api';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { CreateActivityGroup, UpdateActivityGroup } from '@/types';

export function useAllActivityGroups() {
  const query = useQuery({
    queryKey: queryKeys.activityGroups.all(),
    queryFn: activityGroupsApi.getAll,
  });
  return {
    activityGroups: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useActivityGroups(workstreamId: string | undefined) {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();

  const query = useQuery({
    queryKey: queryKeys.activityGroups.byWorkstream(workstreamId ?? ''),
    queryFn: () => activityGroupsApi.getByWorkstream(workstreamId!),
    enabled: !!workstreamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateActivityGroup) => activityGroupsApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.activityGroups.byWorkstream(workstreamId ?? '') });
      logEvent({ event_type: 'create', entity_type: 'activity_group', entity_id: data.id });
      toast.success('Activity group created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityGroup }) => activityGroupsApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.activityGroups.byWorkstream(workstreamId ?? '') });
      logEvent({ event_type: 'update', entity_type: 'activity_group', entity_id: id });
      toast.success('Activity group updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activityGroupsApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.activityGroups.byWorkstream(workstreamId ?? '') });
      logEvent({ event_type: 'delete', entity_type: 'activity_group', entity_id: id });
      toast.success('Activity group deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    activityGroups: query.data ?? [],
    isLoading: query.isLoading,
    createActivityGroup: createMutation.mutateAsync,
    updateActivityGroup: updateMutation.mutateAsync,
    deleteActivityGroup: deleteMutation.mutateAsync,
  };
}
