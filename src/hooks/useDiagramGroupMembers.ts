import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { diagramGroupMembersApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateDiagramGroupMember } from '@/types';
import { useMemo } from 'react';

export function useDiagramGroupMembers(groupId: string | undefined) {
  const qc = useQueryClient();

  const realtimeKeys = useMemo(
    () => [queryKeys.diagramGroupMembers.byGroup(groupId ?? '')],
    [groupId],
  );
  useRealtimeSubscription('diagram_group_members', realtimeKeys);

  const query = useQuery({
    queryKey: queryKeys.diagramGroupMembers.byGroup(groupId ?? ''),
    queryFn: () => diagramGroupMembersApi.getByGroup(groupId!),
    enabled: !!groupId,
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateDiagramGroupMember) => diagramGroupMembersApi.add(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagramGroupMembers.byGroup(groupId ?? '') });
      toast.success('Member added to group');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => diagramGroupMembersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagramGroupMembers.byGroup(groupId ?? '') });
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
