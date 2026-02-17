// Universal style applied to any cell
export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  textColor?: string;       // hex e.g. '#DC2626'
  backgroundColor?: string; // hex e.g. '#FEF3C7'
  textAlign?: 'left' | 'center' | 'right';
  overflow?: 'truncate' | 'wrap';
}

// Select option color (subset of CellStyle)
export interface SelectOptionStyle {
  textColor?: string;
  backgroundColor?: string;
}

// Conditional formatting rule (stored per-column)
export type ConditionalOperator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'greater_than' | 'less_than' | 'between'
  | 'is_empty' | 'is_not_empty'
  | 'is_true' | 'is_false';

export interface ConditionalFormatRule {
  id: string;
  operator: ConditionalOperator;
  value?: unknown;
  value2?: unknown;        // for 'between'
  style: CellStyle;
}

// Manual row group definition (stored on tracker)
export interface TrackerRowGroup {
  id: string;
  name: string;
  color?: string;
  sort_order: number;
}

// Preset color palettes
export const FORMAT_TEXT_COLORS = [
  '#111827', '#DC2626', '#D97706', '#059669',
  '#2563EB', '#7C3AED', '#DB2777', '#FFFFFF',
] as const;

export const FORMAT_BG_COLORS = [
  'transparent', '#FEF2F2', '#FEF3C7', '#D1FAE5',
  '#DBEAFE', '#EDE9FE', '#FCE7F3', '#F3F4F6',
  '#DC2626', '#D97706', '#059669', '#2563EB',
] as const;

export const SELECT_OPTION_COLORS = [
  { bg: '#DBEAFE', text: '#1E40AF' },
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#FEE2E2', text: '#991B1B' },
  { bg: '#EDE9FE', text: '#5B21B6' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#E0E7FF', text: '#3730A3' },
  { bg: '#F3F4F6', text: '#374151' },
  { bg: '#CCFBF1', text: '#115E59' },
  { bg: '#FED7AA', text: '#9A3412' },
] as const;
