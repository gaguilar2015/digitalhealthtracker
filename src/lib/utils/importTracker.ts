import * as XLSX from 'xlsx';
import type { TrackerColumn, TrackerColumnType, CreateTrackerRow } from '@/types';

interface ParsedFile {
  sheetNames: string[];
  workbook: XLSX.WorkBook;
}

interface SheetData {
  headers: string[];
  rows: unknown[][];
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  return { sheetNames: workbook.SheetNames, workbook };
}

export function getSheetData(workbook: XLSX.WorkBook, sheetName: string): SheetData {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  if (raw.length === 0) return { headers: [], rows: [] };

  const headerRow = raw[0] as string[];
  const headers = headerRow.map(h => (h == null ? '' : String(h).trim()));
  const rows = raw.slice(1);

  return { headers, rows };
}

export function inferColumns(headers: string[], rows: unknown[][]): TrackerColumn[] {
  // Deduplicate / auto-name empty headers
  const usedNames = new Map<string, number>();
  const cleanHeaders = headers.map((h, i) => {
    let name = h || `Column ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`;
    const lower = name.toLowerCase();
    const count = usedNames.get(lower) ?? 0;
    if (count > 0) {
      name = `${name} (${count + 1})`;
    }
    usedNames.set(lower, count + 1);
    return name;
  });

  return cleanHeaders.map((name, colIndex) => {
    const values = rows
      .map(row => {
        const cell = (row as unknown[])[colIndex];
        return cell == null ? '' : String(cell).trim();
      })
      .filter(v => v !== '');

    const sample = values.slice(0, 50);
    const type = inferType(sample);

    const col: TrackerColumn = {
      id: crypto.randomUUID(),
      name,
      type,
    };

    if (type === 'select') {
      const distinct = [...new Set(sample)];
      col.options = distinct.sort();
    }

    return col;
  });
}

function inferType(sample: string[]): TrackerColumnType {
  if (sample.length === 0) return 'text';

  // Check checkbox: all values must be boolean-like
  const boolValues = new Set(['true', 'false', 'yes', 'no', '1', '0']);
  if (sample.every(v => boolValues.has(v.toLowerCase()))) {
    return 'checkbox';
  }

  // Check number: 80%+ parse as finite numbers
  const numCount = sample.filter(v => {
    const cleaned = v.replace(/,/g, '');
    return cleaned !== '' && isFinite(Number(cleaned));
  }).length;
  if (numCount / sample.length >= 0.8) {
    return 'number';
  }

  // Check date: 80%+ parse as valid dates
  const dateCount = sample.filter(v => isDateValue(v)).length;
  if (dateCount / sample.length >= 0.8) {
    return 'date';
  }

  // Check select: <=10 distinct values AND row count >= 3x distinct
  const distinct = new Set(sample);
  if (distinct.size <= 10 && sample.length >= 3 * distinct.size) {
    return 'select';
  }

  return 'text';
}

function isDateValue(value: string): boolean {
  // Excel serial date (number between ~1 and ~60000)
  const num = Number(value);
  if (!isNaN(num) && num > 0 && num < 100000 && Number.isInteger(num) || (num > 0 && num < 100000 && value.includes('.'))) {
    return false; // Don't confuse plain numbers with dates
  }

  // ISO format: 2026-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return !isNaN(Date.parse(value));
  }

  // US format: 01/15/2026 or 1/15/2026
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
    return !isNaN(Date.parse(value));
  }

  // EU format: 15-01-2026 or 15.01.2026
  if (/^\d{1,2}[-\.]\d{1,2}[-\.]\d{2,4}$/.test(value)) {
    const parts = value.split(/[-\.]/);
    const rearranged = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    return !isNaN(Date.parse(rearranged));
  }

  // Month name formats: "Jan 15, 2026" etc.
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) {
    // Only accept if the string looks date-like (has month name or slashes)
    return /[a-zA-Z]/.test(value) || /\//.test(value);
  }

  return false;
}

export function convertCellValue(rawValue: unknown, type: TrackerColumnType): unknown {
  if (rawValue == null) return null;
  const str = String(rawValue).trim();
  if (str === '') return null;

  switch (type) {
    case 'checkbox': {
      const lower = str.toLowerCase();
      return lower === 'true' || lower === 'yes' || lower === '1';
    }
    case 'number': {
      const cleaned = str.replace(/,/g, '');
      const num = Number(cleaned);
      return isFinite(num) ? num : null;
    }
    case 'date': {
      // ISO
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.slice(0, 10);
      }
      // US format
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      // EU format
      if (/^\d{1,2}[-\.]\d{1,2}[-\.]\d{2,4}$/.test(str)) {
        const parts = str.split(/[-\.]/);
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      // Fallback parse
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      return str;
    }
    case 'select':
    case 'text':
    default:
      return str;
  }
}

export function buildTrackerRows(
  rows: unknown[][],
  columns: TrackerColumn[],
  userId: string,
  trackerId: string,
): CreateTrackerRow[] {
  const result: CreateTrackerRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as unknown[];

    // Skip completely empty rows
    const hasData = row.some(cell => cell != null && String(cell).trim() !== '');
    if (!hasData) continue;

    const cells: Record<string, unknown> = {};
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j];
      const raw = row[j];
      const value = convertCellValue(raw, col.type);
      if (value !== null) {
        cells[col.id] = value;
      }
    }

    result.push({
      tracker_id: trackerId,
      cells,
      sort_order: result.length,
      created_by: userId,
    });
  }

  return result;
}
