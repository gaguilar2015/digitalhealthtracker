import { clsx } from 'clsx';
import type { ItemStatus } from '@/types';

interface GanttDiamondProps {
  date: string;
  color: string;
  status: ItemStatus;
  leftPercent: number;
}

const statusFills: Record<ItemStatus, string> = {
  not_started: 'bg-gray-400',
  in_progress: 'bg-primary-500',
  complete: 'bg-green-500',
  delayed: 'bg-red-500',
};

export function GanttDiamond({ status, leftPercent }: GanttDiamondProps) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
      style={{ left: `${leftPercent}%` }}
    >
      <div
        className={clsx('w-3 h-3 rotate-45 border border-white shadow-sm', statusFills[status])}
      />
    </div>
  );
}
