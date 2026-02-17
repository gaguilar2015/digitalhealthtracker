import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Check, X } from 'lucide-react';
import type { TrackerColumn, CellStyle } from '@/types';
import { SelectOptionBadge } from './formatting/SelectOptionBadge';
import { MultiSelectDropdown } from './MultiSelectDropdown';

/** Coerce a cell value to the expected format for the column type */
function coerceValue(value: unknown, type: string): unknown {
  if (type === 'multiselect') {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string' && value !== '') return [value];
    return [];
  }
  if (type === 'select') {
    if (Array.isArray(value)) return (value as string[])[0] ?? null;
    return value;
  }
  return value;
}

interface TrackerCellProps {
  column: TrackerColumn;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  effectiveStyle?: CellStyle;
  selected?: boolean;
  onSelect?: () => void;
}

export const TrackerCell = memo(function TrackerCell({
  column, value, onChange, readOnly, effectiveStyle, selected, onSelect,
}: TrackerCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftMulti, setDraftMulti] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const startEdit = () => {
    if (readOnly || column.type === 'checkbox') return;
    if (column.type === 'multiselect') {
      const coerced = coerceValue(value, 'multiselect') as string[];
      const validOptions = new Set(column.options ?? []);
      setDraftMulti(coerced.filter(v => validOptions.has(v)));
    } else {
      const selectVal = column.type === 'select' ? coerceValue(value, 'select') : value;
      setDraft(selectVal != null ? String(selectVal) : '');
    }
    setEditing(true);
  };

  const save = () => {
    setEditing(false);
    if (column.type === 'multiselect') {
      const newVal = draftMulti.length > 0 ? draftMulti : null;
      const oldArr = coerceValue(value, 'multiselect') as string[];
      const changed = draftMulti.length !== oldArr.length || draftMulti.some((v, i) => v !== oldArr[i]);
      if (changed) onChange(newVal);
      return;
    }
    let parsed: unknown = draft;
    if (column.type === 'number') {
      parsed = draft === '' ? null : Number(draft);
    } else if (draft === '') {
      parsed = null;
    }
    if (parsed !== value) {
      onChange(parsed);
    }
  };

  const cancel = () => setEditing(false);

  const handleMultiClose = useCallback(() => {
    setEditing(false);
    const newVal = draftMulti.length > 0 ? draftMulti : null;
    const oldArr = coerceValue(value, 'multiselect') as string[];
    const changed = draftMulti.length !== oldArr.length || draftMulti.some((v, i) => v !== oldArr[i]);
    if (changed) onChange(newVal);
  }, [draftMulti, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  };

  // Build inline style from effectiveStyle
  const cellInlineStyle: React.CSSProperties = {};
  if (effectiveStyle) {
    if (effectiveStyle.bold) cellInlineStyle.fontWeight = 'bold';
    if (effectiveStyle.italic) cellInlineStyle.fontStyle = 'italic';
    if (effectiveStyle.textColor) cellInlineStyle.color = effectiveStyle.textColor;
    if (effectiveStyle.backgroundColor && effectiveStyle.backgroundColor !== 'transparent') {
      cellInlineStyle.backgroundColor = effectiveStyle.backgroundColor;
    }
    if (effectiveStyle.textAlign) cellInlineStyle.textAlign = effectiveStyle.textAlign;
  }

  const selectionRing = selected ? 'ring-2 ring-primary-400 ring-inset' : '';

  // Checkbox: toggle on click
  if (column.type === 'checkbox') {
    return (
      <td
        className={`px-3 py-2 text-sm ${selectionRing}`}
        style={cellInlineStyle}
        onClick={onSelect}
      >
        <button
          type="button"
          onClick={e => { e.stopPropagation(); if (!readOnly) onChange(!value); }}
          disabled={readOnly}
          className="flex items-center justify-center w-5 h-5 rounded border border-surface-200 transition-colors disabled:opacity-50"
          style={value ? { backgroundColor: '#3B82F6', borderColor: '#3B82F6' } : undefined}
        >
          {!!value && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
      </td>
    );
  }

  // Multiselect display mode
  if (column.type === 'multiselect' && !editing) {
    const raw = coerceValue(value, 'multiselect') as string[];
    const validOptions = new Set(column.options ?? []);
    const arr = raw.filter(v => validOptions.has(v));
    const isWrap = effectiveStyle?.overflow === 'wrap';
    return (
      <td
        className={`px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-surface-50 ${selectionRing}`}
        style={cellInlineStyle}
        onClick={() => {
          if (onSelect) onSelect();
          startEdit();
        }}
      >
        {arr.length === 0 ? (
          <span className="text-gray-400">—</span>
        ) : (
          <div className={`flex gap-1 ${isWrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
            {arr.map(v => (
              <SelectOptionBadge
                key={v}
                value={v}
                style={column.optionStyles?.[v]}
              />
            ))}
          </div>
        )}
      </td>
    );
  }

  // Display mode
  if (!editing) {
    const isSelect = column.type === 'select';
    const displayValue = isSelect ? coerceValue(value, 'select') : value;
    const hasOptionStyle = isSelect && column.optionStyles && displayValue != null && displayValue !== '';
    const isWrap = effectiveStyle?.overflow === 'wrap';

    return (
      <td
        className={`px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-surface-50 ${selectionRing}`}
        style={cellInlineStyle}
        onClick={() => {
          if (onSelect) onSelect();
          startEdit();
        }}
      >
        <div className={isWrap ? 'whitespace-normal break-words' : 'truncate'}>
          {isSelect && hasOptionStyle ? (
            <SelectOptionBadge
              value={String(displayValue)}
              style={column.optionStyles![String(displayValue)]}
            />
          ) : (
            formatDisplay(column, isSelect ? displayValue : value)
          )}
        </div>
      </td>
    );
  }

  // Save/cancel action buttons — use onMouseDown+preventDefault so they fire before input onBlur
  const actionButtons = (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); save(); }}
        className="p-0.5 rounded hover:bg-green-50 text-green-600"
        title="Save"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); cancel(); }}
        className="p-0.5 rounded hover:bg-red-50 text-red-500"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // Multiselect edit mode
  if (column.type === 'multiselect') {
    return (
      <td className={`px-1 py-1 relative ${selectionRing}`} style={cellInlineStyle}>
        <MultiSelectDropdown
          options={column.options ?? []}
          selected={draftMulti}
          optionStyles={column.optionStyles}
          onChange={setDraftMulti}
          onSave={handleMultiClose}
          onCancel={cancel}
        />
      </td>
    );
  }

  // Edit mode
  if (column.type === 'select') {
    return (
      <td className={`px-1 py-1 ${selectionRing}`} style={cellInlineStyle}>
        <div className="flex items-center gap-0.5">
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={draft}
            onChange={e => { setDraft(e.target.value); }}
            onBlur={save}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-primary-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">—</option>
            {column.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {actionButtons}
        </div>
      </td>
    );
  }

  return (
    <td className={`px-1 py-1 ${selectionRing}`} style={cellInlineStyle}>
      <div className="flex items-center gap-0.5">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : column.type === 'datetime' ? 'datetime-local' : 'text'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-primary-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {actionButtons}
      </div>
    </td>
  );
});

function formatDisplay(column: TrackerColumn, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (column.type === 'date' && typeof value === 'string') {
    try {
      return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch { return String(value); }
  }
  if (column.type === 'datetime' && typeof value === 'string') {
    try {
      return new Date(value).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
    } catch { return String(value); }
  }
  return String(value);
}
