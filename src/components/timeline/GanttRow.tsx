import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface GanttRowProps {
  label: string;
  isGroupHeader?: boolean;
  isOwnerHeader?: boolean;
  indent?: number;
  color?: string;
  children?: ReactNode;
}

export function GanttRow({ isGroupHeader, isOwnerHeader, children }: GanttRowProps) {
  return (
    <div className={clsx(
      'flex border-b border-gray-100 min-h-[36px]',
      isOwnerHeader ? 'bg-surface-100 border-b-surface-200' : isGroupHeader && 'bg-gray-50',
    )}>
      {/* Bar area */}
      <div className="flex-1 relative">
        {children}
      </div>
    </div>
  );
}

/** Label cell for the fixed left column */
export function GanttRowLabel({
  label,
  isGroupHeader,
  isOwnerHeader,
  indent = 0,
  color,
}: Omit<GanttRowProps, 'children'>) {
  return (
    <div
      className={clsx(
        'flex items-center px-3 border-b border-gray-100 min-h-[36px] overflow-hidden',
        isOwnerHeader
          ? 'font-bold text-[11px] uppercase tracking-wide text-gray-500 bg-surface-100 border-b-surface-200 border-t-2 border-t-surface-200'
          : isGroupHeader ? 'font-semibold text-sm bg-gray-50' : 'text-xs text-gray-700',
      )}
      style={{ paddingLeft: `${12 + indent * 16}px` }}
    >
      {color && (
        <span className="w-2 h-2 rounded-full flex-shrink-0 mr-2" style={{ backgroundColor: color }} />
      )}
      <span className="truncate" title={label}>{label}</span>
    </div>
  );
}
