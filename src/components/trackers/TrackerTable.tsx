import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { TrackerRowComponent } from './TrackerRowComponent';
import { SortableTrackerRow } from './SortableTrackerRow';
import { resolveEffectiveStyle } from '@/lib/utils/cellFormatting';
import type { TrackerColumn, TrackerRow, Tracker, CellStyle, TrackerRowGroup } from '@/types';

interface TrackerTableProps {
  tracker: Tracker;
  columns: TrackerColumn[];
  rows: TrackerRow[];
  readOnly: boolean;
  onCellChange: (rowId: string, columnId: string, value: unknown) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  selectedCell: { rowId: string; colId: string } | null;
  onSelectCell: (cell: { rowId: string; colId: string } | null) => void;
  onRowMove?: (updates: { id: string; sort_order: number; group_id?: string | null }[]) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  onAutoGroupReorder?: (orderedGroupNames: string[]) => void;
  commentCounts?: Record<string, number>;
  onOpenComments?: (rowId: string) => void;
}

type SortDir = 'asc' | 'desc' | null;

interface GroupedSection {
  group: TrackerRowGroup | null;
  rows: TrackerRow[];
}

const MIN_COL_WIDTH = 60;

export function TrackerTable({
  tracker, columns, rows, readOnly,
  onCellChange, onAddRow, onDeleteRow,
  selectedCell, onSelectCell, onRowMove,
  onColumnResize, onAutoGroupReorder,
  commentCounts, onOpenComments,
}: TrackerTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [localRows, setLocalRows] = useState<TrackerRow[]>(rows);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Column resize state
  const [localWidths, setLocalWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  // Sync localWidths from columns prop
  useEffect(() => {
    const widths: Record<string, number> = {};
    for (const col of columns) {
      if (col.width) widths[col.id] = col.width;
    }
    setLocalWidths(widths);
  }, [columns]);

  // Sync localRows with prop
  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const isAutoGroup = !!tracker.group_by_column;
  const hasManualGroups = (tracker.row_groups ?? []).length > 0 && !isAutoGroup;
  const isSorted = sortCol !== null;
  const dragEnabled = !readOnly && !isSorted && !isAutoGroup && !!onRowMove;
  const autoGroupDragEnabled = !readOnly && isAutoGroup && !!onAutoGroupReorder && !isSorted;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const toggleSort = (colId: string) => {
    if (sortCol === colId) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortCol(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortCol(colId);
      setSortDir('asc');
    }
  };

  const sortRows = useCallback((input: TrackerRow[]) => {
    if (!sortCol || !sortDir) {
      // Default: sort by sort_order so optimistic updates are reflected
      return [...input].sort((a, b) => a.sort_order - b.sort_order);
    }
    const col = columns.find(c => c.id === sortCol);
    if (!col) return input;

    return [...input].sort((a, b) => {
      const av = a.cells[sortCol];
      const bv = b.cells[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      let cmp = 0;
      if (col.type === 'number') {
        cmp = Number(av) - Number(bv);
      } else if (col.type === 'checkbox') {
        cmp = (av ? 1 : 0) - (bv ? 1 : 0);
      } else if (col.type === 'multiselect') {
        const aStr = Array.isArray(av) ? [...av].sort().join(', ') : String(av);
        const bStr = Array.isArray(bv) ? [...bv].sort().join(', ') : String(bv);
        cmp = aStr.localeCompare(bStr);
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [columns, sortCol, sortDir]);

  // Always render from localRows — keeps optimistic state after drag ends
  const groupedSections = useMemo((): GroupedSection[] => {
    const groupByCol = tracker.group_by_column;
    const manualGroups = tracker.row_groups ?? [];

    if (isAutoGroup) {
      const col = columns.find(c => c.id === groupByCol);
      if (!col) return [{ group: null, rows: sortRows(localRows) }];

      const map = new Map<string, TrackerRow[]>();
      const ungrouped: TrackerRow[] = [];

      for (const row of localRows) {
        const val = row.cells[groupByCol!];
        if (val == null || val === '') {
          ungrouped.push(row);
        } else {
          const key = String(val);
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(row);
        }
      }

      const sections: GroupedSection[] = [];
      for (const [key, groupRows] of map) {
        sections.push({
          group: { id: key, name: key, sort_order: 0 },
          rows: sortRows(groupRows),
        });
      }

      // Reconcile with persisted auto_group_order
      const persistedOrder = tracker.auto_group_order ?? [];
      const computedNames = new Set(sections.map(s => s.group!.name));
      // Keep persisted entries that still exist
      const surviving = persistedOrder.filter(name => computedNames.has(name));
      const survivingSet = new Set(surviving);
      // New groups not in persisted order, sorted alphabetically
      const newGroups = [...computedNames].filter(name => !survivingSet.has(name)).sort();
      const mergedOrder = [...surviving, ...newGroups];
      const orderIndex = new Map(mergedOrder.map((name, i) => [name, i]));
      sections.sort((a, b) => (orderIndex.get(a.group!.name) ?? 999) - (orderIndex.get(b.group!.name) ?? 999));
      if (ungrouped.length > 0) {
        sections.push({ group: { id: '__ungrouped', name: 'Ungrouped', sort_order: 999 }, rows: sortRows(ungrouped) });
      }
      return sections;
    }

    if (hasManualGroups) {
      const sorted = [...manualGroups].sort((a, b) => a.sort_order - b.sort_order);
      const map = new Map<string, TrackerRow[]>();
      const ungrouped: TrackerRow[] = [];

      for (const g of sorted) map.set(g.id, []);

      for (const row of localRows) {
        if (row.group_id && map.has(row.group_id)) {
          map.get(row.group_id)!.push(row);
        } else {
          ungrouped.push(row);
        }
      }

      const sections: GroupedSection[] = sorted.map(g => ({
        group: g,
        rows: sortRows(map.get(g.id) ?? []),
      }));

      if (ungrouped.length > 0) {
        sections.push({ group: { id: '__ungrouped', name: 'Ungrouped', sort_order: 999 }, rows: sortRows(ungrouped) });
      }
      return sections;
    }

    return [{ group: null, rows: sortRows(localRows) }];
  }, [tracker, columns, localRows, sortRows, isAutoGroup, hasManualGroups]);

  const isGrouped = groupedSections.length > 1 || (groupedSections.length === 1 && groupedSections[0].group != null);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Compute effective styles
  const effectiveStyles = useMemo(() => {
    const map: Record<string, Record<string, CellStyle>> = {};
    for (const row of rows) {
      map[row.id] = {};
      for (const col of columns) {
        map[row.id][col.id] = resolveEffectiveStyle(
          col,
          row.cells[col.id],
          row.cell_formats?.[col.id],
        );
      }
    }
    return map;
  }, [rows, columns]);

  // DnD helpers
  const findRowGroup = useCallback((rowId: string): string | null => {
    const row = localRows.find(r => r.id === rowId);
    if (!row) return null;
    return row.group_id ?? null;
  }, [localRows]);

  const findGroupForOverId = useCallback((overId: string): string | null | undefined => {
    // Check if overId is a group droppable
    if (typeof overId === 'string' && overId.startsWith('group-')) {
      const gid = overId.replace('group-', '');
      return gid === '__ungrouped' ? null : gid;
    }
    // Otherwise it's a row ID — find its group
    return findRowGroup(overId);
  }, [findRowGroup]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveRowId(event.active.id as string);
    setLocalRows(rows);
  }, [rows]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!hasManualGroups) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeGroup = findRowGroup(activeId);
    const overGroup = findGroupForOverId(overId);
    if (overGroup === undefined) return;

    // Only update if the group actually changed
    if (activeGroup === overGroup) return;

    // Move the active row to the target group in localRows so its ID
    // appears in the correct SortableContext, preventing displacement.
    setLocalRows(prev => prev.map(r =>
      r.id === activeId ? { ...r, group_id: overGroup } : r,
    ));
  }, [hasManualGroups, findRowGroup, findGroupForOverId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveRowId(null);

    if (!over || !onRowMove) {
      setLocalRows(rows);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine target group
    const targetGroup = findGroupForOverId(overId);

    // Get the section rows for the target group
    const targetGroupId = targetGroup === undefined ? findRowGroup(activeId) : targetGroup;

    // Build the updated row list with group assignment applied
    const updatedRows = localRows.map(r => {
      if (r.id !== activeId) return r;
      return { ...r, group_id: targetGroupId };
    });

    // Get rows in the target group section
    let sectionRows: TrackerRow[];
    if (hasManualGroups || isGrouped) {
      if (targetGroupId === null) {
        // Ungrouped
        const manualGroupIds = new Set((tracker.row_groups ?? []).map(g => g.id));
        sectionRows = updatedRows.filter(r => !r.group_id || !manualGroupIds.has(r.group_id));
      } else {
        sectionRows = updatedRows.filter(r => r.group_id === targetGroupId);
      }
    } else {
      sectionRows = updatedRows;
    }

    // Sort by current sort_order to get stable ordering
    sectionRows.sort((a, b) => a.sort_order - b.sort_order);

    const oldIndex = sectionRows.findIndex(r => r.id === activeId);

    // Find where to place in the section
    let newIndex: number;
    if (overId.startsWith('group-')) {
      // Dropped on group header — place at beginning
      newIndex = 0;
    } else {
      newIndex = sectionRows.findIndex(r => r.id === overId);
      if (newIndex === -1) newIndex = sectionRows.length - 1;
    }

    if (oldIndex === -1) {
      // Row was just moved into this group — insert at newIndex
      const rowToInsert = updatedRows.find(r => r.id === activeId);
      if (rowToInsert) {
        sectionRows.splice(newIndex < 0 ? 0 : newIndex, 0, rowToInsert);
      }
    } else if (oldIndex !== newIndex) {
      sectionRows = arrayMove(sectionRows, oldIndex, newIndex);
    } else {
      // Check if only group changed (same position within section)
      const originalGroupId = rows.find(r => r.id === activeId)?.group_id ?? null;
      if (targetGroupId === originalGroupId) {
        // Same position, same group — no change
        return;
      }
    }

    // Compute sort_order updates
    const updates: { id: string; sort_order: number; group_id?: string | null }[] = [];
    sectionRows.forEach((r, i) => {
      const originalRow = rows.find(orig => orig.id === r.id);
      const groupChanged = r.id === activeId && targetGroupId !== (originalRow?.group_id ?? null);
      const sortChanged = originalRow?.sort_order !== i;

      if (groupChanged || sortChanged) {
        const update: { id: string; sort_order: number; group_id?: string | null } = {
          id: r.id,
          sort_order: i,
        };
        if (groupChanged) {
          update.group_id = targetGroupId;
        }
        updates.push(update);
      }
    });

    if (updates.length > 0) {
      // Apply optimistically to localRows so UI doesn't snap back
      const updateMap = new Map(updates.map(u => [u.id, u]));
      setLocalRows(prev => prev.map(r => {
        const upd = updateMap.get(r.id);
        if (!upd) return r;
        return {
          ...r,
          sort_order: upd.sort_order,
          ...(upd.group_id !== undefined ? { group_id: upd.group_id } : {}),
        };
      }));
      onRowMove(updates);
    }
  }, [localRows, rows, onRowMove, findRowGroup, findGroupForOverId, hasManualGroups, isGrouped, tracker.row_groups]);

  const handleDragCancel = useCallback(() => {
    setActiveRowId(null);
    setLocalRows(rows);
  }, [rows]);

  // Auto-group drag handler
  const handleAutoGroupDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !onAutoGroupReorder) return;

    const activeId = (active.id as string).replace('autogroup-', '');
    const overId = (over.id as string).replace('autogroup-', '');
    if (activeId === overId) return;

    const currentOrder = groupedSections
      .filter(s => s.group && s.group.id !== '__ungrouped')
      .map(s => s.group!.name);

    const oldIndex = currentOrder.indexOf(activeId);
    const newIndex = currentOrder.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
    onAutoGroupReorder(newOrder);
  }, [groupedSections, onAutoGroupReorder]);

  // Column resize handlers
  const onColumnResizeRef = useRef(onColumnResize);
  onColumnResizeRef.current = onColumnResize;

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = localWidths[colId] || 150;
    let currentWidth = startWidth;

    resizingRef.current = { colId, startX, startWidth };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      currentWidth = Math.max(MIN_COL_WIDTH, resizingRef.current.startWidth + delta);
      setLocalWidths(prev => ({ ...prev, [resizingRef.current!.colId]: currentWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (resizingRef.current && onColumnResizeRef.current) {
        onColumnResizeRef.current(resizingRef.current.colId, currentWidth);
      }
      resizingRef.current = null;
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [localWidths]);

  // Active drag row for overlay
  const activeRow = activeRowId ? rows.find(r => r.id === activeRowId) : null;

  let globalRowIdx = 0;
  const colSpan = columns.length + 1 + (readOnly ? 0 : 1);

  const tableContent = (
    <table className="w-full border-collapse table-fixed">
      <colgroup>
        <col className="w-10" />
        {columns.map(col => (
          <col
            key={col.id}
            style={localWidths[col.id] ? { width: `${localWidths[col.id]}px` } : undefined}
          />
        ))}
        {!readOnly && <col className="w-10" />}
      </colgroup>
      <thead>
        <tr className="bg-surface-50 border-b border-surface-200">
          <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            #
          </th>
          {columns.map(col => (
            <th
              key={col.id}
              className="relative px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-surface-100 select-none truncate"
              onClick={() => toggleSort(col.id)}
            >
              <span className="inline-flex items-center gap-1">
                {col.name}
                {sortCol === col.id ? (
                  sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-30" />
                )}
              </span>
              {onColumnResize && (
                <div
                  className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary-400 active:bg-primary-500 z-10"
                  onMouseDown={e => handleResizeMouseDown(e, col.id)}
                  onClick={e => e.stopPropagation()}
                />
              )}
            </th>
          ))}
          {!readOnly && (
            <th className="px-3 py-2.5" />
          )}
        </tr>
      </thead>
      <tbody>
        {groupedSections.map(section => {
          const startIdx = globalRowIdx;
          const sectionEl = (
            <GroupSectionRows
              key={section.group?.id ?? '__flat'}
              section={section}
              isGrouped={isGrouped}
              isCollapsed={section.group ? collapsedGroups.has(section.group.id) : false}
              onToggle={() => section.group && toggleGroup(section.group.id)}
              colSpan={colSpan}
              columns={columns}
              readOnly={readOnly}
              effectiveStyles={effectiveStyles}
              selectedCell={selectedCell}
              onSelectCell={onSelectCell}
              onCellChange={onCellChange}
              onDeleteRow={onDeleteRow}
              startIndex={startIdx}
              dragEnabled={dragEnabled}
              autoGroupDragEnabled={autoGroupDragEnabled}
              commentCounts={commentCounts}
              onOpenComments={onOpenComments}
            />
          );
          globalRowIdx += section.rows.length;
          return sectionEl;
        })}
      </tbody>
    </table>
  );

  const anyDndActive = dragEnabled || autoGroupDragEnabled;

  const autoGroupSortableIds = autoGroupDragEnabled
    ? groupedSections
        .filter(s => s.group && s.group.id !== '__ungrouped')
        .map(s => `autogroup-${s.group!.name}`)
    : [];

  return (
    <div className="overflow-x-auto">
      {anyDndActive ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={dragEnabled ? handleDragStart : undefined}
          onDragOver={dragEnabled ? handleDragOver : undefined}
          onDragEnd={autoGroupDragEnabled ? handleAutoGroupDragEnd : handleDragEnd}
          onDragCancel={dragEnabled ? handleDragCancel : undefined}
        >
          {autoGroupDragEnabled ? (
            <SortableContext items={autoGroupSortableIds} strategy={verticalListSortingStrategy}>
              {tableContent}
            </SortableContext>
          ) : (
            tableContent
          )}
          <DragOverlay dropAnimation={null}>
            {activeRow && (
              <table className="w-full border-collapse table-fixed">
                <tbody>
                  <tr className="bg-white shadow-lg border border-primary-200 rounded">
                    <TrackerRowComponent
                      row={activeRow}
                      index={0}
                      columns={columns}
                      readOnly={readOnly}
                      effectiveStyles={effectiveStyles}
                      selectedCell={null}
                      onSelectCell={() => {}}
                      onCellChange={() => {}}
                      onDeleteRow={() => {}}
                      dragEnabled={false}
                    />
                  </tr>
                </tbody>
              </table>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        tableContent
      )}

      {rows.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          No rows yet. Click &quot;Add Row&quot; to get started.
        </div>
      )}

      {!readOnly && (
        <button
          onClick={onAddRow}
          className="mt-2 flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-primary-600 hover:bg-surface-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Row
        </button>
      )}
    </div>
  );
}

// Droppable group header for empty groups
function DroppableGroupHeader({
  group,
  rowCount,
  isCollapsed,
  onToggle,
  colSpan,
}: {
  group: TrackerRowGroup;
  rowCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  colSpan: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group-${group.id}` });

  return (
    <tr
      ref={setNodeRef}
      className={`bg-surface-50/80 border-b border-surface-200 cursor-pointer hover:bg-surface-100 ${isOver ? 'bg-primary-50/50' : ''}`}
      onClick={onToggle}
    >
      <td colSpan={colSpan} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {group.color && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.color }}
            />
          )}
          <span className="text-sm font-semibold text-gray-700">{group.name}</span>
          <span className="text-xs text-gray-400">({rowCount})</span>
        </div>
      </td>
    </tr>
  );
}

// Non-droppable group header (for auto-group / non-drag mode)
function StaticGroupHeader({
  group,
  rowCount,
  isCollapsed,
  onToggle,
  colSpan,
}: {
  group: TrackerRowGroup;
  rowCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  colSpan: number;
}) {
  return (
    <tr
      className="bg-surface-50/80 border-b border-surface-200 cursor-pointer hover:bg-surface-100"
      onClick={onToggle}
    >
      <td colSpan={colSpan} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {group.color && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.color }}
            />
          )}
          <span className="text-sm font-semibold text-gray-700">{group.name}</span>
          <span className="text-xs text-gray-400">({rowCount})</span>
        </div>
      </td>
    </tr>
  );
}

// Sortable group header for auto-group drag-to-reorder
function SortableAutoGroupHeader({
  group,
  rowCount,
  isCollapsed,
  onToggle,
  colSpan,
}: {
  group: TrackerRowGroup;
  rowCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  colSpan: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `autogroup-${group.name}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="group/header bg-surface-50/80 border-b border-surface-200 cursor-pointer hover:bg-surface-100"
      onClick={onToggle}
    >
      <td colSpan={colSpan} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="opacity-0 group-hover/header:opacity-100 p-0.5 -ml-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-opacity"
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {group.color && (
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.color }}
            />
          )}
          <span className="text-sm font-semibold text-gray-700">{group.name}</span>
          <span className="text-xs text-gray-400">({rowCount})</span>
        </div>
      </td>
    </tr>
  );
}

function GroupSectionRows({
  section, isGrouped, isCollapsed, onToggle, colSpan,
  columns, readOnly, effectiveStyles,
  selectedCell, onSelectCell, onCellChange, onDeleteRow,
  startIndex, dragEnabled, autoGroupDragEnabled,
  commentCounts, onOpenComments,
}: {
  section: GroupedSection;
  isGrouped: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  colSpan: number;
  columns: TrackerColumn[];
  readOnly: boolean;
  effectiveStyles: Record<string, Record<string, CellStyle>>;
  selectedCell: { rowId: string; colId: string } | null;
  onSelectCell: (cell: { rowId: string; colId: string } | null) => void;
  onCellChange: (rowId: string, columnId: string, value: unknown) => void;
  onDeleteRow: (rowId: string) => void;
  startIndex: number;
  dragEnabled: boolean;
  autoGroupDragEnabled: boolean;
  commentCounts?: Record<string, number>;
  onOpenComments?: (rowId: string) => void;
}) {
  const rowIds = section.rows.map(r => r.id);

  const rowElements = !isCollapsed && section.rows.map((row, i) => {
    const commentProps = {
      commentCount: commentCounts?.[row.id] ?? 0,
      onOpenComments: onOpenComments ? () => onOpenComments(row.id) : undefined,
    };
    if (dragEnabled) {
      return (
        <SortableTrackerRow
          key={row.id}
          row={row}
          index={startIndex + i}
          columns={columns}
          readOnly={readOnly}
          effectiveStyles={effectiveStyles}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          onCellChange={onCellChange}
          onDeleteRow={onDeleteRow}
          dragEnabled={dragEnabled}
          {...commentProps}
        />
      );
    }
    return (
      <tr key={row.id} className="group border-b border-surface-100 hover:bg-surface-50/50">
        <TrackerRowComponent
          row={row}
          index={startIndex + i}
          columns={columns}
          readOnly={readOnly}
          effectiveStyles={effectiveStyles}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          onCellChange={onCellChange}
          onDeleteRow={onDeleteRow}
          dragEnabled={false}
          {...commentProps}
        />
      </tr>
    );
  });

  const groupHeader = isGrouped && section.group && (
    autoGroupDragEnabled && section.group.id !== '__ungrouped' ? (
      <SortableAutoGroupHeader
        group={section.group}
        rowCount={section.rows.length}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
        colSpan={colSpan}
      />
    ) : dragEnabled ? (
      <DroppableGroupHeader
        group={section.group}
        rowCount={section.rows.length}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
        colSpan={colSpan}
      />
    ) : (
      <StaticGroupHeader
        group={section.group}
        rowCount={section.rows.length}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
        colSpan={colSpan}
      />
    )
  );

  if (dragEnabled) {
    return (
      <>
        {groupHeader}
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          {rowElements}
        </SortableContext>
      </>
    );
  }

  return (
    <>
      {groupHeader}
      {rowElements}
    </>
  );
}
