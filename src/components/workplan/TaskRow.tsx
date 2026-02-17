import { useState } from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatusDropdown, DateDisplay, Avatar, ConfirmDialog } from '@/components/shared';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTasks } from '@/hooks/useTasks';
import { usePermissions } from '@/hooks/usePermissions';
import { getStatusColor } from '@/lib/utils';
import { clsx } from 'clsx';
import { TaskDialog } from './TaskDialog';
import type { Task, ItemStatus } from '@/types';

interface TaskRowProps {
  task: Task;
  activityId: string;
  workstreamId?: string;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

export function TaskRow({ task, activityId, workstreamId, dragHandleProps, isDragging }: TaskRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { members } = useTeamMembers();
  const { updateTask, deleteTask } = useTasks(activityId);
  const { canEditItem, canDeleteItem } = usePermissions(task);

  const assignee = task.assigned_to
    ? members.find(m => m.id === task.assigned_to)
    : null;

  const isComplete = task.status === 'complete';
  const isDelayed = task.status === 'delayed';

  const handleStatusChange = (status: ItemStatus) => {
    updateTask({ id: task.id, data: { status } });
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <div
        className={clsx(
          'group flex items-center gap-3 py-2 px-4 pl-12 border-b border-surface-200 text-sm transition-colors',
          isComplete
            ? 'bg-amber-50/30 hover:bg-amber-50/60'
            : isDelayed
              ? 'bg-red-50/30 hover:bg-red-50/60'
              : 'hover:bg-surface-100',
          isDragging && 'opacity-50',
        )}
        style={{ borderLeftWidth: 3, borderLeftColor: getStatusColor(task.status) }}
      >
        {dragHandleProps && (
          <button
            className="drag-handle p-0.5 -ml-2 cursor-grab text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 touch-none"
            {...dragHandleProps}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        {task.code && (
          <span className="text-xs text-gray-400 font-mono min-w-[3.5rem]">{task.code}</span>
        )}
        <span className="flex-1 text-gray-700 truncate">{task.name}</span>
        <StatusDropdown
          status={task.status}
          onChange={handleStatusChange}
          disabled={!canEditItem}
        />
        {task.start_date || task.end_date ? (
          <span className="text-xs text-gray-400 hidden sm:inline">
            <DateDisplay date={task.start_date} className="text-xs text-gray-400" />
            {task.start_date && task.end_date && ' - '}
            <DateDisplay date={task.end_date} className="text-xs text-gray-400" />
          </span>
        ) : (
          <span className="text-xs text-gray-300 hidden sm:inline">Inherits dates</span>
        )}
        {assignee && (
          <Avatar name={assignee.full_name} url={assignee.avatar_url} size="sm" />
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEditItem && (
            <button
              onClick={() => setEditOpen(true)}
              className="p-1 rounded-lg hover:bg-surface-200 transition-colors"
              title="Edit task"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          {canDeleteItem && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-1 rounded-lg hover:bg-red-100 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>

      <TaskDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        activityId={activityId}
        workstreamId={workstreamId}
        task={task}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}

interface SortableTaskRowProps {
  task: Task;
  activityId: string;
  workstreamId?: string;
}

export function SortableTaskRow({ task, activityId, workstreamId }: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task-${task.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow
        task={task}
        activityId={activityId}
        workstreamId={workstreamId}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}
