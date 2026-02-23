import { useState, useMemo, useCallback } from 'react';
import { useSheets } from '@/hooks/useSheets';
import { useSheetGroups } from '@/hooks/useSheetGroups';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useReorderSheets } from '@/hooks/useReorder';
import { computeSortUpdates } from '@/lib/utils/reorder';
import { SkeletonLoader } from '@/components/shared';
import { CreateSheetDialog } from './CreateSheetDialog';
import { ImportSheetDialog } from './ImportSheetDialog';
import { ManageSheetGroupsDialog } from './ManageSheetGroupsDialog';
import { SortableSheetItem } from './SortableSheetItem';
import { LayoutGrid, Plus, Upload, PanelLeftClose, PanelLeftOpen, ChevronRight, Settings2 } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import * as sheetRowsApi from '@/lib/api/sheetRows';
import { getSheetIcon } from '@/lib/utils/sheetIcons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { Sheet, SheetColumn, SheetGroup } from '@/types';

interface SheetSidebarProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function SheetSidebar({ selectedId, onSelect, collapsed, onToggleCollapse }: SheetSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
  const [createGroupId, setCreateGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { sheets, isLoading, createSheet } = useSheets();
  const { groups, isLoading: groupsLoading } = useSheetGroups();
  const { members } = useTeamMembers();
  const { canEditItem } = usePermissions();
  const { mutate: reorderSheets } = useReorderSheets();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups],
  );

  const sortedSheets = useMemo(
    () => [...sheets].sort((a, b) => a.sort_order - b.sort_order),
    [sheets],
  );

  const hasGroups = sortedGroups.length > 0;

  // Build a map of groupId -> sheets
  const sheetsByGroup = useMemo(() => {
    const map = new Map<string | null, Sheet[]>();
    for (const t of sortedSheets) {
      const key = t.group_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [sortedSheets]);

  // Reverse lookup: sheetId -> groupId
  const sheetGroupMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const t of sortedSheets) {
      map.set(t.id, t.group_id);
    }
    return map;
  }, [sortedSheets]);

  const ungroupedSheets = sheetsByGroup.get(null) ?? [];

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Unified drag handler for sheets across all groups
  const handleSheetDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceGroupId = sheetGroupMap.get(activeId) ?? null;
    const targetGroupId = sheetGroupMap.get(overId) ?? null;

    if (sourceGroupId === targetGroupId) {
      // Same group: simple reorder
      const groupSheets = sheetsByGroup.get(sourceGroupId) ?? [];
      const oldIndex = groupSheets.findIndex(t => t.id === activeId);
      const newIndex = groupSheets.findIndex(t => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(groupSheets, oldIndex, newIndex);
      const updates = computeSortUpdates(
        reordered.map(t => t.id),
        groupSheets,
      );

      if (updates.length > 0) {
        reorderSheets(updates);
      }
    } else {
      // Cross-group: move sheet to target group at the position of the over item
      const targetSheets = sheetsByGroup.get(targetGroupId) ?? [];
      const overIndex = targetSheets.findIndex(t => t.id === overId);

      // Build the new list for the target group with the active item inserted
      const activeSheet = sortedSheets.find(t => t.id === activeId);
      if (!activeSheet || overIndex === -1) return;

      const newTargetList = [...targetSheets];
      newTargetList.splice(overIndex, 0, activeSheet);

      // Build updates: all items in target group get new sort_order + the moved item gets new group_id
      const updates = newTargetList.map((t, i) => ({
        id: t.id,
        sort_order: i,
        ...(t.id === activeId ? { group_id: targetGroupId } : {}),
      }));

      // Also re-index the source group (item was removed)
      const sourceSheets = (sheetsByGroup.get(sourceGroupId) ?? []).filter(t => t.id !== activeId);
      const sourceUpdates = sourceSheets.map((t, i) => ({
        id: t.id,
        sort_order: i,
      }));

      reorderSheets([...updates, ...sourceUpdates]);
    }
  }, [sheetGroupMap, sheetsByGroup, sortedSheets, reorderSheets]);

  const handleCreate = async (data: { name: string; description: string | null; icon: string | null; group_id: string | null; columns: Sheet['columns'] }) => {
    const processed = {
      ...data,
      columns: data.columns.map(col => {
        if (col.type === 'select' && typeof col.options === 'string') {
          return { ...col, options: (col.options as unknown as string).split(',').map((s: string) => s.trim()).filter(Boolean) };
        }
        return col;
      }),
      sort_order: sheets.length,
      created_by: user!.id,
    };
    const created = await createSheet(processed);
    onSelect(created.id);
  };

  const handleImport = async (data: {
    name: string;
    description: string | null;
    columns: SheetColumn[];
    rowCells: Record<string, unknown>[];
  }) => {
    const created = await createSheet({
      name: data.name,
      description: data.description,
      icon: null,
      group_id: null,
      columns: data.columns,
      sort_order: sheets.length,
      created_by: user!.id,
    });

    if (data.rowCells.length > 0) {
      const rows = data.rowCells.map((cells, index) => ({
        sheet_id: created.id,
        cells,
        sort_order: index,
        created_by: user!.id,
      }));
      await sheetRowsApi.bulkCreate(rows);
    }

    toast.success(`Imported "${data.name}" with ${data.rowCells.length} rows`);
    onSelect(created.id);
  };

  const openCreateInGroup = (groupId: string | null) => {
    setCreateGroupId(groupId);
    setCreateOpen(true);
  };

  if (isLoading || groupsLoading) {
    return (
      <div className="p-4">
        <SkeletonLoader variant="line" count={collapsed ? 3 : 6} />
      </div>
    );
  }

  // ─── Sheet row renderer (shared by expanded view) ───
  const renderSheetRow = (sheet: Sheet, indented: boolean) => {
    const isSelected = selectedId === sheet.id;
    const creator = members.find(m => m.id === sheet.created_by);
    const Icon = getSheetIcon(sheet.icon);

    return (
      <button
        onClick={() => onSelect(sheet.id)}
        className={clsx(
          'w-full flex items-center gap-3 pr-4 py-2.5 text-left transition-colors',
          indented ? 'pl-9' : 'pl-7',
          isSelected
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-700 hover:bg-surface-100',
        )}
      >
        <Icon className="w-4 h-4 shrink-0 opacity-50" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{sheet.name}</div>
          <div className="text-xs text-gray-400 truncate">
            {sheet.columns.length} col{sheet.columns.length !== 1 ? 's' : ''}
            {creator ? ` · ${creator.full_name}` : ''}
          </div>
        </div>
      </button>
    );
  };

  // ─── Group section renderer (sheet items inside are rendered as SortableSheetItems) ───
  const renderGroupSection = (group: SheetGroup) => {
    const groupSheets = sheetsByGroup.get(group.id) ?? [];
    const isCollapsed = collapsedGroups.has(group.id);

    return (
      <div key={group.id}>
        <button
          onClick={() => toggleGroup(group.id)}
          className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-surface-50 transition-colors group/header"
        >
          <ChevronRight
            className={clsx(
              'w-3.5 h-3.5 text-gray-400 transition-transform',
              !isCollapsed && 'rotate-90',
            )}
          />
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: group.color ?? '#6B7280' }}
          />
          <span className="text-sm font-medium text-gray-700 truncate flex-1">
            {group.name}
          </span>
          <span className="text-xs text-gray-400 tabular-nums">
            {groupSheets.length}
          </span>
        </button>
        {!isCollapsed && (
          <SortableContext items={groupSheets.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {groupSheets.map(sheet => (
              <SortableSheetItem key={sheet.id} id={sheet.id}>
                {renderSheetRow(sheet, true)}
              </SortableSheetItem>
            ))}
          </SortableContext>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════
  // Collapsed view: narrow icon strip
  // ═══════════════════════════════════════════════════════
  if (collapsed) {
    return (
      <nav className="py-2 flex flex-col items-center">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors mb-2"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelect(null)}
          className={clsx(
            'p-2 rounded-lg transition-colors mb-1',
            selectedId === null
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
          )}
          title="All Sheets"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {canEditItem && (
          <>
            <button
              onClick={() => openCreateInGroup(null)}
              className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors mb-1"
              title="New sheet"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors mb-2"
              title="Import from spreadsheet"
            >
              <Upload className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="w-6 border-t border-surface-200 mb-2" />

        {hasGroups ? (
          <>
            {sortedGroups.map((group, gi) => {
              const groupSheets = sheetsByGroup.get(group.id) ?? [];
              if (groupSheets.length === 0) return null;
              return (
                <div key={group.id} className="flex flex-col items-center">
                  {gi > 0 && (
                    <div
                      className="w-6 my-1 border-t-2"
                      style={{ borderColor: group.color ?? '#D1D5DB' }}
                    />
                  )}
                  {groupSheets.map(sheet => {
                    const isSelected = selectedId === sheet.id;
                    const Icon = getSheetIcon(sheet.icon);
                    return (
                      <button
                        key={sheet.id}
                        onClick={() => onSelect(sheet.id)}
                        className={clsx(
                          'p-2 rounded-lg transition-colors mb-0.5',
                          isSelected
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                        )}
                        title={sheet.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {ungroupedSheets.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-6 my-1 border-t border-surface-200" />
                {ungroupedSheets.map(sheet => {
                  const isSelected = selectedId === sheet.id;
                  const Icon = getSheetIcon(sheet.icon);
                  return (
                    <button
                      key={sheet.id}
                      onClick={() => onSelect(sheet.id)}
                      className={clsx(
                        'p-2 rounded-lg transition-colors mb-0.5',
                        isSelected
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                      )}
                      title={sheet.name}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // No groups — flat list (preserves existing behavior)
          canEditItem ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSheetDragEnd}
            >
              <SortableContext items={sortedSheets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {sortedSheets.map(sheet => {
                  const isSelected = selectedId === sheet.id;
                  const Icon = getSheetIcon(sheet.icon);
                  return (
                    <SortableSheetItem key={sheet.id} id={sheet.id} compact>
                      <button
                        onClick={() => onSelect(sheet.id)}
                        className={clsx(
                          'p-2 rounded-lg transition-colors mb-0.5',
                          isSelected
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                        )}
                        title={sheet.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    </SortableSheetItem>
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : (
            sortedSheets.map(sheet => {
              const isSelected = selectedId === sheet.id;
              const Icon = getSheetIcon(sheet.icon);
              return (
                <button
                  key={sheet.id}
                  onClick={() => onSelect(sheet.id)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors mb-0.5',
                    isSelected
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                  )}
                  title={sheet.name}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })
          )
        )}

        <CreateSheetDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          defaultGroupId={createGroupId}
        />
        <ImportSheetDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onSubmit={handleImport}
        />
        <ManageSheetGroupsDialog
          open={manageGroupsOpen}
          onClose={() => setManageGroupsOpen(false)}
        />
      </nav>
    );
  }

  // ═══════════════════════════════════════════════════════
  // Expanded view
  // ═══════════════════════════════════════════════════════
  return (
    <nav className="py-2">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => onSelect(null)}
          className={clsx(
            'flex items-center gap-2 text-sm transition-colors',
            selectedId === null
              ? 'text-primary-700 font-medium'
              : 'text-gray-700 hover:text-gray-900',
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          All Sheets
        </button>
        <div className="flex items-center gap-0.5">
          {canEditItem && (
            <>
              <button
                onClick={() => setManageGroupsOpen(true)}
                className="p-1 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Manage groups"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => openCreateInGroup(null)}
                className="p-1 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="New sheet"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="p-1 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Import from spreadsheet"
              >
                <Upload className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-1">
        {hasGroups ? (
          canEditItem ? (
            /* Single DndContext for all sheets — enables cross-group dragging */
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSheetDragEnd}
            >
              {/* Groups (group headers are not draggable in this context — use Manage Groups to reorder) */}
              {sortedGroups.map(group => renderGroupSection(group))}

              {/* Ungrouped section */}
              {ungroupedSheets.length > 0 && (
                <div className="mt-1">
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Ungrouped
                    </span>
                  </div>
                  <SortableContext items={ungroupedSheets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {ungroupedSheets.map(sheet => (
                      <SortableSheetItem key={sheet.id} id={sheet.id}>
                        {renderSheetRow(sheet, false)}
                      </SortableSheetItem>
                    ))}
                  </SortableContext>
                </div>
              )}
            </DndContext>
          ) : (
            <>
              {sortedGroups.map(group => {
                const groupSheets = sheetsByGroup.get(group.id) ?? [];
                const isCollapsed = collapsedGroups.has(group.id);
                return (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-surface-50 transition-colors"
                    >
                      <ChevronRight
                        className={clsx(
                          'w-3.5 h-3.5 text-gray-400 transition-transform',
                          !isCollapsed && 'rotate-90',
                        )}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: group.color ?? '#6B7280' }}
                      />
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">
                        {group.name}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums">
                        {groupSheets.length}
                      </span>
                    </button>
                    {!isCollapsed && groupSheets.map(sheet => (
                      <div key={sheet.id}>{renderSheetRow(sheet, true)}</div>
                    ))}
                  </div>
                );
              })}
              {ungroupedSheets.length > 0 && (
                <div className="mt-1">
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Ungrouped
                    </span>
                  </div>
                  {ungroupedSheets.map(sheet => (
                    <div key={sheet.id}>{renderSheetRow(sheet, false)}</div>
                  ))}
                </div>
              )}
            </>
          )
        ) : (
          // No groups — flat list (preserves existing behavior exactly)
          canEditItem ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSheetDragEnd}
            >
              <SortableContext items={sortedSheets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {sortedSheets.map(sheet => (
                  <SortableSheetItem key={sheet.id} id={sheet.id}>
                    {renderSheetRow(sheet, false)}
                  </SortableSheetItem>
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            sortedSheets.map(sheet => (
              <div key={sheet.id}>
                {renderSheetRow(sheet, false)}
              </div>
            ))
          )
        )}
      </div>

      <CreateSheetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        defaultGroupId={createGroupId}
      />
      <ImportSheetDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSubmit={handleImport}
      />
      <ManageSheetGroupsDialog
        open={manageGroupsOpen}
        onClose={() => setManageGroupsOpen(false)}
      />
    </nav>
  );
}
