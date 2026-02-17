import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import type { ItemStatus } from '@/types';

interface ActivityStatusBreakdownProps {
  counts: Record<ItemStatus, number>;
}

const pills: { status: ItemStatus; label: string; bg: string; text: string }[] = [
  { status: 'not_started', label: 'Not Started', bg: 'bg-slate-100 hover:bg-slate-200', text: 'text-slate-700' },
  { status: 'in_progress', label: 'In Progress', bg: 'bg-primary-100 hover:bg-primary-200', text: 'text-primary-800' },
  { status: 'complete', label: 'Complete', bg: 'bg-amber-100 hover:bg-amber-200', text: 'text-amber-800' },
  { status: 'delayed', label: 'Delayed', bg: 'bg-red-100 hover:bg-red-200', text: 'text-red-800' },
];

export function ActivityStatusBreakdown({ counts }: ActivityStatusBreakdownProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Activity Status</h3>
      <div className="flex flex-wrap gap-3">
        {pills.map(({ status, label, bg, text }) => (
          <button
            key={status}
            onClick={() => navigate(`/workplan?status=${status}`)}
            className={clsx(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
              bg,
              text,
            )}
          >
            <span className="text-lg font-semibold">{counts[status] ?? 0}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
