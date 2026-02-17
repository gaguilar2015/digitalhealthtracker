import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Paintbrush, ListFilter } from 'lucide-react';
import { TRACKER_COLUMN_TYPES } from '@/types';
import type { TrackerColumn } from '@/types';
import { ColumnFormatPanel } from './formatting/ColumnFormatPanel';
import { SelectOptionColorsEditor } from './formatting/SelectOptionColorsEditor';
import { ConditionalFormatDialog } from './formatting/ConditionalFormatDialog';

interface ManageColumnsDialogProps {
  open: boolean;
  onClose: () => void;
  columns: TrackerColumn[];
  onSave: (columns: TrackerColumn[]) => Promise<void>;
}

export function ManageColumnsDialog({ open, onClose, columns, onSave }: ManageColumnsDialogProps) {
  const [local, setLocal] = useState<TrackerColumn[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedFormat, setExpandedFormat] = useState<string | null>(null);
  const [conditionalCol, setConditionalCol] = useState<TrackerColumn | null>(null);
  // Raw text for options inputs — avoids split/join round-trip on every keystroke
  const [optionsText, setOptionsText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setLocal(columns.map(c => ({
        ...c,
        options: c.options ? [...c.options] : undefined,
        defaultStyle: c.defaultStyle ? { ...c.defaultStyle } : undefined,
        optionStyles: c.optionStyles ? { ...c.optionStyles } : undefined,
        conditionalRules: c.conditionalRules ? [...c.conditionalRules] : undefined,
      })));
      // Initialize raw text from existing options
      const text: Record<string, string> = {};
      for (const c of columns) {
        if (c.options) text[c.id] = c.options.join(', ');
      }
      setOptionsText(text);
    }
  }, [open, columns]);

  const updateCol = (index: number, updates: Partial<TrackerColumn>) => {
    setLocal(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const addCol = () => {
    setLocal(prev => [...prev, { id: crypto.randomUUID(), name: '', type: 'text' as const }]);
  };

  const removeCol = (index: number) => {
    if (local.length <= 1) return;
    setLocal(prev => prev.filter((_, i) => i !== index));
  };

  const moveCol = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= local.length) return;
    setLocal(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Parse any unparsed options text (in case user clicks Save without blurring the input)
      const cleaned = local.map(c => {
        const raw = optionsText[c.id];
        if (raw !== undefined && (c.type === 'select' || c.type === 'multiselect')) {
          return { ...c, options: raw.split(',').map(s => s.trim()).filter(Boolean) };
        }
        return c;
      });
      await onSave(cleaned);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleConditionalSave = (col: TrackerColumn) => {
    setLocal(prev => prev.map(c => c.id === col.id ? col : c));
    setConditionalCol(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Columns</h3>

        <div className="space-y-3">
          {local.map((col, index) => (
            <div key={col.id} className="p-3 bg-surface-50 rounded-xl">
              <div className="flex gap-2 items-start">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveCol(index, -1)}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-surface-200 text-gray-400 disabled:opacity-20"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCol(index, 1)}
                    disabled={index === local.length - 1}
                    className="p-0.5 rounded hover:bg-surface-200 text-gray-400 disabled:opacity-20"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={col.name}
                      onChange={e => updateCol(index, { name: e.target.value })}
                      placeholder="Column name"
                      className="flex-1 px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                    />
                    <select
                      value={col.type}
                      onChange={e => {
                        const newType = e.target.value as TrackerColumn['type'];
                        const updates: Partial<TrackerColumn> = { type: newType };
                        // Clear conditional rules when type changes
                        if (newType !== col.type) updates.conditionalRules = undefined;
                        updateCol(index, updates);
                      }}
                      className="px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                    >
                      {TRACKER_COLUMN_TYPES.map(t => (
                        <option key={t} value={t}>{t === 'multiselect' ? 'Multiselect' : t === 'datetime' ? 'Date & Time' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={60}
                      step={10}
                      value={col.width ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        updateCol(index, { width: val === '' ? undefined : Math.max(60, Number(val)) });
                      }}
                      placeholder="Auto"
                      title="Column width in pixels (min 60)"
                      className="w-20 px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                  {(col.type === 'select' || col.type === 'multiselect') && (
                    <input
                      value={optionsText[col.id] ?? ''}
                      onChange={e => setOptionsText(prev => ({ ...prev, [col.id]: e.target.value }))}
                      onBlur={() => {
                        const parsed = (optionsText[col.id] ?? '').split(',').map(s => s.trim()).filter(Boolean);
                        updateCol(index, { options: parsed });
                        setOptionsText(prev => ({ ...prev, [col.id]: parsed.join(', ') }));
                      }}
                      placeholder="Options (comma-separated)"
                      className="w-full px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                    />
                  )}

                  {/* Formatting & Rules buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setExpandedFormat(expandedFormat === col.id ? null : col.id)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                        expandedFormat === col.id ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-surface-100'
                      }`}
                    >
                      <Paintbrush className="w-3 h-3" />
                      Format
                      <ChevronRight className={`w-3 h-3 transition-transform ${expandedFormat === col.id ? 'rotate-90' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConditionalCol(col)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:bg-surface-100 rounded-lg transition-colors"
                    >
                      <ListFilter className="w-3 h-3" />
                      Rules
                      {(col.conditionalRules?.length ?? 0) > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-primary-100 text-primary-700 rounded-full">
                          {col.conditionalRules!.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Expanded format panel */}
                  {expandedFormat === col.id && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Default Style</p>
                      <ColumnFormatPanel
                        style={col.defaultStyle}
                        onChange={s => updateCol(index, { defaultStyle: s })}
                      />
                      {(col.type === 'select' || col.type === 'multiselect') && (() => {
                        const opts = (col.options ?? []).filter(Boolean);
                        return opts.length > 0 && (
                          <>
                            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-2">Option Colors</p>
                            <SelectOptionColorsEditor
                              options={opts}
                              optionStyles={col.optionStyles ?? {}}
                              onChange={styles => updateCol(index, { optionStyles: styles })}
                            />
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeCol(index)}
                  disabled={local.length <= 1}
                  className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed mt-0.5"
                  title={local.length <= 1 ? 'Must have at least one column' : 'Delete column (removes data from all rows)'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCol}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>

        <p className="mt-3 text-xs text-gray-400">
          Deleting a column will remove its data from all existing rows.
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || local.some(c => !c.name.trim())}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Columns'}
          </button>
        </div>
      </div>

      {/* Conditional Format Dialog */}
      {conditionalCol && (
        <ConditionalFormatDialog
          open={!!conditionalCol}
          onClose={() => setConditionalCol(null)}
          column={conditionalCol}
          onSave={handleConditionalSave}
        />
      )}
    </div>
  );
}
