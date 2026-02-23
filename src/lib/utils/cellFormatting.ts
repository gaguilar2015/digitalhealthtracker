import type { CellStyle, ConditionalFormatRule, SheetColumn } from '@/types';

/**
 * Evaluate a single conditional format rule against a cell value.
 */
export function evaluateCondition(
  rule: ConditionalFormatRule,
  cellValue: unknown,
  columnType: SheetColumn['type'],
): boolean {
  const { operator, value, value2 } = rule;
  const isMultiselect = columnType === 'multiselect';
  const isEmpty = isMultiselect
    ? (cellValue === null || cellValue === undefined || (Array.isArray(cellValue) && cellValue.length === 0))
    : (cellValue === null || cellValue === undefined || cellValue === '');

  switch (operator) {
    case 'is_empty':
      return isEmpty;
    case 'is_not_empty':
      return !isEmpty;
    case 'is_true':
      return !!cellValue;
    case 'is_false':
      return !cellValue;
    case 'equals':
      if (columnType === 'number') return Number(cellValue) === Number(value);
      return String(cellValue ?? '') === String(value ?? '');
    case 'not_equals':
      if (columnType === 'number') return Number(cellValue) !== Number(value);
      return String(cellValue ?? '') !== String(value ?? '');
    case 'contains':
      if (isMultiselect) {
        const arr = Array.isArray(cellValue) ? cellValue : [];
        return arr.includes(String(value ?? ''));
      }
      return String(cellValue ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'not_contains':
      if (isMultiselect) {
        const arr = Array.isArray(cellValue) ? cellValue : [];
        return !arr.includes(String(value ?? ''));
      }
      return !String(cellValue ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'greater_than':
      if (isEmpty) return false;
      if (columnType === 'date' || columnType === 'datetime') return String(cellValue) > String(value);
      return Number(cellValue) > Number(value);
    case 'less_than':
      if (isEmpty) return false;
      if (columnType === 'date' || columnType === 'datetime') return String(cellValue) < String(value);
      return Number(cellValue) < Number(value);
    case 'between': {
      if (isEmpty) return false;
      if (columnType === 'date' || columnType === 'datetime') {
        const s = String(cellValue);
        return s >= String(value) && s <= String(value2);
      }
      const n = Number(cellValue);
      return n >= Number(value) && n <= Number(value2);
    }
    default:
      return false;
  }
}

/**
 * Resolve the effective style for a cell by cascading:
 * 1. Column default style
 * 2. Select option style (select columns only)
 * 3. Conditional formatting (first match wins)
 * 4. Per-cell override (highest priority)
 */
export function resolveEffectiveStyle(
  column: SheetColumn,
  cellValue: unknown,
  cellFormat?: CellStyle | null,
): CellStyle {
  const result: CellStyle = {};

  // 1. Column default
  if (column.defaultStyle) {
    Object.assign(result, column.defaultStyle);
  }

  // 2. Select option style
  if (column.type === 'select' && column.optionStyles && cellValue != null && cellValue !== '') {
    const optStyle = column.optionStyles[String(cellValue)];
    if (optStyle) {
      if (optStyle.textColor) result.textColor = optStyle.textColor;
      if (optStyle.backgroundColor) result.backgroundColor = optStyle.backgroundColor;
    }
  }

  // 3. Conditional formatting (first match wins)
  if (column.conditionalRules?.length) {
    for (const rule of column.conditionalRules) {
      if (evaluateCondition(rule, cellValue, column.type)) {
        Object.assign(result, rule.style);
        break;
      }
    }
  }

  // 4. Per-cell override (highest priority)
  if (cellFormat) {
    Object.assign(result, cellFormat);
  }

  return result;
}
