import { useState } from 'react';
import { Plus, ClipboardList, LayoutGrid } from 'lucide-react';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useAllActivities } from '@/hooks/useActivities';
import { useAllTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar, ProgressBar, WorkstreamBadge, SkeletonLoader, EmptyState, PermissionGate } from '@/components/shared';
import { formatDateRange, calculateDeepProgress } from '@/lib/utils';
import { getWorkstreamColorHex } from '@/lib/utils/colors';
import { WorkstreamDialog } from './WorkstreamDialog';
import { AllActivitiesTab } from './AllActivitiesTab';
import { clsx } from 'clsx';

interface WorkplanAllWorkstreamsProps {
  onSelectWorkstream: (code: string) => void;
}

type AllWorkstreamsTab = 'overview' | 'activities';

export function WorkplanAllWorkstreams({ onSelectWorkstream }: WorkplanAllWorkstreamsProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AllWorkstreamsTab>('overview');
  const { workstreams, isLoading } = useWorkstreams();
  const { activities } = useAllActivities();
  const { tasks: allTasks } = useAllTasks();
  const { members } = useTeamMembers();
  const { canEditItem } = usePermissions();

  if (isLoading) {
    return <SkeletonLoader variant="card" count={6} />;
  }

  if (workstreams.length === 0) {
    return (
      <div>
        <EmptyState
          icon={<ClipboardList className="w-12 h-12" />}
          message="No workstreams yet. Create your first workstream to start tracking work."
          actionLabel={canEditItem ? 'Create Workstream' : undefined}
          onAction={canEditItem ? () => setCreateOpen(true) : undefined}
        />
        <WorkstreamDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    );
  }

  const tabs: { key: AllWorkstreamsTab; label: string; icon: typeof LayoutGrid; count: number }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutGrid, count: workstreams.length },
    { key: 'activities', label: 'Activities', icon: ClipboardList, count: activities.length },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">All Workstreams</h2>
        <PermissionGate required="admin">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add Workstream
          </button>
        </PermissionGate>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-xl mb-5">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span
                className={clsx(
                  'ml-0.5 min-w-[1.25rem] px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums',
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-surface-200 text-gray-500',
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workstreams
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(ws => {
              const wsActivities = activities.filter(a => a.workstream_id === ws.id);
              const wsActivityIds = new Set(wsActivities.map(a => a.id));
              const wsTasks = allTasks.filter(t => wsActivityIds.has(t.activity_id));
              const progress = calculateDeepProgress(wsActivities, wsTasks);
              const owner = ws.owner_id ? members.find(m => m.id === ws.owner_id) : null;

              return (
                <button
                  key={ws.id}
                  onClick={() => onSelectWorkstream(ws.code)}
                  className="text-left bg-white rounded-xl border border-surface-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                  style={{ borderLeftWidth: 4, borderLeftColor: getWorkstreamColorHex(ws.color) }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <WorkstreamBadge code={ws.code} color={ws.color} />
                      <h3 className="text-sm font-semibold text-gray-900 mt-1.5">{ws.name}</h3>
                    </div>
                    {owner && (
                      <Avatar name={owner.full_name} url={owner.avatar_url} size="sm" />
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mb-3">
                    {formatDateRange(ws.start_date, ws.end_date)}
                  </p>

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">
                      {wsActivities.length} {wsActivities.length === 1 ? 'activity' : 'activities'}
                    </span>
                    <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                  </div>
                  <ProgressBar value={progress} color={getWorkstreamColorHex(ws.color)} size="sm" />
                </button>
              );
            })}
        </div>
      ) : (
        <AllActivitiesTab />
      )}

      <WorkstreamDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
