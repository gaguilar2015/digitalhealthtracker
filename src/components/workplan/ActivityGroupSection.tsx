import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, ChevronDown, GripVertical, Pencil, Trash2, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmDialog, ProgressBar } from '@/components/shared';
import { useActivityGroups } from '@/hooks/useActivityGroups';
import { useAllTasks } from '@/hooks/useTasks';
import { usePermissions } from '@/hooks/usePermissions';
import { calculateDeepProgress } from '@/lib/utils';
import { ActivityGroupDialog } from './ActivityGroupDialog';
import { ActivityDialog } from './ActivityDialog';
import { clsx } from 'clsx';
import type { Activity, ActivityGroup } from '@/types';

interface ActivityGroupSectionProps {
  group: ActivityGroup;
  activities: Activity[];
  workstreamId: string;
  sortableId?: string;
  children?: ReactNode;
}

export function ActivityGroupSection({ group, activities, workstreamId, sortableId, children }: ActivityGroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const { deleteActivityGroup } = useActivityGroups(workstreamId);
  const { tasks: allTasks } = useAllTasks();
  const { canEditItem, canDeleteItem } = usePermissions();

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

  const activityIds = new Set(activities.map(a => a.id));
  const relevantTasks = allTasks.filter(t => activityIds.has(t.activity_id));
  const progress = calculateDeepProgress(activities, relevantTasks);

  const handleDelete = async () => {
    await deleteActivityGroup(group.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <div
        ref={sortableId ? sortable.setNodeRef : undefined}
        style={outerStyle}
        className={clsx('mb-2', sortableId && sortable.isDragging && 'opacity-50')}
      >
        <div
          className="group flex items-center gap-3 py-2 px-4 bg-surface-50 rounded-t-lg cursor-pointer hover:bg-surface-100"
          onClick={() => setCollapsed(!collapsed)}
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
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <span className="text-xs text-gray-500 font-mono font-semibold">{group.code}</span>
          <span className="text-sm font-semibold text-gray-800">{group.name}</span>

          <div className="w-24 hidden md:block">
            <ProgressBar value={progress} size="sm" />
          </div>
          <span className="text-xs text-gray-400 hidden md:inline">{Math.round(progress)}%</span>

          <span className="text-xs text-gray-400 ml-auto">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </span>

          <div
            className="hidden group-hover:flex items-center gap-1"
            onClick={e => e.stopPropagation()}
          >
            {canEditItem && (
              <button
                onClick={() => setEditOpen(true)}
                className="p-1 rounded hover:bg-surface-200"
                title="Edit group"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
            {canDeleteItem && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="p-1 rounded hover:bg-red-100"
                title="Delete group"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="border border-surface-200 border-t-0 rounded-b-lg">
            {children ? (
              children
            ) : activities.length > 0 ? (
              <div className="py-4 px-4 text-sm text-gray-400 text-center">
                No activities in this group yet.
              </div>
            ) : (
              <div className="py-4 px-4 text-sm text-gray-400 text-center">
                No activities in this group yet.
              </div>
            )}
            {canEditItem && (
              <div className="px-4 py-2 border-t border-surface-200">
                <button
                  onClick={() => setAddActivityOpen(true)}
                  className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Activity
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ActivityGroupDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        workstreamId={workstreamId}
        activityGroup={group}
      />

      <ActivityDialog
        open={addActivityOpen}
        onClose={() => setAddActivityOpen(false)}
        workstreamId={workstreamId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Activity Group"
        message={`Are you sure you want to delete "${group.name}"? Activities in this group will become ungrouped.`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
