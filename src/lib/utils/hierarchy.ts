import type { TeamMember } from '@/types';
import type { VisibilityMode } from '@/types/enums';

/** Returns IDs of direct reports for a given user */
export function getDirectReportIds(userId: string, members: TeamMember[]): string[] {
  return members.filter(m => m.supervisor_id === userId).map(m => m.id);
}

/** Returns all subordinate IDs (direct + indirect) via BFS. Handles cycles. */
export function getAllSubordinateIds(userId: string, members: TeamMember[]): Set<string> {
  const result = new Set<string>();
  const queue = getDirectReportIds(userId, members);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const m of members) {
      if (m.supervisor_id === id && !result.has(m.id)) {
        queue.push(m.id);
      }
    }
  }

  return result;
}

/** Returns whether a user has any direct reports */
export function hasSubordinates(userId: string, members: TeamMember[]): boolean {
  return members.some(m => m.supervisor_id === userId);
}

/**
 * Returns the chain of supervisor IDs from userId up to the root.
 * Used for cycle prevention in admin UI dropdowns.
 */
export function getSupervisorChain(userId: string, members: TeamMember[]): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  const byId = new Map(members.map(m => [m.id, m]));

  let current = byId.get(userId);
  while (current?.supervisor_id && !visited.has(current.supervisor_id)) {
    chain.push(current.supervisor_id);
    visited.add(current.supervisor_id);
    current = byId.get(current.supervisor_id);
  }

  return chain;
}

/**
 * Returns the set of user IDs whose items should be visible.
 * null means "no filter" (show everything).
 */
export function getVisibleUserIds(
  userId: string,
  members: TeamMember[],
  mode: VisibilityMode,
): Set<string> | null {
  if (mode === 'all') return null;

  if (mode === 'my-work') {
    return new Set([userId]);
  }

  // 'my-team': self + all subordinates
  const subordinates = getAllSubordinateIds(userId, members);
  subordinates.add(userId);
  return subordinates;
}
