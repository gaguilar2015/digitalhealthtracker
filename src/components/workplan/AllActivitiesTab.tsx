import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react';
import { useAllActivities } from '@/hooks/useActivities';
import { useAllActivityGroups } from '@/hooks/useActivityGroups';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { groupAndSortActivities, CATEGORY_CONFIGS } from '@/lib/utils';
import { WorkstreamBadge, SearchInput, SkeletonLoader } from '@/components/shared';
import { ActivityRow } from './ActivityRow';
import { clsx } from 'clsx';
import type { ActivityCategory } from '@/lib/utils/activityCategories';

export function AllActivitiesTab() {
  const { activities, isLoading: activitiesLoading } = useAllActivities();
  const { activityGroups } = useAllActivityGroups();
  const { workstreams } = useWorkstreams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkstreamIds, setSelectedWorkstreamIds] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ActivityCategory>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [filterOpen]);

  const workstreamMap = useMemo(
    () => new Map(workstreams.map(ws => [ws.id, ws])),
    [workstreams],
  );

  const activityGroupMap = useMemo(
    () => new Map(activityGroups.map(ag => [ag.id, ag])),
    [activityGroups],
  );

  // Filter activities
  const filteredActivities = useMemo(() => {
    let result = activities;

    if (selectedWorkstreamIds.size > 0) {
      result = result.filter(a => selectedWorkstreamIds.has(a.workstream_id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
      );
    }

    return result;
  }, [activities, selectedWorkstreamIds, searchQuery]);

  const grouped = useMemo(() => groupAndSortActivities(filteredActivities), [filteredActivities]);

  const toggleCategory = (key: ActivityCategory) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleWorkstream = (wsId: string) => {
    setSelectedWorkstreamIds(prev => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
  };

  if (activitiesLoading) {
    return <SkeletonLoader variant="line" count={8} />;
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 max-w-xs">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search activities..."
          />
        </div>

        {/* Workstream filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-xl transition-colors',
              selectedWorkstreamIds.size > 0
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-surface-200 bg-white text-gray-600 hover:border-surface-300',
            )}
          >
            <Filter className="w-4 h-4" />
            Workstream
            {selectedWorkstreamIds.size > 0 && (
              <span className="ml-0.5 min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                {selectedWorkstreamIds.size}
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl border border-surface-200 shadow-lg z-20 py-1">
              {selectedWorkstreamIds.size > 0 && (
                <button
                  onClick={() => setSelectedWorkstreamIds(new Set())}
                  className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-gray-500 hover:bg-surface-50 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear filters
                </button>
              )}
              {workstreams
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(ws => (
                  <label
                    key={ws.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkstreamIds.has(ws.id)}
                      onChange={() => toggleWorkstream(ws.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <WorkstreamBadge code={ws.code} color={ws.color} />
                    <span className="text-sm text-gray-700 truncate">{ws.short_name}</span>
                  </label>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-4">
        {CATEGORY_CONFIGS.map(config => {
          const items = grouped.get(config.key) ?? [];
          if (items.length === 0) return null;

          const isCollapsed = collapsedCategories.has(config.key);

          return (
            <div key={config.key} className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(config.key)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.statusColor }}
                />
                <span className="text-sm font-semibold text-gray-900">{config.label}</span>
                <span className="min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-surface-100 text-gray-500">
                  {items.length}
                </span>
                <span className="ml-auto text-gray-400">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {/* Activity rows */}
              {!isCollapsed && (
                <div className="border-t border-surface-200">
                  {items.map(activity => {
                    const ws = workstreamMap.get(activity.workstream_id);
                    const ag = activity.activity_group_id
                      ? activityGroupMap.get(activity.activity_group_id)
                      : null;

                    return (
                      <ActivityRow
                        key={activity.id}
                        activity={activity}
                        workstreamId={activity.workstream_id}
                        workstream={ws}
                        activityGroupLabel={ag?.name ?? null}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredActivities.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {activities.length === 0
              ? 'No activities yet.'
              : 'No activities match the current filters.'}
          </div>
        )}
      </div>
    </div>
  );
}
