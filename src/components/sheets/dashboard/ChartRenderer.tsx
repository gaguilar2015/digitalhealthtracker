import { useMemo } from 'react';
import type { DashboardWidget, Sheet, SheetRow, ChartDataPoint } from '@/types';
import { aggregateSheetData, aggregateCrossSheet, computeKpiValue, postProcessChartData } from '@/lib/utils/chartAggregation';
import { getOptionColors } from '@/lib/utils/chartColors';
import { BarChartWidget } from './BarChartWidget';
import { LineAreaChartWidget } from './LineAreaChartWidget';
import { PieChartWidget } from './PieChartWidget';
import { KpiStatWidget } from './KpiStatWidget';

interface ChartRendererProps {
  widget: DashboardWidget;
  sheets: Sheet[];
  rowsBySheet: Map<string, SheetRow[]>;
}

export function ChartRenderer({ widget, sheets, rowsBySheet }: ChartRendererProps) {
  const sheet = sheets.find(s => s.id === widget.sheet_id);
  const rows = widget.sheet_id ? (rowsBySheet.get(widget.sheet_id) ?? []) : [];

  const { data, groupKeys, colors } = useMemo(() => {
    if (widget.chart_type === 'kpi') {
      return { data: [], groupKeys: undefined, colors: null };
    }

    let chartData: ChartDataPoint[];
    let keys: string[] | undefined;

    if (widget.source_type === 'sheet_group' && widget.selected_sheet_ids.length > 0) {
      const dataSets = widget.selected_sheet_ids
        .map(id => {
          const s = sheets.find(sh => sh.id === id);
          return s ? { sheetName: s.name, rows: rowsBySheet.get(id) ?? [], columns: s.columns } : null;
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      chartData = aggregateCrossSheet(dataSets, widget.config);
      keys = dataSets.map(d => d.sheetName);
    } else if (sheet) {
      chartData = aggregateSheetData(rows, sheet.columns, widget.config);

      // Collect group keys
      if (widget.config.groupByColumnId) {
        const allKeys = new Set<string>();
        for (const pt of chartData) {
          for (const k of Object.keys(pt)) {
            if (k !== 'category' && k !== 'value') allKeys.add(k);
          }
        }
        keys = [...allKeys];
      }
    } else {
      chartData = [];
    }

    // Post-process: filter empties, cap categories
    chartData = postProcessChartData(chartData, widget.chart_type);

    // Try to use option colors
    const xCol = sheet?.columns.find(c => c.id === widget.config.xColumnId);
    const optColors = getOptionColors(xCol, chartData.map(d => d.category));

    return { data: chartData, groupKeys: keys, colors: optColors };
  }, [widget, sheet, rows, sheets, rowsBySheet]);

  if (widget.chart_type === 'kpi') {
    const columns = sheet?.columns ?? [];
    const { value, label } = computeKpiValue(rows, columns, widget.config);
    return <KpiStatWidget value={value} label={label} title={widget.title} />;
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        No data available
      </div>
    );
  }

  switch (widget.chart_type) {
    case 'bar':
    case 'horizontal_bar':
    case 'stacked_bar':
      return <BarChartWidget data={data} widget={widget} groupKeys={groupKeys} colors={colors} />;
    case 'line':
    case 'area':
      return <LineAreaChartWidget data={data} widget={widget} groupKeys={groupKeys} />;
    case 'pie':
    case 'donut':
      return <PieChartWidget data={data} widget={widget} colors={colors} />;
    default:
      return <div className="text-sm text-gray-400 text-center">Unknown chart type</div>;
  }
}
