import { useDashboardData } from '@/hooks/useDashboardData';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonLoader, EmptyState } from '@/components/shared';
import { LayoutDashboard } from 'lucide-react';
import { StatCard } from './StatCard';
import { UpcomingDeadlinesPanel } from './UpcomingDeadlinesPanel';
import { NeedsAttentionPanel } from './NeedsAttentionPanel';
import { WorkstreamProgressChart } from './WorkstreamProgressChart';
import { ActivityStatusBreakdown } from './ActivityStatusBreakdown';
import type { ItemStatus } from '@/types';

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData();
  const { workstreams, isLoading: wsLoading } = useWorkstreams();
  const { teamMember } = useAuth();

  const firstName = teamMember?.full_name?.split(' ')[0] ?? 'there';

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

  if (!data || workstreams.length === 0) {
    return (
      <div className="p-6 page-enter">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <EmptyState
          icon={<LayoutDashboard className="w-12 h-12" />}
          message="Welcome! Create a workstream in the Workplan to get started."
          actionLabel="Go to Workplan"
          onAction={() => window.location.assign('/workplan')}
        />
      </div>
    );
  }

  const statusCounts = data.statusCounts as Record<ItemStatus, number>;

  return (
    <div className="p-6 space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's how the project is progressing.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Deliverables"
          value={data.totalDeliverables}
          color="blue"
        />
        <StatCard
          label="Overall Progress"
          value={`${data.overallProgress}%`}
          detail="Based on deliverable completion"
          color={data.overallProgress >= 50 ? 'green' : 'blue'}
        />
        <StatCard
          label="On Track"
          value={data.onTrack}
          detail={`of ${data.totalDeliverables} deliverables`}
          color="green"
        />
        <StatCard
          label="Needs Attention"
          value={data.needsAttention}
          detail="Overdue or delayed"
          color={data.needsAttention > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Middle Row: Deadlines + Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingDeadlinesPanel items={data.upcomingDeadlines} workstreams={workstreams} />
        <NeedsAttentionPanel items={data.attentionItems} />
      </div>

      {/* Bottom Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorkstreamProgressChart workstreams={workstreams} activities={data.allActivities} tasks={data.allTasks} />
        <ActivityStatusBreakdown counts={statusCounts} />
      </div>
    </div>
  );
}
