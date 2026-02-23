import { GripVertical, Trash2, MessageCircle } from 'lucide-react';
import { SheetCell } from './SheetCell';
import type { SheetColumn, SheetRow, CellStyle } from '@/types';

export interface SheetRowComponentProps {
  row: SheetRow;
  index: number;
  columns: SheetColumn[];
  readOnly: boolean;
  effectiveStyles: Record<string, Record<string, CellStyle>>;
  selectedCell: { rowId: string; colId: string } | null;
  onSelectCell: (cell: { rowId: string; colId: string } | null) => void;
  onCellChange: (rowId: string, columnId: string, value: unknown) => void;
  onDeleteRow: (rowId: string) => void;
  dragEnabled: boolean;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
  commentCount?: number;
  onOpenComments?: () => void;
}

/**
 * Renders the <td> cells for a sheet row.
 * Must be placed inside a <tr> element.
 */
export function SheetRowComponent({
  row,
  index,
  columns,
  readOnly,
  effectiveStyles,
  selectedCell,
  onSelectCell,
  onCellChange,
  onDeleteRow,
  dragEnabled,
  dragHandleProps,
  commentCount = 0,
  onOpenComments,
}: SheetRowComponentProps) {
  return (
    <>
      <td className="px-3 py-2 text-xs text-gray-400 w-10">
        <div className="flex items-center gap-1">
          {dragEnabled && (
            <button
              className="drag-handle p-0.5 -ml-1 cursor-grab text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 touch-none transition-opacity"
              onClick={e => e.stopPropagation()}
              {...dragHandleProps}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          {!dragEnabled && dragHandleProps === undefined && (
            <span className="w-3.5" />
          )}
          <span className="relative">
            {index + 1}
            {commentCount > 0 && (
              <span className="absolute -top-1 -right-2 w-[7px] h-[7px] rounded-full bg-primary-500" />
            )}
          </span>
          {onOpenComments && (
            <button
              onClick={e => { e.stopPropagation(); onOpenComments(); }}
              className="p-0.5 rounded hover:bg-surface-100 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title={commentCount > 0 ? `${commentCount} comment${commentCount > 1 ? 's' : ''}` : 'Add comment'}
            >
              <MessageCircle className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>
      {columns.map(col => (
        <SheetCell
          key={col.id}
          column={col}
          value={row.cells[col.id]}
          onChange={val => onCellChange(row.id, col.id, val)}
          readOnly={readOnly}
          effectiveStyle={effectiveStyles[row.id]?.[col.id]}
          selected={selectedCell?.rowId === row.id && selectedCell?.colId === col.id}
          onSelect={() => onSelectCell({ rowId: row.id, colId: col.id })}
        />
      ))}
      {!readOnly && (
        <td className="px-2 py-2">
          <button
            onClick={() => onDeleteRow(row.id)}
            className="p-1 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
    </>
  );
}
