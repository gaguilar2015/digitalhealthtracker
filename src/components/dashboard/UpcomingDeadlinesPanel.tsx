import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { StatusBadge, DateDisplay, WorkstreamBadge } from '@/components/shared';
import type { Activity, Deliverable, Workstream } from '@/types';

interface UpcomingDeadlinesPanelProps {
  items: (Activity | Deliverable)[];
  workstreams: Workstream[];
}

function getDate(item: Activity | Deliverable): string {
  return 'due_date' in item ? item.due_date : item.end_date;
}

export function UpcomingDeadlinesPanel({ items, workstreams }: UpcomingDeadlinesPanelProps) {
  const navigate = useNavigate();
  const wsMap = new Map(workstreams.map(ws => [ws.id, ws]));

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Upcoming Deadlines
        </h3>
        <p className="text-sm text-gray-400 py-6 text-center">No deadlines in the next 30 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Upcoming Deadlines
      </h3>
      <ul className="divide-y divide-surface-200">
        {items.map(item => {
          const ws = wsMap.get(item.workstream_id);
          const wsCode = ws?.code;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-surface-100 rounded-lg px-2 -mx-2 transition-colors"
              onClick={() => wsCode && navigate(`/workplan/${wsCode}`)}
            >
              <span className="flex-1 text-sm text-gray-800 truncate">{item.name}</span>
              {ws && <WorkstreamBadge code={ws.code} color={ws.color} />}
              <DateDisplay date={getDate(item)} />
              <StatusBadge status={item.status} size="sm" />
            </li>
          );
        })}
      </ul>
      {items.length >= 10 && (
        <button
          onClick={() => navigate('/workplan')}
          className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          View all in Workplan
        </button>
      )}
    </div>
  );
}
