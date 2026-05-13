import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { sheetGroupMembersApi } from '@/lib/api';
import { useAuth } from './useAuth';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Returns the set of sheet_group IDs that the current user is a member of.
 *
 * Used by the Sheets sidebar to decide whether to surface an empty category
 * header: a user who is a member of an empty group should still see it so
 * they can drop a sheet into it. Non-members of the same empty group should
 * not see the header.
 *
 * Admins use { isAdmin: true } from useAuth() to short-circuit and always
 * see every group regardless of this set.
 */
export function useMySheetGroupIds(): Set<string> {
  const { teamMember } = useAuth();
  const userId = teamMember?.id ?? null;

  // Keep this list fresh when admins add/remove the user from groups.
  const realtimeKeys = useMemo(
    () => (userId ? [queryKeys.sheetGroupMembers.mine(userId)] : []),
    [userId],
  );
  useRealtimeSubscription('sheet_group_members', realtimeKeys);

  const query = useQuery({
    queryKey: queryKeys.sheetGroupMembers.mine(userId ?? ''),
    queryFn: () => sheetGroupMembersApi.getMyGroupIds(userId!),
    enabled: !!userId,
  });

  return useMemo(() => new Set(query.data ?? []), [query.data]);
}
