import { useState, useMemo, useCallback } from 'react';
import { useDiagrams } from '@/hooks/useDiagrams';
import { useDiagramGroups } from '@/hooks/useDiagramGroups';
import { useMyDiagramGroupIds } from '@/hooks/useMyDiagramGroupIds';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useReorderDiagrams } from '@/hooks/useReorder';
import { computeSortUpdates } from '@/lib/utils/reorder';
import { SkeletonLoader } from '@/components/shared';
import { CreateDiagramDialog } from './CreateDiagramDialog';
import { ManageDiagramGroupsDialog } from './ManageDiagramGroupsDialog';
import { SortableDiagramItem } from './SortableDiagramItem';
import { LayoutGrid, Plus, PanelLeftClose, PanelLeftOpen, ChevronRight, Settings2 } from 'lucide-react';
import { clsx } from 'clsx';
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
import type { Diagram, DiagramGroup } from '@/types';

interface DiagramSidebarProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function DiagramSidebar({ selectedId, onSelect, collapsed, onToggleCollapse }: DiagramSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
  const [createGroupId, setCreateGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { user, isAdmin } = useAuth();
  const { diagrams, isLoading, createDiagram } = useDiagrams();
  const { groups, isLoading: groupsLoading } = useDiagramGroups();
  const myGroupIds = useMyDiagramGroupIds();
  const { members } = useTeamMembers();
  const { canEditItem } = usePermissions();
  const { mutate: reorderDiagrams } = useReorderDiagrams();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups],
  );

  const sortedDiagrams = useMemo(
    () => [...diagrams].sort((a, b) => a.sort_order - b.sort_order),
    [diagrams],
  );

  // Build a map of groupId -> diagrams
  const diagramsByGroup = useMemo(() => {
    const map = new Map<string | null, Diagram[]>();
    for (const d of sortedDiagrams) {
      const key = d.group_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [sortedDiagrams]);

  // Reverse lookup: diagramId -> groupId
  const diagramGroupMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const d of sortedDiagrams) {
      map.set(d.id, d.group_id);
    }
    return map;
  }, [sortedDiagrams]);

  const ungroupedDiagrams = diagramsByGroup.get(null) ?? [];

  // A category is visible if (a) it has at least one accessible diagram, or
  // (b) the current user can act on it (admin, or member of the diagram_group).
  const visibleGroups = useMemo(
    () => sortedGroups.filter(group => {
      const groupDiagrams = diagramsByGroup.get(group.id) ?? [];
      return groupDiagrams.length > 0 || isAdmin || myGroupIds.has(group.id);
    }),
    [sortedGroups, diagramsByGroup, isAdmin, myGroupIds],
  );

  const hasGroups = visibleGroups.length > 0;

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Unified drag handler for diagrams across all groups
  const handleDiagramDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceGroupId = diagramGroupMap.get(activeId) ?? null;
    const targetGroupId = diagramGroupMap.get(overId) ?? null;

    if (sourceGroupId === targetGroupId) {
      // Same group: simple reorder
      const groupDiagrams = diagramsByGroup.get(sourceGroupId) ?? [];
      const oldIndex = groupDiagrams.findIndex(d => d.id === activeId);
      const newIndex = groupDiagrams.findIndex(d => d.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(groupDiagrams, oldIndex, newIndex);
      const updates = computeSortUpdates(
        reordered.map(d => d.id),
        groupDiagrams,
      );

      if (updates.length > 0) {
        reorderDiagrams(updates);
      }
    } else {
      // Cross-group: move diagram to target group at the position of the over item
      const targetDiagrams = diagramsByGroup.get(targetGroupId) ?? [];
      const overIndex = targetDiagrams.findIndex(d => d.id === overId);

      const activeDiagram = sortedDiagrams.find(d => d.id === activeId);
      if (!activeDiagram || overIndex === -1) return;

      const newTargetList = [...targetDiagrams];
      newTargetList.splice(overIndex, 0, activeDiagram);

      // Build updates: all items in target group get new sort_order + the moved item gets new group_id
      const updates = newTargetList.map((d, i) => ({
        id: d.id,
        sort_order: i,
        ...(d.id === activeId ? { group_id: targetGroupId } : {}),
      }));

      // Also re-index the source group (item was removed)
      const sourceDiagrams = (diagramsByGroup.get(sourceGroupId) ?? []).filter(d => d.id !== activeId);
      const sourceUpdates = sourceDiagrams.map((d, i) => ({
        id: d.id,
        sort_order: i,
      }));

      reorderDiagrams([...updates, ...sourceUpdates]);
    }
  }, [diagramGroupMap, diagramsByGroup, sortedDiagrams, reorderDiagrams]);

  const handleCreate = async (data: { name: string; description: string | null; icon: string | null; group_id?: string | null }) => {
    const created = await createDiagram({
      ...data,
      group_id: data.group_id ?? null,
      flow_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      legend: [],
      sort_order: diagrams.length,
      created_by: user!.id,
    });
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

  // ─── Diagram row renderer (shared by expanded view) ───
  const renderDiagramRow = (diagram: Diagram, indented: boolean) => {
    const isSelected = selectedId === diagram.id;
    const creator = members.find(m => m.id === diagram.created_by);
    const Icon = getSheetIcon(diagram.icon);
    const nodeCount = Array.isArray(diagram.flow_data?.nodes) ? diagram.flow_data.nodes.length : 0;

    return (
      <button
        onClick={() => onSelect(diagram.id)}
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
          <div className="text-sm font-medium truncate">{diagram.name}</div>
          <div className="text-xs text-gray-400 truncate">
            {nodeCount} node{nodeCount !== 1 ? 's' : ''}
            {creator ? ` · ${creator.full_name}` : ''}
          </div>
        </div>
      </button>
    );
  };

  // ─── Group section renderer ───
  const renderGroupSection = (group: DiagramGroup) => {
    const groupDiagrams = diagramsByGroup.get(group.id) ?? [];
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
            {groupDiagrams.length}
          </span>
        </button>
        {!isCollapsed && (
          <SortableContext items={groupDiagrams.map(d => d.id)} strategy={verticalListSortingStrategy}>
            {groupDiagrams.map(diagram => (
              <SortableDiagramItem key={diagram.id} id={diagram.id}>
                {renderDiagramRow(diagram, true)}
              </SortableDiagramItem>
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
          title="All Diagrams"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {canEditItem && (
          <button
            onClick={() => openCreateInGroup(null)}
            className="p-2 rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors mb-2"
            title="New diagram"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        <div className="w-6 border-t border-surface-200 mb-2" />

        {hasGroups ? (
          <>
            {visibleGroups.map((group, gi) => {
              const groupDiagrams = diagramsByGroup.get(group.id) ?? [];
              if (groupDiagrams.length === 0) return null;
              return (
                <div key={group.id} className="flex flex-col items-center">
                  {gi > 0 && (
                    <div
                      className="w-6 my-1 border-t-2"
                      style={{ borderColor: group.color ?? '#D1D5DB' }}
                    />
                  )}
                  {groupDiagrams.map(diagram => {
                    const isSelected = selectedId === diagram.id;
                    const Icon = getSheetIcon(diagram.icon);
                    return (
                      <button
                        key={diagram.id}
                        onClick={() => onSelect(diagram.id)}
                        className={clsx(
                          'p-2 rounded-lg transition-colors mb-0.5',
                          isSelected
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                        )}
                        title={diagram.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {ungroupedDiagrams.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-6 my-1 border-t border-surface-200" />
                {ungroupedDiagrams.map(diagram => {
                  const isSelected = selectedId === diagram.id;
                  const Icon = getSheetIcon(diagram.icon);
                  return (
                    <button
                      key={diagram.id}
                      onClick={() => onSelect(diagram.id)}
                      className={clsx(
                        'p-2 rounded-lg transition-colors mb-0.5',
                        isSelected
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                      )}
                      title={diagram.name}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // No groups — flat list
          canEditItem ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDiagramDragEnd}
            >
              <SortableContext items={sortedDiagrams.map(d => d.id)} strategy={verticalListSortingStrategy}>
                {sortedDiagrams.map(diagram => {
                  const isSelected = selectedId === diagram.id;
                  const Icon = getSheetIcon(diagram.icon);
                  return (
                    <SortableDiagramItem key={diagram.id} id={diagram.id} compact>
                      <button
                        onClick={() => onSelect(diagram.id)}
                        className={clsx(
                          'p-2 rounded-lg transition-colors mb-0.5',
                          isSelected
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                        )}
                        title={diagram.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    </SortableDiagramItem>
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : (
            sortedDiagrams.map(diagram => {
              const isSelected = selectedId === diagram.id;
              const Icon = getSheetIcon(diagram.icon);
              return (
                <button
                  key={diagram.id}
                  onClick={() => onSelect(diagram.id)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors mb-0.5',
                    isSelected
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:bg-surface-100 hover:text-gray-700',
                  )}
                  title={diagram.name}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })
          )
        )}

        <CreateDiagramDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
          defaultGroupId={createGroupId}
        />
        <ManageDiagramGroupsDialog
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
          All Diagrams
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
                title="New diagram"
              >
                <Plus className="w-4 h-4" />
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
            /* Single DndContext for all diagrams — enables cross-group dragging */
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDiagramDragEnd}
            >
              {visibleGroups.map(group => renderGroupSection(group))}

              {/* Ungrouped section */}
              {ungroupedDiagrams.length > 0 && (
                <div className="mt-1">
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Ungrouped
                    </span>
                  </div>
                  <SortableContext items={ungroupedDiagrams.map(d => d.id)} strategy={verticalListSortingStrategy}>
                    {ungroupedDiagrams.map(diagram => (
                      <SortableDiagramItem key={diagram.id} id={diagram.id}>
                        {renderDiagramRow(diagram, false)}
                      </SortableDiagramItem>
                    ))}
                  </SortableContext>
                </div>
              )}
            </DndContext>
          ) : (
            <>
              {visibleGroups.map(group => {
                const groupDiagrams = diagramsByGroup.get(group.id) ?? [];
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
                        {groupDiagrams.length}
                      </span>
                    </button>
                    {!isCollapsed && groupDiagrams.map(diagram => (
                      <div key={diagram.id}>{renderDiagramRow(diagram, true)}</div>
                    ))}
                  </div>
                );
              })}
              {ungroupedDiagrams.length > 0 && (
                <div className="mt-1">
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Ungrouped
                    </span>
                  </div>
                  {ungroupedDiagrams.map(diagram => (
                    <div key={diagram.id}>{renderDiagramRow(diagram, false)}</div>
                  ))}
                </div>
              )}
            </>
          )
        ) : (
          // No groups — flat list
          canEditItem ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDiagramDragEnd}
            >
              <SortableContext items={sortedDiagrams.map(d => d.id)} strategy={verticalListSortingStrategy}>
                {sortedDiagrams.map(diagram => (
                  <SortableDiagramItem key={diagram.id} id={diagram.id}>
                    {renderDiagramRow(diagram, false)}
                  </SortableDiagramItem>
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            sortedDiagrams.map(diagram => (
              <div key={diagram.id}>
                {renderDiagramRow(diagram, false)}
              </div>
            ))
          )
        )}
      </div>

      <CreateDiagramDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        defaultGroupId={createGroupId}
      />
      <ManageDiagramGroupsDialog
        open={manageGroupsOpen}
        onClose={() => setManageGroupsOpen(false)}
      />
    </nav>
  );
}
