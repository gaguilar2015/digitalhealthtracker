import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, format } from 'date-fns';
import type { SheetRow, SheetColumn, WidgetConfig, ChartDataPoint, AggFunction, DateBucket, ChartType } from '@/types';

function bucketDate(dateStr: string, bucket: DateBucket): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid';
  switch (bucket) {
    case 'day': return format(startOfDay(d), 'MMM d, yyyy');
    case 'week': return format(startOfWeek(d), "'W'w MMM d");
    case 'month': return format(startOfMonth(d), 'MMM yyyy');
    case 'quarter': {
      const q = Math.ceil((d.getMonth() + 1) / 3);
      return `Q${q} ${d.getFullYear()}`;
    }
  }
}

function getDateSortKey(dateStr: string, bucket: DateBucket): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  switch (bucket) {
    case 'day': return startOfDay(d).getTime();
    case 'week': return startOfWeek(d).getTime();
    case 'month': return startOfMonth(d).getTime();
    case 'quarter': return startOfQuarter(d).getTime();
  }
}

function computeAgg(values: number[], fn: AggFunction): number {
  if (values.length === 0) return 0;
  switch (fn) {
    case 'count': return values.length;
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
  }
}

function extractCellValue(row: SheetRow, colId: string): unknown {
  return row.cells[colId];
}

function toNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export function aggregateSheetData(
  rows: SheetRow[],
  columns: SheetColumn[],
  config: WidgetConfig,
): ChartDataPoint[] {
  const aggFn = config.aggFunction ?? 'count';
  const xCol = columns.find(c => c.id === config.xColumnId);
  const yCol = columns.find(c => c.id === config.yColumnId);
  const groupCol = columns.find(c => c.id === config.groupByColumnId);
  const isDateX = xCol && (xCol.type === 'date' || xCol.type === 'datetime');
  const dateBucket = config.dateBucket ?? 'month';

  // Build grouped map: category -> groupValue -> row[]
  const grouped = new Map<string, Map<string, SheetRow[]>>();
  const dateSortKeys = new Map<string, number>();

  for (const row of rows) {
    let categories: string[];

    if (!xCol) {
      categories = ['All'];
    } else {
      const raw = extractCellValue(row, xCol.id);
      if (xCol.type === 'checkbox') {
        categories = [raw ? 'Yes' : 'No'];
      } else if (xCol.type === 'multiselect' && Array.isArray(raw)) {
        categories = raw.map(String);
        if (categories.length === 0) categories = ['(empty)'];
      } else if (isDateX && raw) {
        const bucketed = bucketDate(String(raw), dateBucket);
        categories = [bucketed];
        if (!dateSortKeys.has(bucketed)) {
          dateSortKeys.set(bucketed, getDateSortKey(String(raw), dateBucket));
        }
      } else {
        const str = raw != null && raw !== '' ? String(raw) : '(empty)';
        categories = [str];
      }
    }

    const groupValue = groupCol
      ? (extractCellValue(row, groupCol.id) ?? '(none)')
      : '__default__';
    const groupStr = groupCol?.type === 'checkbox'
      ? (groupValue ? 'Yes' : 'No')
      : String(groupValue);

    for (const cat of categories) {
      if (!grouped.has(cat)) grouped.set(cat, new Map());
      const catMap = grouped.get(cat)!;
      if (!catMap.has(groupStr)) catMap.set(groupStr, []);
      catMap.get(groupStr)!.push(row);
    }
  }

  // Collect all group keys
  const allGroupKeys = new Set<string>();
  for (const catMap of grouped.values()) {
    for (const key of catMap.keys()) allGroupKeys.add(key);
  }

  // Build data points
  const result: ChartDataPoint[] = [];
  for (const [category, catMap] of grouped) {
    const point: ChartDataPoint = { category, value: 0 };

    if (groupCol && allGroupKeys.size > 0) {
      let total = 0;
      for (const gk of allGroupKeys) {
        const groupRows = catMap.get(gk) ?? [];
        let val: number;
        if (!yCol || aggFn === 'count') {
          val = groupRows.length;
        } else {
          const nums = groupRows
            .map(r => toNumber(extractCellValue(r, yCol.id)))
            .filter((n): n is number => n !== null);
          val = computeAgg(nums, aggFn);
        }
        point[gk] = val;
        total += val;
      }
      point.value = total;
    } else {
      const allRows = catMap.get('__default__') ?? [];
      if (!yCol || aggFn === 'count') {
        point.value = allRows.length;
      } else {
        const nums = allRows
          .map(r => toNumber(extractCellValue(r, yCol.id)))
          .filter((n): n is number => n !== null);
        point.value = computeAgg(nums, aggFn);
      }
    }

    result.push(point);
  }

  // Sort
  const sortBy = config.sortBy ?? 'category_asc';
  if (isDateX && dateSortKeys.size > 0) {
    result.sort((a, b) => (dateSortKeys.get(a.category) ?? 0) - (dateSortKeys.get(b.category) ?? 0));
  } else if (sortBy === 'value_desc') {
    result.sort((a, b) => b.value - a.value);
  } else if (sortBy === 'value_asc') {
    result.sort((a, b) => a.value - b.value);
  } else {
    result.sort((a, b) => a.category.localeCompare(b.category));
  }

  return result;
}

