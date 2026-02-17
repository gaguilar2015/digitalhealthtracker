import { formatDate } from '@/lib/utils';
import { getStatusLabel } from '@/lib/utils/status';
import type { ItemStatus } from '@/types';

export interface GanttItemData {
  id: string;
  name: string;
  type: 'workstream' | 'activity_group' | 'activity' | 'task' | 'deliverable';
  code?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  status: ItemStatus;
  assignedTo?: string | null;
  workstreamCode?: string;
  workstreamId?: string;
}

interface GanttTooltipProps {
  item: GanttItemData;
  position: { x: number; y: number };
}

export function GanttTooltip({ item, position }: GanttTooltipProps) {
  return (
    <div
      className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none max-w-xs"
      style={{ left: position.x, top: position.y - 8, transform: 'translate(-50%, -100%)' }}
    >
      <p className="font-medium mb-1">{item.name}</p>
      {item.startDate && item.endDate && (
        <p className="text-gray-300">{formatDate(item.startDate)} - {formatDate(item.endDate)}</p>
      )}
      {item.dueDate && <p className="text-gray-300">Due: {formatDate(item.dueDate)}</p>}
      <p className="text-gray-300">Status: {getStatusLabel(item.status)}</p>
      {item.assignedTo && <p className="text-gray-300">Assigned: {item.assignedTo}</p>}
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
    </div>
  );
}
