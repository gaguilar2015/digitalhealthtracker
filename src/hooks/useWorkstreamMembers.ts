import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { workstreamMembersApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateWorkstreamMember } from '@/types';
import { useMemo } from 'react';

export function useWorkstreamMembers(workstreamId: string | undefined) {
  const qc = useQueryClient();

  const realtimeKeys = useMemo(
    () => [queryKeys.workstreamMembers.byWorkstream(workstreamId ?? '')],
    [workstreamId],
  );
  useRealtimeSubscription('workstream_members', realtimeKeys);

  const query = useQuery({
    queryKey: queryKeys.workstreamMembers.byWorkstream(workstreamId ?? ''),
    queryFn: () => workstreamMembersApi.getByWorkstream(workstreamId!),
    enabled: !!workstreamId,
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateWorkstreamMember) => workstreamMembersApi.add(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workstreamMembers.byWorkstream(workstreamId ?? '') });
      toast.success('Member added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => workstreamMembersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workstreamMembers.byWorkstream(workstreamId ?? '') });
      toast.success('Member removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    addMember: addMutation.mutateAsync,
    removeMember: removeMutation.mutateAsync,
  };
}
