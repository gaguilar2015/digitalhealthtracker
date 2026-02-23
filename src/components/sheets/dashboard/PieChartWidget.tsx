import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { ChartDataPoint, DashboardWidget } from '@/types';
import { getPieColors } from '@/lib/utils/chartColors';

interface PieChartWidgetProps {
  data: ChartDataPoint[];
  widget: DashboardWidget;
  colors?: string[] | null;
}

export function PieChartWidget({ data, widget, colors }: PieChartWidgetProps) {
  const isDonut = widget.chart_type === 'donut';
  const pieColors = colors ?? getPieColors(data.length);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const showLabels = widget.show_values && data.length <= 5;
  const showLegend = widget.show_legend && data.length <= 8;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={isDonut ? '55%' : 0}
          outerRadius="80%"
          paddingAngle={2}
          label={showLabels ? (props: PieLabelRenderProps) => {
            const cat = (props as PieLabelRenderProps & { category?: string }).category ?? '';
            const pct = ((props.percent ?? 0) * 100).toFixed(0);
            return `${cat} (${pct}%)`;
          } : undefined}
          labelLine={showLabels}
          fontSize={11}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={pieColors[i % pieColors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, 'Count']} />
        {showLegend && <Legend />}
        {isDonut && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-700"
          >
            <tspan x="50%" dy="-8" fontSize="24" fontWeight="bold">
              {total}
            </tspan>
            <tspan x="50%" dy="22" fontSize="12" fill="#9ca3af">
              Total
            </tspan>
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
