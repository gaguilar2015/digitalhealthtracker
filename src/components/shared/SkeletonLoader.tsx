import { clsx } from 'clsx';

interface SkeletonLoaderProps {
  variant?: 'line' | 'card' | 'table' | 'chart';
  count?: number;
}

export function SkeletonLoader({ variant = 'line', count = 3 }: SkeletonLoaderProps) {
  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-surface-200 p-4 animate-pulse">
            <div className="h-4 bg-surface-200 rounded w-3/4 mb-3" />
            <div className="h-3 bg-surface-100 rounded w-1/2 mb-2" />
            <div className="h-3 bg-surface-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 bg-surface-200 rounded-xl" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-12 bg-surface-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className="animate-pulse bg-surface-100 rounded-xl h-64 flex items-center justify-center">
        <div className="text-surface-200 text-sm">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={clsx('h-4 bg-surface-200 rounded', i % 2 === 0 ? 'w-full' : 'w-3/4')} />
      ))}
    </div>
  );
}
