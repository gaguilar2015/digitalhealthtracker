import { getStatusLabel, getStatusColor, getStatusBgClass } from '@/lib/utils';
import { clsx } from 'clsx';
import type { ItemStatus } from '@/types';

interface StatusBadgeProps {
  status: ItemStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        getStatusBgClass(status),
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs',
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: getStatusColor(status) }}
      />
      {getStatusLabel(status)}
    </span>
  );
}
