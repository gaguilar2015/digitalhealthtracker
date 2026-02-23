import type { Sheet, SheetRow, ChartType, WidgetConfig, DashboardWidget, SheetColumn } from '@/types';

interface ChartSuggestion {
  score: number;
  sheetId: string;
  chartType: ChartType;
  config: WidgetConfig;
  title: string;
  uniqueCount: number;
}

function findFirstColumnOfType(columns: SheetColumn[], types: string[]): SheetColumn | undefined {
  return columns.find(c => types.includes(c.type));
}

function countUniqueValues(rows: SheetRow[], colId: string): number {
  const seen = new Set<string>();
  for (const row of rows) {
    const val = row.cells[colId];
    if (val != null && val !== '') {
      const str = String(val);
      if (str !== '(empty)') seen.add(str);
    }
  }
  return seen.size;
}

export function generateAutoSuggestions(
  sheets: Sheet[],
  rowsBySheet: Map<string, SheetRow[]>,
): ChartSuggestion[] {
  const suggestions: ChartSuggestion[] = [];

  for (const sheet of sheets) {
    const rows = rowsBySheet.get(sheet.id) ?? [];
    if (rows.length < 2) continue;

    const cols = sheet.columns;
    const selectCol = findFirstColumnOfType(cols, ['select']);
    const numberCol = findFirstColumnOfType(cols, ['number']);
    const dateCol = findFirstColumnOfType(cols, ['date', 'datetime']);
    const checkboxCol = findFirstColumnOfType(cols, ['checkbox']);

    const selectUniqueCount = selectCol ? countUniqueValues(rows, selectCol.id) : 0;

    // Select + number → Bar chart
    if (selectCol && numberCol && selectUniqueCount > 1) {
      suggestions.push({
        score: 10,
        sheetId: sheet.id,
        chartType: 'bar',
        config: {
          xColumnId: selectCol.id,
          xColumnName: selectCol.name,
          yColumnId: numberCol.id,
          yColumnName: numberCol.name,
          aggFunction: 'sum',
          sortBy: 'value_desc',
        },
        title: `${sheet.name}: ${numberCol.name} by ${selectCol.name}`,
        uniqueCount: selectUniqueCount,
      });
    }

    // Date + number → Line chart
    if (dateCol && numberCol) {
      suggestions.push({
        score: 8,
        sheetId: sheet.id,
        chartType: 'line',
        config: {
          xColumnId: dateCol.id,
          xColumnName: dateCol.name,
          yColumnId: numberCol.id,
          yColumnName: numberCol.name,
          aggFunction: 'sum',
          dateBucket: 'month',
          sortBy: 'category_asc',
        },
        title: `${sheet.name}: ${numberCol.name} over Time`,
        uniqueCount: 0,
      });
    }

    // Select column alone → donut (<=6 unique) or horizontal_bar (>6 unique)
    if (selectCol && !numberCol && selectUniqueCount > 1) {
      const chartType: ChartType = selectUniqueCount <= 6 ? 'donut' : 'horizontal_bar';
      suggestions.push({
        score: 6,
        sheetId: sheet.id,
        chartType,
        config: {
          xColumnId: selectCol.id,
          xColumnName: selectCol.name,
          aggFunction: 'count',
          sortBy: 'value_desc',
        },
        title: `${sheet.name}: ${selectCol.name}`,
        uniqueCount: selectUniqueCount,
      });
    }

    // Checkbox → Donut Yes/No
    if (checkboxCol) {
      suggestions.push({
        score: 4,
        sheetId: sheet.id,
        chartType: 'donut',
        config: {
          xColumnId: checkboxCol.id,
          xColumnName: checkboxCol.name,
          aggFunction: 'count',
          sortBy: 'value_desc',
        },
        title: `${sheet.name}: ${checkboxCol.name}`,
        uniqueCount: 2,
      });
    }

    // Number column → KPI stat
    if (numberCol) {
      suggestions.push({
        score: 3,
        sheetId: sheet.id,
        chartType: 'kpi',
        config: {
          yColumnId: numberCol.id,
          yColumnName: numberCol.name,
          aggFunction: 'sum',
        },
        title: `${sheet.name}: Total ${numberCol.name}`,
        uniqueCount: 0,
      });
    }
  }

  // Sort by score desc, take top 6, max 2 per sheet
  suggestions.sort((a, b) => b.score - a.score);

  const picked: ChartSuggestion[] = [];
  const perSheet = new Map<string, number>();

  for (const s of suggestions) {
    if (picked.length >= 6) break;
    const count = perSheet.get(s.sheetId) ?? 0;
    if (count >= 2) continue;
    picked.push(s);
    perSheet.set(s.sheetId, count + 1);
  }

  // Variety pass: if >2 of the same chart type, demote duplicates
  const typeCounts = new Map<ChartType, number>();
  for (const s of picked) {
    typeCounts.set(s.chartType, (typeCounts.get(s.chartType) ?? 0) + 1);
  }

  for (const [type, count] of typeCounts) {
    if (count <= 2) continue;
    // Find alternatives from unpicked suggestions
    const alternatives = suggestions.filter(
      s => !picked.includes(s) && s.chartType !== type
    );
    let excess = count - 2;
    for (let i = picked.length - 1; i >= 0 && excess > 0; i--) {
      if (picked[i].chartType !== type) continue;
      const alt = alternatives.shift();
      if (alt) {
        picked[i] = alt;
        excess--;
      }
    }
  }

  return picked;
}

