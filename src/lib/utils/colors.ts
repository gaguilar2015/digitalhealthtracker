import type { WorkstreamColor } from '@/types';

export const WORKSTREAM_COLOR_HEX: Record<WorkstreamColor, string> = {
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  purple: '#A855F7',
  pink: '#EC4899',
  rose: '#F43F5E',
  orange: '#F97316',
  amber: '#F59E0B',
  emerald: '#10B981',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  sky: '#0EA5E9',
};

export function getWorkstreamColorHex(color: WorkstreamColor): string {
  return WORKSTREAM_COLOR_HEX[color];
}
