import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { TrackerColumn, ConditionalFormatRule } from '@/types';
import { ConditionalRuleRow } from './ConditionalRuleRow';

interface ConditionalFormatDialogProps {
  open: boolean;
  onClose: () => void;
  column: TrackerColumn;
  onSave: (column: TrackerColumn) => void;
}

export function ConditionalFormatDialog({ open, onClose, column, onSave }: ConditionalFormatDialogProps) {
  const [rules, setRules] = useState<ConditionalFormatRule[]>([]);

  useEffect(() => {
    if (open) {
      setRules((column.conditionalRules ?? []).map(r => ({ ...r, style: { ...r.style } })));
    }
  }, [open, column]);

  const addRule = () => {
    const defaultOp = column.type === 'checkbox' ? 'is_true' as const : 'equals' as const;
    setRules(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        operator: defaultOp,
        style: {},
      },
    ]);
  };

  const updateRule = (index: number, rule: ConditionalFormatRule) => {
    setRules(prev => prev.map((r, i) => i === index ? rule : r));
  };

  const deleteRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  const moveRule = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rules.length) return;
    setRules(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = () => {
    onSave({ ...column, conditionalRules: rules.length > 0 ? rules : undefined });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">Conditional Formatting</h3>
        <p className="text-sm text-gray-500 mb-4">
          Column: <span className="font-medium text-gray-700">{column.name}</span> ({column.type})
        </p>

        <p className="text-xs text-gray-400 mb-3">
          Rules are evaluated top to bottom. The first matching rule&apos;s style is applied.
        </p>

        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={rule.id} className="relative">
              {index > 0 && (
                <div className="flex gap-1 mb-1">
                  <button
                    type="button"
                    onClick={() => moveRule(index, -1)}
                    className="text-[10px] text-gray-400 hover:text-primary-600 px-1"
                  >
                    Move up
                  </button>
                </div>
              )}
              <ConditionalRuleRow
                rule={rule}
                columnType={column.type}
                options={column.options}
                onChange={r => updateRule(index, r)}
                onDelete={() => deleteRule(index)}
              />
            </div>
          ))}
        </div>

        {rules.length === 0 && (
          <div className="py-4 text-center text-sm text-gray-400">
            No conditional rules yet.
          </div>
        )}

        <button
          type="button"
          onClick={addRule}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700"
          >
            Save Rules
          </button>
        </div>
      </div>
    </div>
  );
}