export function suggestionsToWidgets(
  suggestions: ChartSuggestion[],
  userId: string,
): Omit<DashboardWidget, 'id' | 'created_at' | 'updated_at'>[] {
  return suggestions.map((s, i) => ({
    title: s.title,
    chart_type: s.chartType,
    source_type: 'single_sheet' as const,
    sheet_id: s.sheetId,
    sheet_group_id: null,
    selected_sheet_ids: [],
    config: s.config,
    color_palette: 'auto',
    grid_span: s.chartType === 'kpi' ? 1 : 1,
    show_legend: s.uniqueCount <= 8,
    show_values: s.uniqueCount <= 8,
    sort_order: i,
    created_by: userId,
  }));
}

export function autoDetectConfig(columns: SheetColumn[]): {
  chartType: ChartType;
  config: WidgetConfig;
  title: string;
} {
  const selectCol = findFirstColumnOfType(columns, ['select']);
  const numberCol = findFirstColumnOfType(columns, ['number']);
  const dateCol = findFirstColumnOfType(columns, ['date', 'datetime']);
  const textCol = findFirstColumnOfType(columns, ['text']);

  if (selectCol && numberCol) {
    return {
      chartType: 'bar',
      config: {
        xColumnId: selectCol.id,
        xColumnName: selectCol.name,
        yColumnId: numberCol.id,
        yColumnName: numberCol.name,
        aggFunction: 'sum',
        sortBy: 'value_desc',
      },
      title: `${numberCol.name} by ${selectCol.name}`,
    };
  }

  if (dateCol && numberCol) {
    return {
      chartType: 'line',
      config: {
        xColumnId: dateCol.id,
        xColumnName: dateCol.name,
        yColumnId: numberCol.id,
        yColumnName: numberCol.name,
        aggFunction: 'sum',
        dateBucket: 'month',
        sortBy: 'category_asc',
      },
      title: `${numberCol.name} over Time`,
    };
  }

  if (selectCol) {
    return {
      chartType: 'bar',
      config: {
        xColumnId: selectCol.id,
        xColumnName: selectCol.name,
        aggFunction: 'count',
        sortBy: 'value_desc',
      },
      title: `Count by ${selectCol.name}`,
    };
  }

  if (textCol) {
    return {
      chartType: 'bar',
      config: {
        xColumnId: textCol.id,
        xColumnName: textCol.name,
        aggFunction: 'count',
        sortBy: 'value_desc',
      },
      title: `Count by ${textCol.name}`,
    };
  }

  return {
    chartType: 'kpi',
    config: { aggFunction: 'count' },
    title: 'Total Rows',
  };
}
