import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { diagramGroupMembersApi } from '@/lib/api';
import { useAuth } from './useAuth';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Returns the set of diagram_group IDs that the current user is a member of.
 *
 * Mirrors useMySheetGroupIds — used by the Diagrams sidebar to decide whether
 * an empty category header should remain visible for the current user.
 */
export function useMyDiagramGroupIds(): Set<string> {
  const { teamMember } = useAuth();
  const userId = teamMember?.id ?? null;

  const realtimeKeys = useMemo(
    () => (userId ? [queryKeys.diagramGroupMembers.mine(userId)] : []),
    [userId],
  );
  useRealtimeSubscription('diagram_group_members', realtimeKeys);

  const query = useQuery({
    queryKey: queryKeys.diagramGroupMembers.mine(userId ?? ''),
    queryFn: () => diagramGroupMembersApi.getMyGroupIds(userId!),
    enabled: !!userId,
  });

  return useMemo(() => new Set(query.data ?? []), [query.data]);
}
