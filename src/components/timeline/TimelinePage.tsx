import { useState, useCallback, useRef } from 'react';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useAllActivities } from '@/hooks/useActivities';
import { useAllDeliverables } from '@/hooks/useDeliverables';
import { useAllDependencies } from '@/hooks/useDependencies';
import { useAllTasks } from '@/hooks/useTasks';
import { useAllActivityGroups } from '@/hooks/useActivityGroups';
import { SkeletonLoader, EmptyState } from '@/components/shared';
import { GanttChart as GanttIcon } from 'lucide-react';
import { GanttControls } from './GanttControls';
import { GanttChart } from './GanttChart';
import type { ZoomLevel, DetailLevel } from './GanttControls';

export default function TimelinePage() {
  const { workstreams, isLoading: wsLoading } = useWorkstreams();
  const { activities, isLoading: actLoading } = useAllActivities();
  const { deliverables, isLoading: delLoading } = useAllDeliverables();
  const { dependencies, isLoading: depLoading } = useAllDependencies();
  const { tasks, isLoading: taskLoading } = useAllTasks();
  const { activityGroups, isLoading: agLoading } = useAllActivityGroups();

  const [zoom, setZoom] = useState<ZoomLevel>('full');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('activity');
  const [selectedWorkstreams, setSelectedWorkstreams] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // Initialize selected workstreams when loaded
  const wsInitialized = useRef(false);
  if (!wsInitialized.current && workstreams.length > 0) {
    setSelectedWorkstreams(workstreams.map(ws => ws.id));
    wsInitialized.current = true;
  }

  const handleExport = useCallback((_format: 'png' | 'pdf') => {
    // Export functionality placeholder - requires canvas/jspdf libraries
    // Will be implemented in export utilities task
  }, []);

  const isLoading = wsLoading || actLoading || delLoading || depLoading || taskLoading || agLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
        <SkeletonLoader variant="chart" />
      </div>
    );
  }

  if (workstreams.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Timeline</h1>
        <EmptyState
          icon={<GanttIcon className="w-12 h-12" />}
          message="No workstreams yet. Create a workstream in the Workplan to see the timeline."
          actionLabel="Go to Workplan"
          onAction={() => window.location.assign('/workplan')}
        />
      </div>
    );
  }

  const filteredWorkstreams = workstreams.filter(ws => selectedWorkstreams.includes(ws.id));
  const filteredActivities = activities.filter(a => selectedWorkstreams.includes(a.workstream_id));
  const filteredDeliverables = deliverables.filter(d => selectedWorkstreams.includes(d.workstream_id));

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>

      <GanttControls
        zoom={zoom}
        onZoomChange={setZoom}
        detailLevel={detailLevel}
        onDetailChange={setDetailLevel}
        selectedWorkstreams={selectedWorkstreams}
        onFilterChange={setSelectedWorkstreams}
        onExport={handleExport}
        workstreams={workstreams}
      />

      <div ref={chartRef}>
        <GanttChart
          workstreams={filteredWorkstreams}
          activities={filteredActivities}
          activityGroups={activityGroups}
          tasks={tasks}
          deliverables={filteredDeliverables}
          dependencies={dependencies}
          zoom={zoom}
          detailLevel={detailLevel}
        />
      </div>
    </div>
  );
}
