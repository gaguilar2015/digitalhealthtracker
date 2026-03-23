import { useMemo } from 'react';
import { UserCheck, Users, ClipboardList, Package } from 'lucide-react';
import { useAllActivities } from '@/hooks/useActivities';
import { useAllDeliverables } from '@/hooks/useDeliverables';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useTeamVisibility } from '@/hooks/useTeamVisibility';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { WorkstreamBadge, EmptyState, SkeletonLoader } from '@/components/shared';
import { getStatusColor, getStatusLabel } from '@/lib/utils';
import { getWorkstreamColorHex } from '@/lib/utils/colors';
import type { Activity, Deliverable, Workstream } from '@/types';
import { clsx } from 'clsx';

interface MyWorkViewProps {
  mode: 'my-work' | 'my-team';
}

export function MyWorkView({ mode }: MyWorkViewProps) {
  const { activities, isLoading: activitiesLoading } = useAllActivities();
  const { deliverables, isLoading: deliverablesLoading } = useAllDeliverables();
  const { workstreams } = useWorkstreams();
  const { filterItems } = useTeamVisibility();
  const { members } = useTeamMembers();

  const filteredActivities = useMemo(
    () => filterItems(activities, workstreams),
    [activities, workstreams, filterItems],
  );

  const filteredDeliverables = useMemo(
    () => filterItems(deliverables, workstreams),
    [deliverables, workstreams, filterItems],
  );

  // Group by workstream
  const groupedByWorkstream = useMemo(() => {
    const wsMap = new Map<string, { workstream: Workstream; activities: Activity[]; deliverables: Deliverable[] }>();
    for (const a of filteredActivities) {
      if (!wsMap.has(a.workstream_id)) {
        const ws = workstreams.find(w => w.id === a.workstream_id);
        if (ws) wsMap.set(a.workstream_id, { workstream: ws, activities: [], deliverables: [] });
      }
      wsMap.get(a.workstream_id)?.activities.push(a);
    }
    for (const d of filteredDeliverables) {
      if (!wsMap.has(d.workstream_id)) {
        const ws = workstreams.find(w => w.id === d.workstream_id);
        if (ws) wsMap.set(d.workstream_id, { workstream: ws, activities: [], deliverables: [] });
      }
      wsMap.get(d.workstream_id)?.deliverables.push(d);
    }
    return Array.from(wsMap.values()).sort((a, b) => a.workstream.sort_order - b.workstream.sort_order);
  }, [filteredActivities, filteredDeliverables, workstreams]);

  const isLoading = activitiesLoading || deliverablesLoading;

  if (isLoading) {
    return <SkeletonLoader variant="card" count={4} />;
  }

  const Icon = mode === 'my-work' ? UserCheck : Users;
  const title = mode === 'my-work' ? 'My Work' : "My Team's Work";
  const totalItems = filteredActivities.length + filteredDeliverables.length;

  if (totalItems === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <EmptyState
          icon={<ClipboardList className="w-12 h-12" />}
          message={mode === 'my-work'
            ? 'No items assigned to you.'
            : 'No items assigned to you or your team members.'}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <span className="text-xs text-gray-400 bg-surface-100 px-2 py-0.5 rounded-full">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="space-y-6">
        {groupedByWorkstream.map(({ workstream: ws, activities: wsActivities, deliverables: wsDeliverables }) => (
          <div key={ws.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden">
            {/* Workstream header */}
            <div
              className="flex items-center gap-3 px-4 py-3 bg-surface-50"
              style={{ borderLeft: `4px solid ${getWorkstreamColorHex(ws.color)}` }}
            >
              <WorkstreamBadge code={ws.code} color={ws.color} />
              <span className="text-sm font-semibold text-gray-900">{ws.short_name}</span>
              <span className="text-xs text-gray-400">
                {wsActivities.length + wsDeliverables.length} items
              </span>
            </div>

            <div className="divide-y divide-surface-200">
              {/* Activities */}
              {wsActivities.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-surface-50/50 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Activities ({wsActivities.length})
                    </span>
                  </div>
                  {wsActivities.map(a => {
                    const assignee = a.assigned_to ? members.find(m => m.id === a.assigned_to) : null;
                    return (
                      <div key={a.id} className="px-4 py-3 hover:bg-surface-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getStatusColor(a.status) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400">{a.code}</span>
                              <span className="text-sm text-gray-900 truncate">{a.name}</span>
                            </div>
                          </div>
                          {mode === 'my-team' && assignee && (
                            <span className="text-xs text-gray-400 truncate max-w-[120px]">
                              {assignee.full_name}
                            </span>
                          )}
                          <span className={clsx(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            a.status === 'complete' ? 'bg-green-100 text-green-700' :
                            a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            a.status === 'delayed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          )}>
                            {getStatusLabel(a.status)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Deliverables */}
              {wsDeliverables.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-surface-50/50 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Deliverables ({wsDeliverables.length})
                    </span>
                  </div>
                  {wsDeliverables.map(d => {
                    const assignee = d.assigned_to ? members.find(m => m.id === d.assigned_to) : null;
                    return (
                      <div key={d.id} className="px-4 py-3 hover:bg-surface-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getStatusColor(d.status) }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-900 truncate">{d.name}</span>
                          </div>
                          {mode === 'my-team' && assignee && (
                            <span className="text-xs text-gray-400 truncate max-w-[120px]">
                              {assignee.full_name}
                            </span>
                          )}
                          <span className={clsx(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            d.status === 'complete' ? 'bg-green-100 text-green-700' :
                            d.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            d.status === 'delayed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          )}>
                            {getStatusLabel(d.status)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
