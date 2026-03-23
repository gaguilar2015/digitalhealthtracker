import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { getVisibleUserIds, hasSubordinates as checkHasSubordinates } from '@/lib/utils/hierarchy';
import type { VisibilityMode } from '@/types/enums';
import type { Workstream } from '@/types';

interface TeamVisibilityContextValue {
  mode: VisibilityMode;
  setMode: (mode: VisibilityMode) => void;
  visibleUserIds: Set<string> | null;
  isReady: boolean;
  hasSubordinates: boolean;
  filterItems: <T extends { assigned_to?: string | null; workstream_id?: string }>(
    items: T[],
    workstreams?: Workstream[],
  ) => T[];
}

const TeamVisibilityContext = createContext<TeamVisibilityContextValue | null>(null);

export function TeamVisibilityProvider({ children }: { children: ReactNode }) {
  const { teamMember, isAdmin } = useAuth();
  const { members, isLoading } = useTeamMembers();

  const [mode, setMode] = useState<VisibilityMode>(isAdmin ? 'all' : 'my-team');

  const userId = teamMember?.id ?? '';

  const hasSubs = useMemo(
    () => (userId ? checkHasSubordinates(userId, members) : false),
    [userId, members],
  );

  const visibleUserIds = useMemo(
    () => (userId ? getVisibleUserIds(userId, members, mode) : null),
    [userId, members, mode],
  );

  const filterItems = useCallback(
    <T extends { assigned_to?: string | null; workstream_id?: string }>(
      items: T[],
      workstreams?: Workstream[],
    ): T[] => {
      if (visibleUserIds === null) return items;

      const ownedWorkstreamIds = new Set(
        (workstreams ?? []).filter(ws => ws.owner_id === userId).map(ws => ws.id),
      );

      return items.filter(item => {
        const assignee = item.assigned_to;
        if (assignee && visibleUserIds.has(assignee)) return true;
        if (!assignee && item.workstream_id && ownedWorkstreamIds.has(item.workstream_id)) return true;
        return false;
      });
    },
    [visibleUserIds, userId],
  );

  const value = useMemo<TeamVisibilityContextValue>(
    () => ({
      mode,
      setMode,
      visibleUserIds,
      isReady: !isLoading && !!userId,
      hasSubordinates: hasSubs,
      filterItems,
    }),
    [mode, visibleUserIds, isLoading, userId, hasSubs, filterItems],
  );

  return (
    <TeamVisibilityContext.Provider value={value}>
      {children}
    </TeamVisibilityContext.Provider>
  );
}

export function useTeamVisibilityContext() {
  const ctx = useContext(TeamVisibilityContext);
  if (!ctx) throw new Error('useTeamVisibilityContext must be used within TeamVisibilityProvider');
  return ctx;
}
