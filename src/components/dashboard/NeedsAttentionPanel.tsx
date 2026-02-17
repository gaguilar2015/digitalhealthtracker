import { AlertTriangle } from 'lucide-react';
import type { AttentionItem } from '@/hooks/useDashboardData';

interface NeedsAttentionPanelProps {
  items: AttentionItem[];
}

const typeBadgeClasses: Record<string, string> = {
  activity: 'bg-primary-50 text-primary-700',
  task: 'bg-purple-50 text-purple-700',
  deliverable: 'bg-amber-50 text-amber-700',
};

export function NeedsAttentionPanel({ items }: NeedsAttentionPanelProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Needs Attention
        </h3>
        <p className="text-sm text-gray-400 py-6 text-center">All items are on track.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Needs Attention
      </h3>
      <ul className="divide-y divide-surface-200">
        {items.map(item => (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <span className="flex-1 text-sm text-gray-800 truncate">{item.name}</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${typeBadgeClasses[item.type] ?? 'bg-surface-100 text-gray-700'}`}
            >
              {item.type}
            </span>
            <span className="text-xs text-red-600 font-medium whitespace-nowrap">{item.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
