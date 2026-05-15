import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { workstreamMembersApi } from '@/lib/api';
import { useAuth } from './useAuth';
import { useTeamMembers } from './useTeamMembers';
import { supabase } from '@/lib/supabase';
import { getAllSubordinateIds } from '@/lib/utils/hierarchy';

/**
 * Central hook for workstream access control.
 *
 * A user's accessible workstreams are the union of:
 *   - workstreams they're a member of (via `workstream_members`), and
 *   - workstreams every transitive subordinate (down the `supervisor_id`
 *     chain) is a member of.
 *
 * This guarantees supervisors automatically see the workplan for everyone
 * they supervise, recursively. Admins bypass the filter entirely.
 *
 * Returns { ids, isReady }:
 *   ids = null     → admin, no filter needed (full access)
 *   ids = string[] → filter to these workstream IDs
 *   isReady = false → still loading, downstream queries should stay disabled
 */
export function useAccessibleWorkstreamIds() {
  const { teamMember, isAdmin } = useAuth();
  const { members } = useTeamMembers();
  const qc = useQueryClient();
  const userId = teamMember?.id ?? null;

  // Self + every transitive subordinate. The sorted list is part of the
  // query key so changes to the hierarchy invalidate the cache naturally.
  const visibleUserIds = useMemo(() => {
    if (!userId) return [] as string[];
    const subs = getAllSubordinateIds(userId, members);
    return [userId, ...Array.from(subs)].sort();
  }, [userId, members]);

  const query = useQuery({
    queryKey: queryKeys.workstreamMembers.accessible(userId ?? '', visibleUserIds),
    queryFn: () => workstreamMembersApi.getAccessibleWorkstreamIds(visibleUserIds),
    enabled: !!userId && !isAdmin && visibleUserIds.length > 0,
  });

  const keysToInvalidate = useMemo(() => {
    if (!userId) return [];
    return [
      ['workstreamMembers'] as const,
      queryKeys.workstreams.all(),
      queryKeys.activities.all(),
      queryKeys.deliverables.all(),
      queryKeys.tasks.all(),
      queryKeys.dashboard.all(),
    ];
  }, [userId]);

  useEffect(() => {
    if (!userId || isAdmin) return;

    // workstream_members: someone got added to / removed from a workstream.
    const wmChannel = supabase
      .channel('realtime-workstream-members-access')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workstream_members' }, () => {
        keysToInvalidate.forEach(key => {
          qc.invalidateQueries({ queryKey: key });
        });
      })
      .subscribe();

    // team_members: a supervisor link changed, which may add/remove
    // transitive subordinates and therefore the accessible workstream set.
    // Invalidating the teamMembers cache here causes useTeamMembers to
    // refetch, which recomputes visibleUserIds, which (via the queryKey)
    // triggers a refetch of the accessible-workstreams query.
    const tmChannel = supabase
      .channel('realtime-team-members-access')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.teamMembers.all() });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(wmChannel);
      supabase.removeChannel(tmChannel);
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
