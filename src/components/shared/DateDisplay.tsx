import { formatDate } from '@/lib/utils';

interface DateDisplayProps {
  date: string | null | undefined;
  className?: string;
}

export function DateDisplay({ date, className }: DateDisplayProps) {
  if (!date) return null;
  return <span className={className ?? 'text-sm text-gray-500'}>{formatDate(date)}</span>;
}
