import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Tracker, TrackerRow, TrackerRowGroup } from '@/types';

export function exportTrackerToExcel(tracker: Tracker, rows: TrackerRow[]) {
  const wb = XLSX.utils.book_new();

  const headers = tracker.columns.map(c => c.name);
  const groupByCol = tracker.group_by_column;
  const manualGroups = tracker.row_groups ?? [];
  const isAutoGroup = !!groupByCol;
  const hasManualGroups = manualGroups.length > 0 && !isAutoGroup;
  const isGrouped = isAutoGroup || hasManualGroups;

  const sheetData: (string | number)[][] = [headers];

  if (isGrouped) {
    const sections = buildGroupSections(tracker, rows, isAutoGroup, manualGroups);
    for (const section of sections) {
      // Group header row
      sheetData.push([section.name, ...Array(headers.length - 1).fill('')]);
      for (const row of section.rows) {
        sheetData.push(buildRowData(tracker, row));
      }
    }
  } else {
    for (const row of rows) {
      sheetData.push(buildRowData(tracker, row));
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet['!cols'] = tracker.columns.map(() => ({ wch: 20 }));

  // Bold group header rows (if grouped)
  if (isGrouped) {
    let rowIdx = 1; // skip header
    const sections = buildGroupSections(tracker, rows, isAutoGroup, manualGroups);
    for (const section of sections) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
      if (!sheet[cellRef]) sheet[cellRef] = { t: 's', v: section.name };
      sheet[cellRef].s = { font: { bold: true } };
      rowIdx += 1 + section.rows.length;
    }
  }

  XLSX.utils.book_append_sheet(wb, sheet, 'Data');

  const fileName = `${tracker.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function buildRowData(tracker: Tracker, row: TrackerRow): string[] {
  return tracker.columns.map(col => {
    const val = row.cells[col.id];
    if (val === undefined || val === null) return '';
    if (col.type === 'checkbox') return val ? 'Yes' : 'No';
    if (col.type === 'multiselect') return Array.isArray(val) ? val.join(', ') : String(val ?? '');
    if (col.type === 'datetime' && typeof val === 'string') {
      // Format "2026-02-10T14:30" as "Feb 10, 2026, 2:30 PM"
      try {
        return new Date(val).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true,
        });
      } catch { return String(val); }
    }
    return String(val);
  });
}

interface GroupSection {
  name: string;
  rows: TrackerRow[];
}

function buildGroupSections(
  tracker: Tracker,
  rows: TrackerRow[],
  isAutoGroup: boolean,
  manualGroups: TrackerRowGroup[],
): GroupSection[] {
  if (isAutoGroup && tracker.group_by_column) {
    const colId = tracker.group_by_column;
    const map = new Map<string, TrackerRow[]>();
    const ungrouped: TrackerRow[] = [];

    for (const row of rows) {
      const val = row.cells[colId];
      if (val == null || val === '') {
        ungrouped.push(row);
      } else {
        const key = String(val);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row);
      }
    }

    const sections: GroupSection[] = [];
    for (const [key, groupRows] of map) {
      sections.push({ name: key, rows: groupRows });
    }
    sections.sort((a, b) => a.name.localeCompare(b.name));
    if (ungrouped.length > 0) {
      sections.push({ name: 'Ungrouped', rows: ungrouped });
    }
    return sections;
  }

  // Manual groups
  const sorted = [...manualGroups].sort((a, b) => a.sort_order - b.sort_order);
  const map = new Map<string, TrackerRow[]>();
  const ungrouped: TrackerRow[] = [];
  for (const g of sorted) map.set(g.id, []);

  for (const row of rows) {
    if (row.group_id && map.has(row.group_id)) {
      map.get(row.group_id)!.push(row);
    } else {
      ungrouped.push(row);
    }
  }

  const sections: GroupSection[] = sorted.map(g => ({
    name: g.name,
    rows: map.get(g.id) ?? [],
  }));
  if (ungrouped.length > 0) {
    sections.push({ name: 'Ungrouped', rows: ungrouped });
  }
  return sections;
}
