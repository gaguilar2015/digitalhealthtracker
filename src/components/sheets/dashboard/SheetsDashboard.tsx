import { useState, useMemo } from 'react';
import { Plus, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSheets } from '@/hooks/useSheets';
import { useSheetGroups } from '@/hooks/useSheetGroups';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { useWidgetData } from '@/hooks/useWidgetData';
import { generateAutoSuggestions, suggestionsToWidgets } from '@/lib/utils/chartDefaults';
import { EmptyState, ConfirmDialog } from '@/components/shared';
import type { DashboardWidget, CreateDashboardWidget } from '@/types';
import { WidgetCard } from './WidgetCard';
import { AddWidgetDialog } from './AddWidgetDialog';
import { AutoDashboardBanner } from './AutoDashboardBanner';

export function SheetsDashboard() {
  const { user, isAdmin } = useAuth();
  const { sheets } = useSheets();
  const { groups } = useSheetGroups();
  const { widgets, isLoading, createWidget, updateWidget, deleteWidget } = useDashboardWidgets();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [deletingWidget, setDeletingWidget] = useState<DashboardWidget | null>(null);

  // Collect all sheet IDs referenced by widgets
  const referencedSheetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of widgets) {
      if (w.sheet_id) ids.add(w.sheet_id);
      for (const sid of w.selected_sheet_ids ?? []) ids.add(sid);
    }
    // Also include all sheet IDs for auto-generated mode
    if (widgets.length === 0) {
      for (const s of sheets) ids.add(s.id);
    }
    return [...ids];
  }, [widgets, sheets]);

  const { rowsBySheet, isLoading: dataLoading } = useWidgetData(referencedSheetIds);

  // Auto-generated dashboard
  const autoWidgets = useMemo(() => {
    if (widgets.length > 0 || !user?.id) return [];
    const suggestions = generateAutoSuggestions(sheets, rowsBySheet);
    return suggestionsToWidgets(suggestions, user.id);
  }, [widgets.length, sheets, rowsBySheet, user?.id]);

  const isAutoMode = widgets.length === 0 && autoWidgets.length > 0;
  const displayWidgets = isAutoMode
    ? autoWidgets.map((w, i) => ({ ...w, id: `auto-${i}`, created_at: '', updated_at: '' }))
    : widgets;

  const canModify = isAdmin || true; // members can modify their own

  const handleSave = async (data: CreateDashboardWidget) => {
    if (editingWidget) {
      await updateWidget({ id: editingWidget.id, data });
    } else {
      await createWidget(data);
    }
  };

  const confirmDelete = async () => {
    if (deletingWidget) {
      await deleteWidget(deletingWidget.id);
      setDeletingWidget(null);
    }
  };

  const nextSortOrder = widgets.length > 0
    ? Math.max(...widgets.map(w => w.sort_order)) + 1
    : 0;

  if (isLoading || dataLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-surface-200 p-4 animate-pulse"
          >
            <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-64 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Add Chart button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingWidget(null);
            setAddDialogOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Chart
        </button>
      </div>

      {isAutoMode && <AutoDashboardBanner />}

      {displayWidgets.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-12 h-12" />}
          message="No charts yet. Click 'Add Chart' to visualize your sheet data."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayWidgets.map(widget => (
            <WidgetCard
              key={widget.id}
              widget={widget as DashboardWidget}
              sheets={sheets}
              rowsBySheet={rowsBySheet}
              onEdit={w => {
                setEditingWidget(w);
                setAddDialogOpen(true);
              }}
              onDelete={setDeletingWidget}
              canModify={canModify && !widget.id.startsWith('auto-')}
            />
          ))}
        </div>
      )}

      <AddWidgetDialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setEditingWidget(null);
        }}
        onSave={handleSave}
        sheets={sheets}
        groups={groups}
        rowsBySheet={rowsBySheet}
        userId={user?.id ?? ''}
        editingWidget={editingWidget}
        nextSortOrder={nextSortOrder}
      />

      <ConfirmDialog
        open={!!deletingWidget}
        onClose={() => setDeletingWidget(null)}
        onConfirm={confirmDelete}
        title="Delete Chart"
        message={`Are you sure you want to delete "${deletingWidget?.title}"?`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
