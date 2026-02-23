import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { sheetGroupMembersApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateSheetGroupMember } from '@/types';
import { useMemo } from 'react';

export function useSheetGroupMembers(groupId: string | undefined) {
  const qc = useQueryClient();

  const realtimeKeys = useMemo(
    () => [queryKeys.sheetGroupMembers.byGroup(groupId ?? '')],
    [groupId],
  );
  useRealtimeSubscription('sheet_group_members', realtimeKeys);

  const query = useQuery({
    queryKey: queryKeys.sheetGroupMembers.byGroup(groupId ?? ''),
    queryFn: () => sheetGroupMembersApi.getByGroup(groupId!),
    enabled: !!groupId,
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateSheetGroupMember) => sheetGroupMembersApi.add(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetGroupMembers.byGroup(groupId ?? '') });
      toast.success('Member added to group');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => sheetGroupMembersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetGroupMembers.byGroup(groupId ?? '') });
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
