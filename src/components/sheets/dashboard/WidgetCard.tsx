import { Pencil, Trash2 } from 'lucide-react';
import type { DashboardWidget, Sheet, SheetRow } from '@/types';
import { ChartRenderer } from './ChartRenderer';

interface WidgetCardProps {
  widget: DashboardWidget;
  sheets: Sheet[];
  rowsBySheet: Map<string, SheetRow[]>;
  onEdit: (widget: DashboardWidget) => void;
  onDelete: (widget: DashboardWidget) => void;
  canModify: boolean;
}

export function WidgetCard({ widget, sheets, rowsBySheet, onEdit, onDelete, canModify }: WidgetCardProps) {
  return (
    <div
      className={`group relative bg-white rounded-xl shadow-sm border border-surface-200 p-4 hover:shadow-md transition-shadow ${
        widget.grid_span === 2 ? 'lg:col-span-2' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 truncate">{widget.title}</h3>
        {canModify && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(widget)}
              className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(widget)}
              className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-64">
        <ChartRenderer widget={widget} sheets={sheets} rowsBySheet={rowsBySheet} />
      </div>
    </div>
  );
}
