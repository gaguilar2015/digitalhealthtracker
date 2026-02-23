import { WORKSTREAM_COLOR_HEX } from './colors';
import type { SheetColumn } from '@/types';

const SERIES_PALETTE = Object.values(WORKSTREAM_COLOR_HEX);

const TEAL_GRADIENT = [
  '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4',
  '#0f766e', '#115e59', '#134e4a', '#0d9488', '#14b8a6',
];

const PASTEL_PALETTE = [
  '#93c5fd', '#86efac', '#fde68a', '#fca5a5', '#c4b5fd',
  '#fbcfe8', '#a5b4fc', '#d1d5db', '#99f6e4', '#fdba74',
];

export function getSeriesColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(SERIES_PALETTE[i % SERIES_PALETTE.length]);
  }
  return colors;
}

export function getSingleSeriesColor(index: number): string {
  return TEAL_GRADIENT[index % TEAL_GRADIENT.length];
}

export function getPieColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(PASTEL_PALETTE[i % PASTEL_PALETTE.length]);
  }
  return colors;
}

export function getOptionColors(column: SheetColumn | undefined, categories: string[]): string[] | null {
  if (!column?.optionStyles) return null;
  const colors: string[] = [];
  let hasAny = false;
  for (const cat of categories) {
    const style = column.optionStyles[cat];
    if (style?.backgroundColor) {
      colors.push(style.backgroundColor);
      hasAny = true;
    } else {
      colors.push(TEAL_GRADIENT[colors.length % TEAL_GRADIENT.length]);
    }
  }
  return hasAny ? colors : null;
}

export const KPI_GRADIENT = 'linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)';
