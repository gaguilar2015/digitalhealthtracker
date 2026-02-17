import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  color?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

function lightenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lighten = (c: number) => Math.min(255, c + Math.round((255 - c) * 0.35));
  return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
}

export function ProgressBar({ value, color = '#14b8a6', size = 'md', showLabel }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('flex-1 bg-surface-200 rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className="h-full rounded-full transition-all duration-500 progress-shimmer"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: `linear-gradient(90deg, ${color}, ${lightenColor(color)})`,
          }}
        />
      </div>
      {showLabel && <span className="text-xs text-gray-500 min-w-[2.5rem] text-right">{Math.round(value)}%</span>}
    </div>
  );
}