export function aggregateCrossSheet(
  sheetDataSets: { sheetName: string; rows: SheetRow[]; columns: SheetColumn[] }[],
  config: WidgetConfig,
): ChartDataPoint[] {
  if (!config.xColumnId) {
    // Row count per sheet mode
    return sheetDataSets.map(ds => ({
      category: ds.sheetName,
      value: ds.rows.length,
    }));
  }

  // Find common column by name+type across sheets
  const allResults = new Map<string, ChartDataPoint>();

  for (const ds of sheetDataSets) {
    const matchCol = ds.columns.find(c => c.name === config.xColumnName && c.id === config.xColumnId)
      ?? ds.columns.find(c => c.name === config.xColumnName);
    if (!matchCol) continue;

    const localConfig: WidgetConfig = { ...config, xColumnId: matchCol.id };
    const yMatchCol = config.yColumnName
      ? ds.columns.find(c => c.name === config.yColumnName)
      : undefined;
    if (yMatchCol) localConfig.yColumnId = yMatchCol.id;

    const points = aggregateSheetData(ds.rows, ds.columns, localConfig);
    for (const pt of points) {
      if (!allResults.has(pt.category)) {
        allResults.set(pt.category, { category: pt.category, value: 0 });
      }
      const existing = allResults.get(pt.category)!;
      existing[ds.sheetName] = pt.value;
    }
  }

  return Array.from(allResults.values());
}

export function postProcessChartData(
  data: ChartDataPoint[],
  chartType: ChartType,
): ChartDataPoint[] {
  // Filter out (empty) categories
  const filtered = data.filter(d => d.category !== '(empty)');

  if (filtered.length === 0) return filtered;

  const isPieOrDonut = chartType === 'pie' || chartType === 'donut';
  const isHorizontalBar = chartType === 'horizontal_bar';
  const isBar = chartType === 'bar' || chartType === 'stacked_bar';

  // Pie/donut: top 6 + "Other"
  if (isPieOrDonut && filtered.length > 6) {
    const sorted = [...filtered].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6);
    const otherValue = rest.reduce((sum, d) => sum + d.value, 0);
    if (otherValue > 0) {
      top.push({ category: 'Other', value: otherValue });
    }
    return top;
  }

  // Horizontal bar: top 8 (labels on Y-axis need more space per bar)
  if (isHorizontalBar && filtered.length > 8) {
    const sorted = [...filtered].sort((a, b) => b.value - a.value);
    return sorted.slice(0, 8);
  }

  // Vertical bar: top 12
  if (isBar && filtered.length > 12) {
    const sorted = [...filtered].sort((a, b) => b.value - a.value);
    return sorted.slice(0, 12);
  }

  return filtered;
}

export function computeKpiValue(
  rows: SheetRow[],
  columns: SheetColumn[],
  config: WidgetConfig,
): { value: number; label: string } {
  const aggFn = config.aggFunction ?? 'count';
  const yCol = columns.find(c => c.id === config.yColumnId);

  if (!yCol || aggFn === 'count') {
    return { value: rows.length, label: 'Total Rows' };
  }

  const nums = rows
    .map(r => toNumber(extractCellValue(r, yCol.id)))
    .filter((n): n is number => n !== null);

  const value = computeAgg(nums, aggFn);
  const aggLabel = aggFn.charAt(0).toUpperCase() + aggFn.slice(1);
  return { value, label: `${aggLabel} of ${yCol.name}` };
}
