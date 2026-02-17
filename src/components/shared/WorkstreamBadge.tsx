import type { WorkstreamColor } from '@/types';
import { getWorkstreamColorHex } from '@/lib/utils/colors';

interface WorkstreamBadgeProps {
  code: string;
  color: WorkstreamColor;
  label?: string;
}

export function WorkstreamBadge({ code, color, label }: WorkstreamBadgeProps) {
  const hex = getWorkstreamColorHex(color);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white"
      style={{ backgroundColor: hex }}
    >
      {label ?? code}
    </span>
  );
}
