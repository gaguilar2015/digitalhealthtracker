import { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { GanttTooltip } from './GanttTooltip';
import { GanttPopover } from './GanttPopover';
import type { GanttItemData } from './GanttTooltip';
import type { ItemStatus } from '@/types';

interface GanttBarProps {
  startDate: string;
  endDate: string;
  color: string;
  status: ItemStatus;
  isOverdue?: boolean;
  item: GanttItemData;
  leftPercent: number;
  widthPercent: number;
}

const statusColors: Partial<Record<ItemStatus, string>> = {
  complete: '#10B981',
  delayed: '#EF4444',
};

export function GanttBar({ color, status, isOverdue, item, leftPercent, widthPercent }: GanttBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  const barColor = statusColors[status] ?? color;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left, y: 0 });
    }
  };

  return (
    <div
      ref={barRef}
      className="absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer group"
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 0.5)}%`,
        backgroundColor: barColor,
        opacity: isOverdue ? 0.85 : 1,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onMouseMove={handleMouseMove}
      onClick={() => setShowPopover(prev => !prev)}
    >
      {isOverdue && (
        <div className={clsx('absolute inset-0 rounded bg-red-500/20 flex items-center justify-end pr-1')}>
          <AlertTriangle className="w-3 h-3 text-red-700" />
        </div>
      )}

      {showTooltip && !showPopover && (
        <GanttTooltip item={item} position={tooltipPos} />
      )}

      {showPopover && (
        <GanttPopover item={item} onClose={() => setShowPopover(false)} workstreamCode={item.workstreamCode} />
      )}
    </div>
  );
}
