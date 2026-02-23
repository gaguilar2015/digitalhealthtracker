import {
  BarChart3, BarChartHorizontal, Layers, TrendingUp,
  AreaChart, PieChart, Hash,
} from 'lucide-react';
import type { ChartType } from '@/types';
import { clsx } from 'clsx';

const CHART_TYPE_OPTIONS: { type: ChartType; icon: typeof BarChart3; label: string }[] = [
  { type: 'bar', icon: BarChart3, label: 'Bar' },
  { type: 'horizontal_bar', icon: BarChartHorizontal, label: 'Horizontal Bar' },
  { type: 'stacked_bar', icon: Layers, label: 'Stacked Bar' },
  { type: 'line', icon: TrendingUp, label: 'Line' },
  { type: 'area', icon: AreaChart, label: 'Area' },
  { type: 'pie', icon: PieChart, label: 'Pie / Donut' },
  { type: 'kpi', icon: Hash, label: 'KPI Stat' },
];

interface ChartTypePickerProps {
  value: ChartType | null;
  onChange: (type: ChartType) => void;
}

export function ChartTypePicker({ value, onChange }: ChartTypePickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
      <div className="grid grid-cols-4 gap-2">
        {CHART_TYPE_OPTIONS.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={clsx(
              'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all',
              value === type
                ? 'border-teal-500 ring-2 ring-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50',
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
