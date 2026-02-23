import { useState, useMemo } from 'react';
import { Table2, BarChart3, LayoutGrid } from 'lucide-react';
import { useSheets } from '@/hooks/useSheets';
import { useSheetGroups } from '@/hooks/useSheetGroups';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { SearchInput, EmptyState, ConfirmDialog } from '@/components/shared';
import { SheetCard } from './SheetCard';
import { SheetsDashboard } from './dashboard/SheetsDashboard';
import type { Sheet, SheetGroup } from '@/types';

interface SheetsOverviewProps {
  onSelectSheet: (id: string) => void;
}

type ViewMode = 'dashboard' | 'cards';

export function SheetsOverview({ onSelectSheet }: SheetsOverviewProps) {
  const { user, isAdmin } = useAuth();
  const { sheets, deleteSheet } = useSheets();
  const { groups } = useSheetGroups();
  const { members } = useTeamMembers();

  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [search, setSearch] = useState('');
  const [deletingSheet, setDeletingSheet] = useState<Sheet | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return sheets;
    const q = search.toLowerCase();
    return sheets.filter(
      t => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q),
    );
  }, [sheets, search]);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups],
  );

  const hasGroups = sortedGroups.length > 0;

  const groupedSections = useMemo(() => {
    if (!hasGroups) return null;

    const sections: { group: SheetGroup | null; sheets: Sheet[] }[] = [];

    for (const group of sortedGroups) {
      const groupSheets = filtered.filter(t => t.group_id === group.id);
      if (groupSheets.length > 0) {
        sections.push({ group, sheets: groupSheets });
      }
    }

    const ungrouped = filtered.filter(t => !t.group_id);
    if (ungrouped.length > 0) {
      sections.push({ group: null, sheets: ungrouped });
    }

    return sections;
  }, [hasGroups, sortedGroups, filtered]);

  const confirmDelete = async () => {
    if (deletingSheet) {
      await deleteSheet(deletingSheet.id);
      setDeletingSheet(null);
    }
  };

  const renderSheetGrid = (items: Sheet[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(sheet => (
        <SheetCard
          key={sheet.id}
          sheet={sheet}
          teamMembers={members}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          onEdit={() => onSelectSheet(sheet.id)}
          onDelete={setDeletingSheet}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Sheets</h1>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'dashboard'
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
        <SheetsDashboard />
      ) : (
        <>
          <div className="mb-6 max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search sheets..."
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Table2 className="w-12 h-12" />}
              message={search ? 'No sheets match your search.' : 'No sheets yet. Use the + button in the sidebar to create one.'}
            />
          ) : groupedSections ? (
            <div className="space-y-8">
              {groupedSections.map(section => (
                <div key={section.group?.id ?? 'ungrouped'}>
                  <div className="flex items-center gap-2 mb-3">
                    {section.group ? (
                      <>
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: section.group.color ?? '#6B7280' }}
                        />
                        <h2 className="text-lg font-semibold text-gray-800">
                          {section.group.name}
                        </h2>
                        <span className="text-sm text-gray-400">
                          ({section.sheets.length})
                        </span>
                      </>
                    ) : (
                      <>
                        <h2 className="text-lg font-semibold text-gray-500">
                          Ungrouped
                        </h2>
                        <span className="text-sm text-gray-400">
                          ({section.sheets.length})
                        </span>
                      </>
                    )}
                  </div>
                  {renderSheetGrid(section.sheets)}
                </div>
              ))}
            </div>
          ) : (
            renderSheetGrid(filtered)
          )}

          <ConfirmDialog
            open={!!deletingSheet}
            onClose={() => setDeletingSheet(null)}
            onConfirm={confirmDelete}
            title="Delete Sheet"
            message={`Are you sure you want to delete "${deletingSheet?.name}"? All rows and data will be permanently deleted.`}
            confirmLabel="Delete"
            destructive
          />
        </>
      )}
    </>
  );
}
