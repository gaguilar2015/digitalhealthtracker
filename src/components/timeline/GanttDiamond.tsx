import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { GanttTooltip } from './GanttTooltip';
import { GanttPopover } from './GanttPopover';
import type { GanttItemData } from './GanttTooltip';
import type { ItemStatus } from '@/types';

interface GanttDiamondProps {
  date: string;
  color: string;
  status: ItemStatus;
  leftPercent: number;
  item?: GanttItemData;
}

const statusFills: Record<ItemStatus, string> = {
  not_started: 'bg-gray-400',
  in_progress: 'bg-primary-500',
  complete: 'bg-green-500',
  delayed: 'bg-red-500',
};

export function GanttDiamond({ status, leftPercent, item }: GanttDiamondProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-[5]"
      style={{ left: `${leftPercent}%` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowPopover(prev => !prev)}
    >
      <div
        className={clsx('w-3 h-3 rotate-45 border border-white shadow-sm', statusFills[status])}
      />

      {item && showTooltip && !showPopover && (
        <GanttTooltip item={item} position={{ x: 6, y: 0 }} />
      )}

      {item && showPopover && (
        <GanttPopover item={item} onClose={() => setShowPopover(false)} workstreamCode={item.workstreamCode} />
      )}
    </div>
  );
}
