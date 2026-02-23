import { useMemo } from 'react';
import type { ChartType, WidgetConfig, Sheet, SheetRow, DashboardWidget } from '@/types';
import { aggregateSheetData, computeKpiValue } from '@/lib/utils/chartAggregation';
import { getOptionColors } from '@/lib/utils/chartColors';
import { BarChartWidget } from './BarChartWidget';
import { LineAreaChartWidget } from './LineAreaChartWidget';
import { PieChartWidget } from './PieChartWidget';
import { KpiStatWidget } from './KpiStatWidget';

interface ChartPreviewProps {
  chartType: ChartType | null;
  config: WidgetConfig;
  sheet: Sheet | undefined;
  rows: SheetRow[];
  title: string;
  showLegend: boolean;
  showValues: boolean;
}

export function ChartPreview({
  chartType,
  config,
  sheet,
  rows,
  title,
  showLegend,
  showValues,
}: ChartPreviewProps) {
  const fakeWidget: DashboardWidget = useMemo(() => ({
    id: 'preview',
    title,
    chart_type: chartType ?? 'bar',
    source_type: 'single_sheet',
    sheet_id: sheet?.id ?? null,
    sheet_group_id: null,
    selected_sheet_ids: [],
    config,
    color_palette: 'auto',
    grid_span: 1,
    show_legend: showLegend,
    show_values: showValues,
    sort_order: 0,
    created_by: '',
    created_at: '',
    updated_at: '',
  }), [chartType, config, sheet?.id, title, showLegend, showValues]);

  const { data, groupKeys, colors } = useMemo(() => {
    if (!chartType || !sheet || !config.xColumnId && chartType !== 'kpi') {
      return { data: [], groupKeys: undefined, colors: null };
    }
    if (chartType === 'kpi') {
      return { data: [], groupKeys: undefined, colors: null };
    }
    const chartData = aggregateSheetData(rows, sheet.columns, config);

    let keys: string[] | undefined;
    if (config.groupByColumnId) {
      const allKeys = new Set<string>();
      for (const pt of chartData) {
        for (const k of Object.keys(pt)) {
          if (k !== 'category' && k !== 'value') allKeys.add(k);
        }
      }
      keys = [...allKeys];
    }

    const xCol = sheet.columns.find(c => c.id === config.xColumnId);
    const optColors = getOptionColors(xCol, chartData.map(d => d.category));

    return { data: chartData, groupKeys: keys, colors: optColors };
  }, [chartType, sheet, rows, config]);

  if (!chartType) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Select a chart type to preview
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Select a data source to preview
      </div>
    );
  }

  if (chartType === 'kpi') {
    const columns = sheet?.columns ?? [];
    const { value, label } = computeKpiValue(rows, columns, config);
    return <KpiStatWidget value={value} label={label} title={title || 'Preview'} />;
  }

  if (data.length === 0 && config.xColumnId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        No data to display
      </div>
    );
  }

  if (!config.xColumnId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        Configure axes to see preview
      </div>
    );
  }

  switch (chartType) {
    case 'bar':
    case 'horizontal_bar':
    case 'stacked_bar':
      return <BarChartWidget data={data} widget={fakeWidget} groupKeys={groupKeys} colors={colors} />;
    case 'line':
    case 'area':
      return <LineAreaChartWidget data={data} widget={fakeWidget} groupKeys={groupKeys} />;
    case 'pie':
    case 'donut':
      return <PieChartWidget data={data} widget={fakeWidget} colors={colors} />;
    default:
      return null;
  }
}
