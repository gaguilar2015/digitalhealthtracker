import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { workstreamMembersApi } from '@/lib/api';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

/**
 * Central hook for workstream access control.
 * Returns { ids, isReady }:
 *   ids = null  → admin, no filter needed (all access)
 *   ids = string[] → filter to these workstream IDs
 *   isReady = false → still loading, queries should be disabled
 */
export function useAccessibleWorkstreamIds() {
  const { teamMember, isAdmin } = useAuth();
  const qc = useQueryClient();
  const userId = teamMember?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.workstreamMembers.mine(userId ?? ''),
    queryFn: () => workstreamMembersApi.getMyWorkstreamIds(userId!),
    enabled: !!userId && !isAdmin,
  });

  // Realtime subscription: invalidate on workstream_members changes
  const keysToInvalidate = useMemo(() => {
    if (!userId) return [];
    return [
      queryKeys.workstreamMembers.mine(userId),
      queryKeys.workstreams.all(),
      queryKeys.activities.all(),
      queryKeys.deliverables.all(),
      queryKeys.tasks.all(),
      queryKeys.dashboard.all(),
    ];
  }, [userId]);

  useEffect(() => {
    if (!userId || isAdmin) return;

    const channel = supabase
      .channel('realtime-workstream-members-access')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workstream_members' }, () => {
        keysToInvalidate.forEach(key => {
          qc.invalidateQueries({ queryKey: key });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin, keysToInvalidate, qc]);

  if (isAdmin) {
    return { ids: null, isReady: true } as const;
  }

  if (!userId) {
    return { ids: [] as string[], isReady: false } as const;
  }

  return {
    ids: query.data ?? ([] as string[]),
    isReady: !query.isLoading,
  } as const;
}
