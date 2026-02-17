import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { trackerGroupMembersApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateTrackerGroupMember } from '@/types';
import { useMemo } from 'react';

export function useTrackerGroupMembers(groupId: string | undefined) {
  const qc = useQueryClient();

  const realtimeKeys = useMemo(
    () => [queryKeys.trackerGroupMembers.byGroup(groupId ?? '')],
    [groupId],
  );
  useRealtimeSubscription('tracker_group_members', realtimeKeys);

  const query = useQuery({
    queryKey: queryKeys.trackerGroupMembers.byGroup(groupId ?? ''),
    queryFn: () => trackerGroupMembersApi.getByGroup(groupId!),
    enabled: !!groupId,
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateTrackerGroupMember) => trackerGroupMembersApi.add(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerGroupMembers.byGroup(groupId ?? '') });
      toast.success('Member added to group');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => trackerGroupMembersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerGroupMembers.byGroup(groupId ?? '') });
      toast.success('Member removed from group');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    groupMembers: query.data ?? [],
    isLoading: query.isLoading,
    addGroupMember: addMutation.mutateAsync,
    removeGroupMember: removeMutation.mutateAsync,
  };
}
