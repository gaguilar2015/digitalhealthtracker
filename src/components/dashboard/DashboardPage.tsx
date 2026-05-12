import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useAuth } from '@/hooks/useAuth';
import { useTeamVisibility } from '@/hooks/useTeamVisibility';
import { SkeletonLoader, EmptyState } from '@/components/shared';
import { LayoutDashboard } from 'lucide-react';
import { StatCard } from './StatCard';
import { UpcomingDeadlinesPanel } from './UpcomingDeadlinesPanel';
import { NeedsAttentionPanel } from './NeedsAttentionPanel';
import { WorkstreamProgressChart } from './WorkstreamProgressChart';
import { ActivityStatusBreakdown } from './ActivityStatusBreakdown';
import { calculateProgress, calculateDeepStatusCounts } from '@/lib/utils/progress';
import { isOverdue, isWithinDays, daysOverdue } from '@/lib/utils';
import { clsx } from 'clsx';
import type { ItemStatus, VisibilityMode } from '@/types';
import type { AttentionItem } from '@/hooks/useDashboardData';
import type { Activity, Deliverable } from '@/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardData();
  const { workstreams, isLoading: wsLoading } = useWorkstreams();
  const { teamMember, isAdmin } = useAuth();
  const { mode, setMode, filterItems } = useTeamVisibility();

  const firstName = teamMember?.full_name?.split(' ')[0] ?? 'there';

  // Compute hierarchy-filtered dashboard data
  const filtered = useMemo(() => {
    if (!data) return null;

    const activities = filterItems(data.allActivities, workstreams);
    const deliverables = filterItems(data.allDeliverables, workstreams);

    // Filter tasks: keep tasks whose parent activity is in the filtered set
    const activityIds = new Set(activities.map(a => a.id));
    const tasks = data.allTasks.filter(t => activityIds.has(t.activity_id));

    const totalDeliverables = deliverables.length;
    const overallProgress = calculateProgress(deliverables);

    const overdueOrDelayedDels = deliverables.filter(
      d => d.status === 'delayed' || isOverdue(d.due_date, d.status),
    );
    const onTrack = totalDeliverables - overdueOrDelayedDels.length;
    const needsAttention = overdueOrDelayedDels.length;

    // Upcoming deadlines
    const upcoming: (Activity | Deliverable)[] = [];
    for (const d of deliverables) {
      if (d.status !== 'complete' && isWithinDays(d.due_date, 30)) {
        upcoming.push(d);
      }
    }
    for (const a of activities) {
      if (a.status !== 'complete' && isWithinDays(a.end_date, 30)) {
        upcoming.push(a);
      }
    }
    upcoming.sort((a, b) => {
      const dateA = 'due_date' in a ? a.due_date : a.end_date;
      const dateB = 'due_date' in b ? b.due_date : b.end_date;
      return dateA.localeCompare(dateB);
    });

    // Attention items
    const attentionItems: AttentionItem[] = [];
    for (const a of activities) {
      if (isOverdue(a.end_date, a.status)) {
        attentionItems.push({
          id: a.id, name: a.name, type: 'activity', workstream_id: a.workstream_id,
          reason: `${daysOverdue(a.end_date)} days overdue`, daysOverdue: daysOverdue(a.end_date),
        });
      } else if (a.status === 'delayed') {
        attentionItems.push({
          id: a.id, name: a.name, type: 'activity', workstream_id: a.workstream_id, reason: 'Delayed',
        });
      }
    }
    for (const d of deliverables) {
      if (isOverdue(d.due_date, d.status)) {
        attentionItems.push({
          id: d.id, name: d.name, type: 'deliverable', workstream_id: d.workstream_id,
          reason: `${daysOverdue(d.due_date)} days overdue`, daysOverdue: daysOverdue(d.due_date),
        });
      } else if (d.status === 'delayed') {
        attentionItems.push({
          id: d.id, name: d.name, type: 'deliverable', workstream_id: d.workstream_id, reason: 'Delayed',
        });
      }
    }
    for (const t of tasks) {
      if (t.end_date && isOverdue(t.end_date, t.status)) {
        attentionItems.push({
          id: t.id, name: t.name, type: 'task', workstream_id: '',
          reason: `${daysOverdue(t.end_date)} days overdue`, daysOverdue: daysOverdue(t.end_date),
        });
      }
    }
    attentionItems.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

    const { counts: statusCounts } = calculateDeepStatusCounts(activities, tasks);

    return {
      totalDeliverables,
      overallProgress,
      onTrack,
      needsAttention,
      upcomingDeadlines: upcoming.slice(0, 10),
      attentionItems: attentionItems.slice(0, 10),
      statusCounts,
      allActivities: activities,
      allDeliverables: deliverables,
      allTasks: tasks,
    };
  }, [data, workstreams, filterItems]);

  if (isLoading || wsLoading) {
    return (
      <div className="p-6 space-y-6 page-enter">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonLoader variant="card" count={4} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonLoader variant="table" count={5} />
          <SkeletonLoader variant="table" count={5} />
        </div>
        <SkeletonLoader variant="chart" />
      </div>
    );
  }

  if (!filtered || workstreams.length === 0) {
    return (
      <div className="p-6 page-enter">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <EmptyState
          icon={<LayoutDashboard className="w-12 h-12" />}
          message="Welcome! Create a workstream in the Workplan to get started."
          actionLabel="Go to Workplan"
          onAction={() => navigate('/workplan')}
        />
      </div>
    );
  }

  const statusCounts = filtered.statusCounts as Record<ItemStatus, number>;

  const scopeOptions: { key: VisibilityMode; label: string }[] = isAdmin
    ? [{ key: 'all', label: 'Project' }, { key: 'my-team', label: 'My Team' }, { key: 'my-work', label: 'My Work' }]
    : [{ key: 'my-team', label: 'My Team' }, { key: 'my-work', label: 'My Work' }];

  return (
    <div className="p-6 space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's how the project is progressing.</p>
        </div>

        {/* Scope toggle */}
        <div className="flex gap-0.5 p-0.5 bg-surface-100 rounded-lg">
          {scopeOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setMode(opt.key)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                mode === opt.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Deliverables"
          value={filtered.totalDeliverables}
          color="blue"
        />
        <StatCard
          label="Overall Progress"
          value={`${filtered.overallProgress}%`}
          detail="Based on deliverable completion"
          color={filtered.overallProgress >= 50 ? 'green' : 'blue'}
        />
        <StatCard
          label="On Track"
          value={filtered.onTrack}
          detail={`of ${filtered.totalDeliverables} deliverables`}
          color="green"
        />
        <StatCard
          label="Needs Attention"
          value={filtered.needsAttention}
          detail="Overdue or delayed"
          color={filtered.needsAttention > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Middle Row: Deadlines + Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingDeadlinesPanel items={filtered.upcomingDeadlines} workstreams={workstreams} />
        <NeedsAttentionPanel items={filtered.attentionItems} />
      </div>

      {/* Bottom Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorkstreamProgressChart workstreams={workstreams} activities={filtered.allActivities} tasks={filtered.allTasks} />
        <ActivityStatusBreakdown counts={statusCounts} />
      </div>
    </div>
  );
}
