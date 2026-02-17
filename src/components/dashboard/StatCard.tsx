import { clsx } from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  color?: 'green' | 'red' | 'blue' | 'gray';
}

const colorConfig: Record<string, { gradient: string; value: string }> = {
  green: { gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', value: 'text-amber-600' },
  red: { gradient: 'linear-gradient(135deg, #dc2626, #ef4444)', value: 'text-red-600' },
  blue: { gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)', value: 'text-primary-600' },
  gray: { gradient: 'linear-gradient(135deg, #64748b, #94a3b8)', value: 'text-gray-700' },
};

export function StatCard({ label, value, detail, color = 'gray' }: StatCardProps) {
  const c = colorConfig[color];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-5 relative overflow-hidden">
      {/* Gradient top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: c.gradient }} />
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={clsx('mt-2 text-3xl font-bold tracking-tight', c.value)}>{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-400">{detail}</p>}
    </div>
  );
}
