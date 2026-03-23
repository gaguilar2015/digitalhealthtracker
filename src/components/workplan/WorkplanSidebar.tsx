import { useState, useMemo } from 'react';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useAllActivities } from '@/hooks/useActivities';
import { useAllTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { usePermissions } from '@/hooks/usePermissions';
import { ProgressBar, SkeletonLoader } from '@/components/shared';
import { getWorkstreamColorHex } from '@/lib/utils/colors';
import { calculateDeepProgress } from '@/lib/utils';
import { LayoutGrid, UserCheck, Users, Plus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTeamVisibility } from '@/hooks/useTeamVisibility';
import { clsx } from 'clsx';
import { WorkstreamDialog } from './WorkstreamDialog';

interface WorkplanSidebarProps {
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function WorkplanSidebar({ selectedCode, onSelect, collapsed, onToggleCollapse }: WorkplanSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const { workstreams, isLoading } = useWorkstreams();
  const { activities } = useAllActivities();
  const { tasks: allTasks } = useAllTasks();
  const { members } = useTeamMembers();
  const { canEditItem } = usePermissions();
  const { hasSubordinates: hasSubs, filterItems, mode: visibilityMode } = useTeamVisibility();
  const isFiltering = visibilityMode !== 'all';

  // When a visibility filter is active, only show workstreams that have relevant items
  const visibleWorkstreams = useMemo(() => {
    if (!isFiltering) return workstreams;
    const filtered = filterItems(activities, workstreams);
    const wsIdsWithItems = new Set(filtered.map(a => a.workstream_id));
    return workstreams.filter(ws => wsIdsWithItems.has(ws.id));
  }, [workstreams, activities, filterItems, isFiltering]);

  const ownerGroups = useMemo(() => {
    const groups = new Map<string | null, typeof visibleWorkstreams>();
    for (const ws of [...visibleWorkstreams].sort((a, b) => a.sort_order - b.sort_order)) {
      const key = ws.owner_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ws);
    }
    return Array.from(groups.entries()).sort(
      (a, b) => a[1][0].sort_order - b[1][0].sort_order
    );
  }, [visibleWorkstreams]);

  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonLoader variant="line" count={collapsed ? 3 : 6} />
      </div>
    );
  }

  // Collapsed view
  if (collapsed) {
    return (
      <nav className="py-2 flex flex-col items-center">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors mb-2"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelect('__my-work__')}
          className={clsx(
            'p-2 rounded-lg transition-colors mb-1',
            selectedCode === '__my-work__'
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
          )}
          title="My Work"
        >
          <UserCheck className="w-4 h-4" />
        </button>

        {hasSubs && (
          <button
            onClick={() => onSelect('__my-team__')}
            className={clsx(
              'p-2 rounded-lg transition-colors mb-1',
              selectedCode === '__my-team__'
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
            )}
            title="My Team"
          >
            <Users className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => onSelect(null)}
          className={clsx(
            'p-2 rounded-lg transition-colors mb-1',
            selectedCode === null
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
          )}
          title="All Workstreams"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {canEditItem && (
          <button
            onClick={() => setCreateOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors mb-2"
            title="Add workstream"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        <div className="w-6 border-t border-surface-200 mb-2" />

        {ownerGroups.map(([ownerId, groupWorkstreams], groupIdx) => (
          <div key={ownerId ?? 'unassigned'}>
            {groupIdx > 0 && <div className="w-6 border-t border-surface-200 my-1.5 mx-auto" />}
            {groupWorkstreams.map(ws => {
              const isSelected = selectedCode === ws.code;
              return (
                <button
                  key={ws.id}
                  onClick={() => onSelect(ws.code)}
                  className={clsx(
                    'w-8 h-8 rounded-lg transition-colors mb-0.5 flex items-center justify-center',
                    isSelected
                      ? 'bg-primary-50'
                      : 'hover:bg-surface-100',
                  )}
                  title={`${ws.code} - ${ws.short_name}`}
                >
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: getWorkstreamColorHex(ws.color) }}
                  />
                </button>
              );
            })}
          </div>
        ))}

        <WorkstreamDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      </nav>
    );
  }

  // Expanded view
  return (
    <nav className="py-2">
      <div className="px-4 py-1.5">
        <button
          onClick={() => onSelect('__my-work__')}
          className={clsx(
            'flex items-center gap-2 text-sm transition-colors w-full',
            selectedCode === '__my-work__'
              ? 'text-primary-700 font-medium'
              : 'text-gray-700 hover:text-gray-900',
          )}
        >
          <UserCheck className="w-4 h-4" />
          My Work
        </button>
      </div>

      {hasSubs && (
        <div className="px-4 py-1.5">
          <button
            onClick={() => onSelect('__my-team__')}
            className={clsx(
              'flex items-center gap-2 text-sm transition-colors w-full',
              selectedCode === '__my-team__'
                ? 'text-primary-700 font-medium'
                : 'text-gray-700 hover:text-gray-900',
            )}
          >
            <Users className="w-4 h-4" />
            My Team
          </button>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-1.5">
        <button
          onClick={() => onSelect(null)}
          className={clsx(
            'flex items-center gap-2 text-sm transition-colors',
            selectedCode === null
              ? 'text-primary-700 font-medium'
              : 'text-gray-700 hover:text-gray-900',
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          All Workstreams
        </button>
        <div className="flex items-center gap-0.5">
          {canEditItem && (
            <button
              onClick={() => setCreateOpen(true)}
              className="p-1 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Add workstream"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-1">
        {ownerGroups.map(([ownerId, groupWorkstreams]) => {
          const owner = ownerId ? members.find(m => m.id === ownerId) : null;
          const label = owner?.title || owner?.full_name || 'Unassigned';
          return (
            <div key={ownerId ?? 'unassigned'}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  {label}
                </span>
              </div>
              {groupWorkstreams.map(ws => {
                const wsActivities = isFiltering
                  ? filterItems(activities.filter(a => a.workstream_id === ws.id), workstreams)
                  : activities.filter(a => a.workstream_id === ws.id);
                const wsActivityIds = new Set(wsActivities.map(a => a.id));
                const wsTasks = allTasks.filter(t => wsActivityIds.has(t.activity_id));
                const progress = calculateDeepProgress(wsActivities, wsTasks);
                const isSelected = selectedCode === ws.code;

                return (
                  <button
                    key={ws.id}
                    onClick={() => onSelect(ws.code)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-surface-100',
                    )}
                    style={{
                      borderLeft: `3px solid ${getWorkstreamColorHex(ws.color)}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{ws.code}</span>
                        <span className="text-sm truncate">{ws.short_name}</span>
                      </div>
                      <div className="mt-1">
                        <ProgressBar
                          value={progress}
                          color={getWorkstreamColorHex(ws.color)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <WorkstreamDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </nav>
  );
}
