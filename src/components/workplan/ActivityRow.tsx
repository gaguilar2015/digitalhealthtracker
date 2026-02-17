import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, GripVertical, Pencil, Trash2, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { StatusDropdown, Avatar, ConfirmDialog, WorkstreamBadge } from '@/components/shared';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useActivities } from '@/hooks/useActivities';
import { useTasks } from '@/hooks/useTasks';
import { usePermissions } from '@/hooks/usePermissions';
import { useReorderTasks } from '@/hooks/useReorder';
import { formatDateRange, getStatusColor, computeSortUpdates } from '@/lib/utils';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { ActivityDialog } from './ActivityDialog';
import { TaskDialog } from './TaskDialog';
import { TaskRow, SortableTaskRow } from './TaskRow';
import type { Activity, Workstream, ItemStatus } from '@/types';

interface ActivityRowProps {
  activity: Activity;
  workstreamId: string;
  sortableId?: string;
  workstream?: Workstream;
  activityGroupLabel?: string | null;
}

export function ActivityRow({ activity, workstreamId, sortableId, workstream, activityGroupLabel }: ActivityRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const { members } = useTeamMembers();
  const { updateActivity, deleteActivity } = useActivities(workstreamId);
  const { tasks, isLoading: tasksLoading } = useTasks(expanded ? activity.id : undefined);
  const { canEditItem, canDeleteItem } = usePermissions(activity);
  const reorderTasks = useReorderTasks(activity.id);

  const sortedTasks = [...tasks].sort((a, b) => a.sort_order - b.sort_order);

  const taskSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Sortable support (when used inside a SortableContext)
  const sortable = useSortable({
    id: sortableId ?? '__noop__',
    disabled: !sortableId,
  });

  const outerStyle = sortableId
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }
    : undefined;

  const assignee = activity.assigned_to
    ? members.find(m => m.id === activity.assigned_to)
    : null;

  // Auto-complete activity when all tasks are marked complete
  const autoCompleteTriggered = useRef(false);
  useEffect(() => {
    if (
      !tasksLoading &&
      tasks.length > 0 &&
      tasks.every(t => t.status === 'complete') &&
      activity.status !== 'complete'
    ) {
      if (!autoCompleteTriggered.current) {
        autoCompleteTriggered.current = true;
        updateActivity({ id: activity.id, data: { status: 'complete' } });
        toast.success(`"${activity.code}" marked complete — all tasks done`);
      }
    } else {
      autoCompleteTriggered.current = false;
    }
  }, [tasks, tasksLoading, activity.status, activity.id, activity.code, updateActivity]);

  const isComplete = activity.status === 'complete';
  const isDelayed = activity.status === 'delayed';

  const handleStatusChange = (status: ItemStatus) => {
    updateActivity({ id: activity.id, data: { status } });
  };

  const handleDelete = async () => {
    await deleteActivity(activity.id);
    setDeleteOpen(false);
  };

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id).replace('task-', '');
    const overId = String(over.id).replace('task-', '');

    const oldIndex = sortedTasks.findIndex(t => t.id === activeId);
    const newIndex = sortedTasks.findIndex(t => t.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedTasks, oldIndex, newIndex);
    const updates = computeSortUpdates(
      reordered.map(t => t.id),
      sortedTasks,
    );
    if (updates.length > 0) {
      reorderTasks.mutate(updates);
    }
  };

  return (
    <>
      <div
        ref={sortableId ? sortable.setNodeRef : undefined}
        style={outerStyle}
        className={clsx(
          'border-b border-surface-200',
          sortableId && sortable.isDragging && 'opacity-50',
        )}
      >
        <div
          className={clsx(
            'group flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors',
            isComplete
              ? 'bg-amber-50/40 hover:bg-amber-50/70'
              : isDelayed
                ? 'bg-red-50/40 hover:bg-red-50/70'
                : 'hover:bg-surface-100',
          )}
          style={{ borderLeftWidth: 3, borderLeftColor: getStatusColor(activity.status) }}
          onClick={() => setExpanded(!expanded)}
        >
          {sortableId && canEditItem && (
            <button
              className="drag-handle p-0.5 -ml-2 cursor-grab text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 touch-none"
              onClick={e => e.stopPropagation()}
              {...sortable.attributes}
              {...sortable.listeners}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          <button className="p-0.5 text-gray-400">
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {workstream && (
            <WorkstreamBadge code={workstream.code} color={workstream.color} label={workstream.short_name} />
          )}
          {activityGroupLabel && (
            <span className="text-xs text-gray-400 truncate max-w-[8rem]" title={activityGroupLabel}>
              {activityGroupLabel}
            </span>
          )}

          <span className="text-xs text-gray-400 font-mono min-w-[3.5rem]">{activity.code}</span>
          <span className="flex-1 text-sm text-gray-900 font-medium truncate">{activity.name}</span>

          <div onClick={e => e.stopPropagation()}>
            <StatusDropdown
              status={activity.status}
              onChange={handleStatusChange}
              disabled={!canEditItem}
            />
          </div>

          <span className="text-xs text-gray-400 hidden md:inline">
            {formatDateRange(activity.start_date, activity.end_date)}
          </span>

          {assignee && (
            <Avatar name={assignee.full_name} url={assignee.avatar_url} size="sm" />
          )}

          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            {canEditItem && (
              <button
                onClick={() => setAddTaskOpen(true)}
                className="p-1 rounded-lg hover:bg-primary-100 transition-colors"
                title="Add task"
              >
                <Plus className="w-3.5 h-3.5 text-primary-500" />
              </button>
            )}
            {canEditItem && (
              <button
                onClick={() => setEditOpen(true)}
                className="p-1 rounded-lg hover:bg-surface-200 transition-colors"
                title="Edit activity"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
            {canDeleteItem && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="p-1 rounded-lg hover:bg-red-100 transition-colors"
                title="Delete activity"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="bg-surface-50">
            {tasksLoading ? (
              <div className="py-3 px-4 pl-12 text-xs text-gray-400">Loading tasks...</div>
            ) : sortedTasks.length > 0 ? (
              canEditItem ? (
                <DndContext
                  sensors={taskSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleTaskDragEnd}
                >
                  <SortableContext
                    items={sortedTasks.map(t => `task-${t.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedTasks.map(task => (
                      <SortableTaskRow key={task.id} task={task} activityId={activity.id} workstreamId={workstreamId} />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                sortedTasks.map(task => (
                  <TaskRow key={task.id} task={task} activityId={activity.id} workstreamId={workstreamId} />
                ))
              )
            ) : (
              <div className="py-3 px-4 pl-12 text-xs text-gray-400">
                No tasks yet.
                {canEditItem && (
                  <button
                    onClick={() => setAddTaskOpen(true)}
                    className="ml-1 text-primary-500 hover:text-primary-600 transition-colors"
                  >
                    Add one
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ActivityDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        workstreamId={workstreamId}
        activity={activity}
      />

      <TaskDialog
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        activityId={activity.id}
        workstreamId={workstreamId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Activity"
        message={`Are you sure you want to delete "${activity.name}"? All tasks within this activity will also be deleted.`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
