import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { DiagramLegendItem } from '@/types';

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F97316', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#06B6D4',
];

interface LegendEditorProps {
  open: boolean;
  onClose: () => void;
  items: DiagramLegendItem[];
  onSave: (items: DiagramLegendItem[]) => Promise<void>;
}

export function LegendEditor({ open, onClose, items, onSave }: LegendEditorProps) {
  const [entries, setEntries] = useState<DiagramLegendItem[]>(items);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setEntries(items);
  }, [open, items]);

  const handleAdd = () => {
    setEntries(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length],
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(entries.filter(e => e.label.trim()));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Legend</h3>

        <div className="space-y-3">
          {entries.map((entry, i) => (
            <div key={entry.id} className="flex gap-2 items-start p-3 bg-surface-50 rounded-xl">
              <input
                type="color"
                value={entry.color}
                onChange={e => {
                  const updated = [...entries];
                  updated[i] = { ...updated[i], color: e.target.value };
                  setEntries(updated);
                }}
                className="w-8 h-8 rounded border border-surface-200 cursor-pointer shrink-0 mt-0.5"
              />
              <div className="flex-1 space-y-1.5">
                <input
                  value={entry.label}
                  onChange={e => {
                    const updated = [...entries];
                    updated[i] = { ...updated[i], label: e.target.value };
                    setEntries(updated);
                  }}
                  placeholder="Label"
                  className="w-full px-2 py-1.5 text-sm border border-surface-200 rounded-lg"
                />
                <input
                  value={entry.description ?? ''}
                  onChange={e => {
                    const updated = [...entries];
                    updated[i] = { ...updated[i], description: e.target.value || undefined };
                    setEntries(updated);
                  }}
                  placeholder="Description (optional)"
                  className="w-full px-2 py-1.5 text-xs border border-surface-200 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={() => setEntries(prev => prev.filter((_, j) => j !== i))}
                className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600 mt-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Legend'}
          </button>
        </div>
      </div>
    </div>
  );
}
