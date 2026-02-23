import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint, DashboardWidget } from '@/types';
import { getSingleSeriesColor, getSeriesColors } from '@/lib/utils/chartColors';

interface LineAreaChartWidgetProps {
  data: ChartDataPoint[];
  widget: DashboardWidget;
  groupKeys?: string[];
}

export function LineAreaChartWidget({ data, widget, groupKeys }: LineAreaChartWidgetProps) {
  const isArea = widget.chart_type === 'area';
  const hasGroups = groupKeys && groupKeys.length > 0 && groupKeys[0] !== '__default__';
  const seriesColors = hasGroups
    ? getSeriesColors(groupKeys!.length)
    : [getSingleSeriesColor(0)];

  const ChartComponent = isArea ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        {widget.show_legend && <Legend />}
        {hasGroups ? (
          groupKeys!.map((key, i) =>
            isArea ? (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={seriesColors[i]}
                fill={seriesColors[i]}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ) : (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={seriesColors[i]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ),
          )
        ) : isArea ? (
          <Area
            type="monotone"
            dataKey="value"
            name={widget.config.yColumnName ?? 'Value'}
            stroke={seriesColors[0]}
            fill={seriesColors[0]}
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="value"
            name={widget.config.yColumnName ?? 'Value'}
            stroke={seriesColors[0]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}
