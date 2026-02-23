import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { ChartDataPoint, DashboardWidget } from '@/types';
import { getSingleSeriesColor, getSeriesColors } from '@/lib/utils/chartColors';

interface BarChartWidgetProps {
  data: ChartDataPoint[];
  widget: DashboardWidget;
  groupKeys?: string[];
  colors?: string[] | null;
}

export function BarChartWidget({ data, widget, groupKeys, colors }: BarChartWidgetProps) {
  const isHorizontal = widget.chart_type === 'horizontal_bar';
  const isStacked = widget.chart_type === 'stacked_bar';
  const hasGroups = groupKeys && groupKeys.length > 0 && groupKeys[0] !== '__default__';

  const seriesColors = hasGroups
    ? getSeriesColors(groupKeys!.length)
    : null;

  // Horizontal bars: position labels at bar end, round right corners
  // Vertical bars: position labels above bar, round top corners
  const labelProps = widget.show_values
    ? { position: isHorizontal ? 'right' as const : 'top' as const, fontSize: 11 }
    : undefined;
  const barRadius: [number, number, number, number] = isHorizontal
    ? [0, 4, 4, 0]
    : [4, 4, 0, 0];

  // For horizontal bars, compute Y-axis width from longest label
  const yAxisWidth = isHorizontal
    ? Math.min(160, Math.max(80, ...data.map(d => d.category.length * 6.5)))
    : undefined;

  const truncateLabel = (label: string) =>
    label.length > 22 ? label.slice(0, 20) + '…' : label;

  const margin = isHorizontal
    ? { top: 5, right: 40, left: 10, bottom: 5 }
    : { top: 5, right: 20, left: 10, bottom: 5 };

  if (hasGroups) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={margin}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          {isHorizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="category"
                type="category"
                tick={{ fontSize: 11 }}
                width={yAxisWidth}
                interval={0}
                tickFormatter={truncateLabel}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
            </>
          )}
          <Tooltip />
          {widget.show_legend && <Legend />}
          {groupKeys!.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId={isStacked ? 'stack' : undefined}
              fill={seriesColors![i]}
              radius={isStacked ? undefined : barRadius}
              label={labelProps}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={margin}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="category"
              type="category"
              tick={{ fontSize: 11 }}
              width={yAxisWidth}
              interval={0}
              tickFormatter={truncateLabel}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
          </>
        )}
        <Tooltip />
        {widget.show_legend && <Legend />}
        <Bar
          dataKey="value"
          name={widget.config.yColumnName ?? 'Value'}
          radius={barRadius}
          label={labelProps}
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={colors?.[i] ?? getSingleSeriesColor(i)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
