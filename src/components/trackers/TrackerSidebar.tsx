import { useState, useMemo, useCallback } from 'react';
import { useTrackers } from '@/hooks/useTrackers';
import { useTrackerGroups } from '@/hooks/useTrackerGroups';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useReorderTrackers } from '@/hooks/useReorder';
import { computeSortUpdates } from '@/lib/utils/reorder';
import { SkeletonLoader } from '@/components/shared';
import { CreateTrackerDialog } from './CreateTrackerDialog';
import { ImportTrackerDialog } from './ImportTrackerDialog';
import { ManageTrackerGroupsDialog } from './ManageTrackerGroupsDialog';
import { SortableTrackerItem } from './SortableTrackerItem';
import { LayoutGrid, Plus, Upload, PanelLeftClose, PanelLeftOpen, ChevronRight, Settings2 } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import * as trackerRowsApi from '@/lib/api/trackerRows';
import { getTrackerIcon } from '@/lib/utils/trackerIcons';
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
import type { Tracker, TrackerColumn, TrackerGroup } from '@/types';

interface TrackerSidebarProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function TrackerSidebar({ selectedId, onSelect, collapsed, onToggleCollapse }: TrackerSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
  const [createGroupId, setCreateGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { trackers, isLoading, createTracker } = useTrackers();
  const { groups, isLoading: groupsLoading } = useTrackerGroups();
  const { members } = useTeamMembers();
  const { canEditItem } = usePermissions();
  const { mutate: reorderTrackers } = useReorderTrackers();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups],
  );

  const sortedTrackers = useMemo(
    () => [...trackers].sort((a, b) => a.sort_order - b.sort_order),
    [trackers],
  );

  const hasGroups = sortedGroups.length > 0;

  // Build a map of groupId -> trackers
  const trackersByGroup = useMemo(() => {
    const map = new Map<string | null, Tracker[]>();
    for (const t of sortedTrackers) {
      const key = t.group_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [sortedTrackers]);

  // Reverse lookup: trackerId -> groupId
  const trackerGroupMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const t of sortedTrackers) {
      map.set(t.id, t.group_id);
    }
    return map;
  }, [sortedTrackers]);

  const ungroupedTrackers = trackersByGroup.get(null) ?? [];

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Unified drag handler for trackers across all groups
  const handleTrackerDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceGroupId = trackerGroupMap.get(activeId) ?? null;
    const targetGroupId = trackerGroupMap.get(overId) ?? null;

    if (sourceGroupId === targetGroupId) {
      // Same group: simple reorder
      const groupTrackers = trackersByGroup.get(sourceGroupId) ?? [];
      const oldIndex = groupTrackers.findIndex(t => t.id === activeId);
      const newIndex = groupTrackers.findIndex(t => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(groupTrackers, oldIndex, newIndex);
      const updates = computeSortUpdates(
        reordered.map(t => t.id),
        groupTrackers,
      );

      if (updates.length > 0) {
        reorderTrackers(updates);
      }
    } else {
      // Cross-group: move tracker to target group at the position of the over item
      const targetTrackers = trackersByGroup.get(targetGroupId) ?? [];
      const overIndex = targetTrackers.findIndex(t => t.id === overId);

      // Build the new list for the target group with the active item inserted
      const activeTracker = sortedTrackers.find(t => t.id === activeId);
      if (!activeTracker || overIndex === -1) return;

      const newTargetList = [...targetTrackers];
      newTargetList.splice(overIndex, 0, activeTracker);

      // Build updates: all items in target group get new sort_order + the moved item gets new group_id
      const updates = newTargetList.map((t, i) => ({
        id: t.id,
        sort_order: i,
        ...(t.id === activeId ? { group_id: targetGroupId } : {}),
      }));

      // Also re-index the source group (item was removed)
      const sourceTrackers = (trackersByGroup.get(sourceGroupId) ?? []).filter(t => t.id !== activeId);
      const sourceUpdates = sourceTrackers.map((t, i) => ({
        id: t.id,
        sort_order: i,
      }));

      reorderTrackers([...updates, ...sourceUpdates]);
    }
  }, [trackerGroupMap, trackersByGroup, sortedTrackers, reorderTrackers]);

  const handleCreate = async (data: { name: string; description: string | null; icon: string | null; group_id: string | null; columns: Tracker['columns'] }) => {
    const processed = {
      ...data,
      columns: data.columns.map(col => {
        if (col.type === 'select' && typeof col.options === 'string') {
          return { ...col, options: (col.options as unknown as string).split(',').map((s: string) => s.trim()).filter(Boolean) };
        }
        return col;
      }),
      sort_order: trackers.length,
      created_by: user!.id,
    };
    const created = await createTracker(processed);
    onSelect(created.id);
  };

  const handleImport = async (data: {
    name: string;
    description: string | null;
    columns: TrackerColumn[];
    rowCells: Record<string, unknown>[];
  }) => {
    const created = await createTracker({
      name: data.name,
      description: data.description,
      icon: null,
      group_id: null,
      columns: data.columns,
      sort_order: trackers.length,
      created_by: user!.id,
    });

    if (data.rowCells.length > 0) {
      const rows = data.rowCells.map((cells, index) => ({
        tracker_id: created.id,
        cells,
        sort_order: index,
        created_by: user!.id,
      }));
      await trackerRowsApi.bulkCreate(rows);
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

  // ─── Tracker row renderer (shared by expanded view) ───
  const renderTrackerRow = (tracker: Tracker, indented: boolean) => {
    const isSelected = selectedId === tracker.id;
    const creator = members.find(m => m.id === tracker.created_by);
    const Icon = getTrackerIcon(tracker.icon);

    return (
      <button
        onClick={() => onSelect(tracker.id)}
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
          <div className="text-sm font-medium truncate">{tracker.name}</div>
          <div className="text-xs text-gray-400 truncate">
            {tracker.columns.length} col{tracker.columns.length !== 1 ? 's' : ''}
            {creator ? ` · ${creator.full_name}` : ''}
          </div>
        </div>
      </button>
    );
  };

  // ─── Group section renderer (tracker items inside are rendered as SortableTrackerItems) ───
  const renderGroupSection = (group: TrackerGroup) => {
    const groupTrackers = trackersByGroup.get(group.id) ?? [];
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
            {groupTrackers.length}
          </span>
        </button>
        {!isCollapsed && (
          <SortableContext items={groupTrackers.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {groupTrackers.map(tracker => (
              <SortableTrackerItem key={tracker.id} id={tracker.id}>
                {renderTrackerRow(tracker, true)}
              </SortableTrackerItem>
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
          title="All Trackers"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {canEditItem && (
          <>
            <button
              onClick={() => openCreateInGroup(null)}
              className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors mb-1"
              title="New tracker"
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
              const groupTrackers = trackersByGroup.get(group.id) ?? [];
              if (groupTrackers.length === 0) return null;
              return (
                <div key={group.id} className="flex flex-col items-center">
                  {gi > 0 && (
                    <div
                      className="w-6 my-1 border-t-2"
                      style={{ borderColor: group.color ?? '#D1D5DB' }}
                    />
                  )}
                  {groupTrackers.map(tracker => {
                    const isSelected = selectedId === tracker.id;
                    const Icon = getTrackerIcon(tracker.icon);
                    return (
                      <button
                        key={tracker.id}
                        onClick={() => onSelect(tracker.id)}
                        className={clsx(
                          'p-2 rounded-lg transition-colors mb-0.5',
                          isSelected
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                        )}
                        title={tracker.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {ungroupedTrackers.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-6 my-1 border-t border-surface-200" />
                {ungroupedTrackers.map(tracker => {
                  const isSelected = selectedId === tracker.id;
                  const Icon = getTrackerIcon(tracker.icon);
                  return (
                    <button
                      key={tracker.id}
                      onClick={() => onSelect(tracker.id)}
                      className={clsx(
                        'p-2 rounded-lg transition-colors mb-0.5',
                        isSelected
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                      )}
                      title={tracker.name}
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
              onDragEnd={handleTrackerDragEnd}
            >
              <SortableContext items={sortedTrackers.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {sortedTrackers.map(tracker => {
                  const isSelected = selectedId === tracker.id;
                  const Icon = getTrackerIcon(tracker.icon);
                  return (
                    <SortableTrackerItem key={tracker.id} id={tracker.id} compact>
                      <button
                        onClick={() => onSelect(tracker.id)}
                        className={clsx(
                          'p-2 rounded-lg transition-colors mb-0.5',
                          isSelected
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                        )}
                        title={tracker.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    </SortableTrackerItem>
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : (
            sortedTrackers.map(tracker => {
              const isSelected = selectedId === tracker.id;
              const Icon = getTrackerIcon(tracker.icon);
              return (
                <button
                  key={tracker.id}
                  onClick={() => onSelect(tracker.id)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors mb-0.5',
                    isSelected
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                  )}
                  title={tracker.name}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })
          )
        )}

        <CreateTrackerDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          defaultGroupId={createGroupId}
        />
        <ImportTrackerDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onSubmit={handleImport}
        />
        <ManageTrackerGroupsDialog
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
          All Trackers
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
                title="New tracker"
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
            /* Single DndContext for all trackers — enables cross-group dragging */
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTrackerDragEnd}
            >
              {/* Groups (group headers are not draggable in this context — use Manage Groups to reorder) */}
              {sortedGroups.map(group => renderGroupSection(group))}

              {/* Ungrouped section */}
              {ungroupedTrackers.length > 0 && (
                <div className="mt-1">
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Ungrouped
                    </span>
                  </div>
                  <SortableContext items={ungroupedTrackers.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {ungroupedTrackers.map(tracker => (
                      <SortableTrackerItem key={tracker.id} id={tracker.id}>
                        {renderTrackerRow(tracker, false)}
                      </SortableTrackerItem>
                    ))}
                  </SortableContext>
                </div>
              )}
            </DndContext>
          ) : (
            <>
              {sortedGroups.map(group => {
                const groupTrackers = trackersByGroup.get(group.id) ?? [];
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
                        {groupTrackers.length}
                      </span>
                    </button>
                    {!isCollapsed && groupTrackers.map(tracker => (
                      <div key={tracker.id}>{renderTrackerRow(tracker, true)}</div>
                    ))}
                  </div>
                );
              })}
              {ungroupedTrackers.length > 0 && (
                <div className="mt-1">
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Ungrouped
                    </span>
                  </div>
                  {ungroupedTrackers.map(tracker => (
                    <div key={tracker.id}>{renderTrackerRow(tracker, false)}</div>
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
              onDragEnd={handleTrackerDragEnd}
            >
              <SortableContext items={sortedTrackers.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {sortedTrackers.map(tracker => (
                  <SortableTrackerItem key={tracker.id} id={tracker.id}>
                    {renderTrackerRow(tracker, false)}
                  </SortableTrackerItem>
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            sortedTrackers.map(tracker => (
              <div key={tracker.id}>
                {renderTrackerRow(tracker, false)}
              </div>
            ))
          )
        )}
      </div>

      <CreateTrackerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        defaultGroupId={createGroupId}
      />
      <ImportTrackerDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSubmit={handleImport}
      />
      <ManageTrackerGroupsDialog
        open={manageGroupsOpen}
        onClose={() => setManageGroupsOpen(false)}
      />
    </nav>
  );
}
