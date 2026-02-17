import { useNavigate } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { StatusBadge, DateDisplay } from '@/components/shared';
import type { GanttItemData } from './GanttTooltip';

interface GanttPopoverProps {
  item: GanttItemData;
  onClose: () => void;
  workstreamCode?: string;
}

export function GanttPopover({ item, onClose, workstreamCode }: GanttPopoverProps) {
  const navigate = useNavigate();

  return (
    <div className="absolute z-50 bg-white border border-surface-200 rounded-lg shadow-xl p-4 w-72" style={{ left: 0, top: '100%' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-400 uppercase font-medium">{item.type}</p>
          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
          {item.code && <p className="text-xs text-gray-500">{item.code}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {item.startDate && item.endDate && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Dates</span>
            <span className="text-gray-700">
              <DateDisplay date={item.startDate} className="text-sm text-gray-700" />
              {' - '}
              <DateDisplay date={item.endDate} className="text-sm text-gray-700" />
            </span>
          </div>
        )}
        {item.dueDate && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Due</span>
            <DateDisplay date={item.dueDate} className="text-sm text-gray-700" />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Status</span>
          <StatusBadge status={item.status} size="sm" />
        </div>
        {item.assignedTo && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Assigned</span>
            <span className="text-gray-700">{item.assignedTo}</span>
          </div>
        )}
      </div>

      {workstreamCode && (
        <button
          onClick={() => {
            onClose();
            navigate(`/workplan/${workstreamCode}`);
          }}
          className="mt-3 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          View in Workplan
        </button>
      )}
    </div>
  );
}
