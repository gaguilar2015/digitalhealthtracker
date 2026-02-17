import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import type { Tracker, TrackerColumn, TrackerRowGroup } from '@/types';

interface ManageGroupsDialogProps {
  open: boolean;
  onClose: () => void;
  tracker: Tracker;
  columns: TrackerColumn[];
  onSave: (data: { row_groups?: TrackerRowGroup[]; group_by_column?: string | null; auto_group_order?: string[] }) => Promise<void>;
}

export function ManageGroupsDialog({ open, onClose, tracker, columns, onSave }: ManageGroupsDialogProps) {
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [groups, setGroups] = useState<TrackerRowGroup[]>([]);
  const [autoColumn, setAutoColumn] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const hasAuto = !!tracker.group_by_column;
      setMode(hasAuto ? 'auto' : 'manual');
      setGroups((tracker.row_groups ?? []).map(g => ({ ...g })));
      setAutoColumn(tracker.group_by_column ?? null);
    }
  }, [open, tracker]);

  const addGroup = () => {
    setGroups(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        sort_order: prev.length,
      },
    ]);
  };

  const updateGroup = (index: number, updates: Partial<TrackerRowGroup>) => {
    setGroups(prev => prev.map((g, i) => i === index ? { ...g, ...updates } : g));
  };

  const removeGroup = (index: number) => {
    setGroups(prev => prev.filter((_, i) => i !== index));
  };

  const moveGroup = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= groups.length) return;
    setGroups(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((g, i) => ({ ...g, sort_order: i }));
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'auto') {
        await onSave({ group_by_column: autoColumn, row_groups: [] });
      } else {
        await onSave({
          row_groups: groups.map((g, i) => ({ ...g, sort_order: i })),
          group_by_column: null,
          auto_group_order: [],
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClearGroups = async () => {
    setSaving(true);
    try {
      await onSave({ row_groups: [], group_by_column: null, auto_group_order: [] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Count unique values for auto-group warning
  const autoCol = autoColumn ? columns.find(c => c.id === autoColumn) : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Row Groups</h3>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              mode === 'manual' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-600 hover:bg-surface-100'
            }`}
          >
            Manual Groups
          </button>
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              mode === 'auto' ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-600 hover:bg-surface-100'
            }`}
          >
            Auto-Group by Column
          </button>
        </div>

        {mode === 'manual' ? (
          <>
            <div className="space-y-2">
              {groups.map((g, index) => (
                <div key={g.id} className="flex gap-2 items-center p-2 bg-surface-50 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveGroup(index, -1)}
                      disabled={index === 0}
                      className="p-0.5 rounded hover:bg-surface-200 text-gray-400 disabled:opacity-20"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveGroup(index, 1)}
                      disabled={index === groups.length - 1}
                      className="p-0.5 rounded hover:bg-surface-200 text-gray-400 disabled:opacity-20"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="color"
                    value={g.color ?? '#3B82F6'}
                    onChange={e => updateGroup(index, { color: e.target.value })}
                    className="w-7 h-7 rounded border border-surface-200 cursor-pointer p-0.5"
                    title="Group color"
                  />
                  <input
                    value={g.name}
                    onChange={e => updateGroup(index, { name: e.target.value })}
                    placeholder="Group name"
                    className="flex-1 px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeGroup(index)}
                    className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addGroup}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Group
            </button>
            <p className="mt-2 text-xs text-gray-400">
              Rows not assigned to a group will appear under &quot;Ungrouped&quot;.
            </p>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Group rows by column value
            </label>
            <select
              value={autoColumn ?? ''}
              onChange={e => setAutoColumn(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">None (disable auto-grouping)</option>
              {columns.map(col => (
                <option key={col.id} value={col.id}>{col.name} ({col.type})</option>
              ))}
            </select>
            {autoCol && autoCol.type === 'text' && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Text columns may have many unique values, creating many groups.</span>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-400">
              When auto-grouping is active, rows are grouped by their value in the selected column. Rows with empty values appear under &quot;Ungrouped&quot;.
            </p>
          </>
        )}

        <div className="flex justify-between gap-3 pt-4 mt-4 border-t border-surface-100">
          <button
            type="button"
            onClick={handleClearGroups}
            className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            Clear All Groups
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (mode === 'manual' && groups.some(g => !g.name.trim()))}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Groups'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
