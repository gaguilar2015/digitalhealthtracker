import { getWorkstreamColorHex } from '@/lib/utils/colors';
import { calculateDeepStatusCounts } from '@/lib/utils/progress';
import type { Workstream, Activity, Task } from '@/types';

interface WorkstreamProgressChartProps {
  workstreams: Workstream[];
  activities: Activity[];
  tasks: Task[];
}

export function WorkstreamProgressChart({ workstreams, activities, tasks }: WorkstreamProgressChartProps) {
  if (workstreams.length === 0) return null;

  const sorted = [...workstreams].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Workstream Progress</h3>
      <div className="space-y-3">
        {sorted.map(ws => {
          const wsActivities = activities.filter(a => a.workstream_id === ws.id);
          if (wsActivities.length === 0) {
            return (
              <div key={ws.id} className="flex items-center gap-3">
                <span className="w-36 text-xs text-gray-600 truncate font-medium">{ws.code}</span>
                <div className="flex-1 h-5 bg-surface-100 rounded-full overflow-hidden flex items-center justify-center">
                  <span className="text-xs text-gray-400">No activities</span>
                </div>
              </div>
            );
          }

          const wsActivityIds = new Set(wsActivities.map(a => a.id));
          const wsTasks = tasks.filter(t => wsActivityIds.has(t.activity_id));
          const { counts, total } = calculateDeepStatusCounts(wsActivities, wsTasks);

          return (
            <div key={ws.id} className="flex items-center gap-3">
              <span
                className="w-36 text-xs truncate font-medium"
                style={{ color: getWorkstreamColorHex(ws.color) }}
                title={ws.name}
              >
                {ws.code}
              </span>
              <div className="flex-1 h-5 bg-surface-100 rounded-full overflow-hidden flex">
                {counts.complete > 0 && (
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${(counts.complete / total) * 100}%` }}
                    title={`Complete: ${counts.complete}`}
                  />
                )}
                {counts.in_progress > 0 && (
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${(counts.in_progress / total) * 100}%` }}
                    title={`In Progress: ${counts.in_progress}`}
                  />
                )}
                {counts.delayed > 0 && (
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${(counts.delayed / total) * 100}%` }}
                    title={`Delayed: ${counts.delayed}`}
                  />
                )}
                {counts.not_started > 0 && (
                  <div
                    className="h-full bg-slate-300 transition-all duration-300"
                    style={{ width: `${(counts.not_started / total) * 100}%` }}
                    title={`Not Started: ${counts.not_started}`}
                  />
                )}
              </div>
              <span className="text-xs text-gray-400 w-8 text-right">{total}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Complete</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary-500" /> In Progress</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Delayed</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-300" /> Not Started</span>
      </div>
    </div>
  );
}
