import { clsx } from 'clsx';

interface Rect {
  left: number;
  right: number;
  top: number;
}

interface GanttDependencyArrowProps {
  from: Rect;
  to: Rect;
  violated?: boolean;
}

export function GanttDependencyArrow({ from, to, violated }: GanttDependencyArrowProps) {
  const x1 = from.right;
  const y1 = from.top;
  const x2 = to.left;
  const y2 = to.top;

  const midX = (x1 + x2) / 2;

  return (
    <path
      d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
      fill="none"
      stroke={violated ? '#EF4444' : '#9CA3AF'}
      strokeWidth={1.5}
      strokeDasharray={violated ? '4 2' : undefined}
      markerEnd="url(#arrowhead)"
      className={clsx('transition-colors')}
    />
  );
}
