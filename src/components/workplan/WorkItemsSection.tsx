import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, GripVertical } from 'lucide-react';
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
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useActivities } from '@/hooks/useActivities';
import { useActivityGroups } from '@/hooks/useActivityGroups';
import { usePermissions } from '@/hooks/usePermissions';
import { useReorderActivities, useReorderActivityGroups } from '@/hooks/useReorder';
import { computeSortUpdates } from '@/lib/utils';
import { SkeletonLoader } from '@/components/shared';
import { ActivityGroupSection } from './ActivityGroupSection';
import { ActivityGroupDialog } from './ActivityGroupDialog';
import { ActivityDialog } from './ActivityDialog';
import { ActivityRow } from './ActivityRow';
import type { Workstream, Activity } from '@/types';

interface WorkItemsSectionProps {
  workstream: Workstream;
}

type DragType = 'group' | 'activity';

export function WorkItemsSection({ workstream }: WorkItemsSectionProps) {
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const { activities, isLoading: activitiesLoading } = useActivities(workstream.id);
  const { activityGroups, isLoading: groupsLoading } = useActivityGroups(workstream.id);
  const { canEditItem } = usePermissions();
  const reorderActivities = useReorderActivities(workstream.id);
  const reorderGroups = useReorderActivityGroups(workstream.id);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<DragType | null>(null);

  // Local activities state for cross-container moves
  const [localActivities, setLocalActivities] = useState<Activity[]>([]);
  useEffect(() => {
    setLocalActivities(activities);
  }, [activities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const hasGroups = activityGroups.length > 0;

  const sortedGroups = useMemo(
    () => [...activityGroups].sort((a, b) => a.sort_order - b.sort_order),
    [activityGroups],
  );

  const groupedActivities = useMemo(
    () =>
      hasGroups
        ? sortedGroups.map(g => ({
            group: g,
            activities: localActivities
              .filter(a => a.activity_group_id === g.id)
              .sort((a, b) => a.sort_order - b.sort_order),
          }))
        : [],
    [hasGroups, sortedGroups, localActivities],
  );

  const ungroupedActivities = useMemo(
    () =>
      localActivities
        .filter(a => !a.activity_group_id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [localActivities],
  );

  // Find which container (group id or 'ungrouped') an activity belongs to
  const findContainer = useCallback(
    (activityId: string): string | null => {
      const act = localActivities.find(a => a.id === activityId);
      if (!act) return null;
      return act.activity_group_id ?? 'ungrouped';
    },
    [localActivities],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('group-')) {
      setActiveId(id);
      setActiveType('group');
    } else if (id.startsWith('act-')) {
      setActiveId(id);
      setActiveType('activity');
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (activeType !== 'activity') return;
      const { active, over } = event;
      if (!over) return;

      const activeActId = String(active.id).replace('act-', '');
      const overId = String(over.id);

      // Determine the target container
      let targetContainer: string | null = null;

      if (overId.startsWith('group-')) {
        // Dropped over a group header
        targetContainer = overId.replace('group-', '');
      } else if (overId.startsWith('act-')) {
        // Dropped over another activity — find its container
        const overActId = overId.replace('act-', '');
        targetContainer = findContainer(overActId);
      } else if (overId === 'ungrouped-container') {
        targetContainer = 'ungrouped';
      }

      if (targetContainer === null) return;

      const currentContainer = findContainer(activeActId);
      if (currentContainer === targetContainer) return;

      // Move activity to new container in local state
      setLocalActivities(prev =>
        prev.map(a => {
          if (a.id !== activeActId) return a;
          return {
            ...a,
            activity_group_id: targetContainer === 'ungrouped' ? null : targetContainer,
          };
        }),
      );
    },
    [activeType, findContainer],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveType(null);

      if (activeType === 'group') {
        if (!over || active.id === over.id) return;
        const activeGroupId = String(active.id).replace('group-', '');
        const overGroupId = String(over.id).replace('group-', '');

        const oldIndex = sortedGroups.findIndex(g => g.id === activeGroupId);
        const newIndex = sortedGroups.findIndex(g => g.id === overGroupId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(sortedGroups, oldIndex, newIndex);
        const updates = computeSortUpdates(
          reordered.map(g => g.id),
          sortedGroups,
        );
        if (updates.length > 0) {
          reorderGroups.mutate(updates);
        }
        return;
      }

      if (activeType === 'activity') {
        const activeActId = String(active.id).replace('act-', '');
        const localAct = localActivities.find(a => a.id === activeActId);
        const originalAct = activities.find(a => a.id === activeActId);
        if (!localAct || !originalAct) return;

        const groupChanged = localAct.activity_group_id !== originalAct.activity_group_id;
        const newContainerId = localAct.activity_group_id ?? 'ungrouped';

        // Get all activities in the target container, sorted
        const containerActivities = localActivities
          .filter(a => {
            if (newContainerId === 'ungrouped') return !a.activity_group_id;
            return a.activity_group_id === newContainerId;
          })
          .sort((a, b) => a.sort_order - b.sort_order);

        // Try to compute sort reorder if dropped over another activity
        type ActivityUpdate = { id: string; sort_order: number; activity_group_id?: string | null };
        let reorderUpdates: ActivityUpdate[] = [];
        if (over && active.id !== over.id && String(over.id).startsWith('act-')) {
          const overActId = String(over.id).replace('act-', '');
          const oldIndex = containerActivities.findIndex(a => a.id === activeActId);
          const newIndex = containerActivities.findIndex(a => a.id === overActId);
          if (oldIndex !== -1 && newIndex !== -1) {
            const reordered = arrayMove(containerActivities, oldIndex, newIndex);
            reorderUpdates = computeSortUpdates(
              reordered.map(a => a.id),
              containerActivities,
            );
          }
        }

        // Nothing changed — no group move, no sort reorder
        if (!groupChanged && reorderUpdates.length === 0) return;

        // Build final updates: start with sort reorder updates
        const finalUpdates: ActivityUpdate[] = reorderUpdates.map(u => ({
          ...u,
          // Attach activity_group_id to the moved item's sort update
          ...(u.id === activeActId && groupChanged
            ? { activity_group_id: localAct.activity_group_id }
            : {}),
        }));

        // Ensure the moved activity's group change is always persisted,
        // even when over was null or sort position didn't change
        if (groupChanged && !finalUpdates.find(u => u.id === activeActId)) {
          const others = containerActivities.filter(a => a.id !== activeActId);
          const appendSort = others.length > 0
            ? Math.max(...others.map(a => a.sort_order)) + 1
            : 0;
          finalUpdates.push({
            id: activeActId,
            sort_order: appendSort,
            activity_group_id: localAct.activity_group_id,
          });
        }

        if (finalUpdates.length > 0) {
          reorderActivities.mutate(finalUpdates);
        }
      }
    },
    [activeType, sortedGroups, localActivities, activities, reorderGroups, reorderActivities],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveType(null);
    setLocalActivities(activities);
  }, [activities]);

  if (activitiesLoading || groupsLoading) {
    return <SkeletonLoader variant="table" count={4} />;
  }

  // Get data for drag overlay
  const activeActivity = activeId?.startsWith('act-')
    ? localActivities.find(a => a.id === activeId.replace('act-', ''))
    : null;
  const activeGroup = activeId?.startsWith('group-')
    ? sortedGroups.find(g => g.id === activeId.replace('group-', ''))
    : null;

  const renderContent = () => {
    if (hasGroups) {
      return (
        <div className="space-y-4">
          <SortableContext
            items={sortedGroups.map(g => `group-${g.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {groupedActivities.map(({ group, activities: groupActs }) => (
              <ActivityGroupSection
                key={group.id}
                group={group}
                activities={groupActs}
                workstreamId={workstream.id}
                sortableId={canEditItem ? `group-${group.id}` : undefined}
              >
                <SortableContext
                  items={groupActs.map(a => `act-${a.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {groupActs.length > 0 ? (
                    groupActs.map(activity => (
                      <ActivityRow
                        key={activity.id}
                        activity={activity}
                        workstreamId={workstream.id}
                        sortableId={canEditItem ? `act-${activity.id}` : undefined}
                      />
                    ))
                  ) : (
                    <div className="py-4 px-4 text-sm text-gray-400 text-center">
                      No activities in this group yet.
                    </div>
                  )}
                </SortableContext>
              </ActivityGroupSection>
            ))}
          </SortableContext>

          {ungroupedActivities.length > 0 && (
            <div>
              <div className="py-2 px-4 bg-surface-50 rounded-t-lg">
                <span className="text-sm font-semibold text-gray-600">Ungrouped</span>
                <span className="text-xs text-gray-400 ml-2">
                  {ungroupedActivities.length} {ungroupedActivities.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>
              <div
                className="border border-surface-200 border-t-0 rounded-b-lg"
                data-container-id="ungrouped-container"
              >
                <SortableContext
                  items={ungroupedActivities.map(a => `act-${a.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {ungroupedActivities.map(activity => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      workstreamId={workstream.id}
                      sortableId={canEditItem ? `act-${activity.id}` : undefined}
                    />
                  ))}
                </SortableContext>
              </div>
            </div>
          )}
        </div>
      );
    }

    // No groups — flat activity list
    const allSorted = [...localActivities].sort((a, b) => a.sort_order - b.sort_order);
    return (
      <div className="border border-surface-200 rounded-lg">
        {allSorted.length > 0 ? (
          <SortableContext
            items={allSorted.map(a => `act-${a.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {allSorted.map(activity => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                workstreamId={workstream.id}
                sortableId={canEditItem ? `act-${activity.id}` : undefined}
              />
            ))}
          </SortableContext>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">
            No activities yet.
            {canEditItem && (
              <button
                onClick={() => setAddActivityOpen(true)}
                className="ml-1 text-primary-500 hover:text-primary-600"
              >
                Add the first one
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activities</h3>
        <div className="flex items-center gap-2">
          {canEditItem && (
            <button
              onClick={() => setAddGroupOpen(true)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Group
            </button>
          )}
          {canEditItem && (
            <button
              onClick={() => setAddActivityOpen(true)}
              className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Activity
            </button>
          )}
        </div>
      </div>

      {canEditItem ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {renderContent()}
          <DragOverlay>
            {activeActivity && (
              <div className="flex items-center gap-3 py-2.5 px-4 bg-white border border-surface-200 rounded-lg shadow-lg">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-mono">{activeActivity.code}</span>
                <span className="text-sm text-gray-900 font-medium">{activeActivity.name}</span>
              </div>
            )}
            {activeGroup && (
              <div className="flex items-center gap-3 py-2 px-4 bg-surface-50 border border-surface-200 rounded-lg shadow-lg">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 font-mono font-semibold">{activeGroup.code}</span>
                <span className="text-sm font-semibold text-gray-800">{activeGroup.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        renderContent()
      )}

      <ActivityGroupDialog
        open={addGroupOpen}
        onClose={() => setAddGroupOpen(false)}
        workstreamId={workstream.id}
      />

      <ActivityDialog
        open={addActivityOpen}
        onClose={() => setAddActivityOpen(false)}
        workstreamId={workstream.id}
      />
    </div>
  );
}
