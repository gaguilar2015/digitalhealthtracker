import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { StatusDropdown, DateDisplay, Avatar, ConfirmDialog } from '@/components/shared';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useDeliverables } from '@/hooks/useDeliverables';
import { usePermissions } from '@/hooks/usePermissions';
import { getStatusColor } from '@/lib/utils';
import { clsx } from 'clsx';
import { DeliverableDialog } from './DeliverableDialog';
import type { Deliverable, ItemStatus } from '@/types';

interface DeliverableRowProps {
  deliverable: Deliverable;
  workstreamId: string;
}

export function DeliverableRow({ deliverable, workstreamId }: DeliverableRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { members } = useTeamMembers();
  const { updateDeliverable, deleteDeliverable } = useDeliverables(workstreamId);
  const { canEditItem, canDeleteItem } = usePermissions(deliverable);

  const assignee = deliverable.assigned_to
    ? members.find(m => m.id === deliverable.assigned_to)
    : null;

  const isComplete = deliverable.status === 'complete';
  const isDelayed = deliverable.status === 'delayed';

  const handleStatusChange = (status: ItemStatus) => {
    updateDeliverable({ id: deliverable.id, data: { status } });
  };

  const handleDelete = async () => {
    await deleteDeliverable(deliverable.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <div
        className={clsx(
          'group flex items-center gap-3 py-2.5 px-4 border-b border-surface-200 transition-colors',
          isComplete
            ? 'bg-amber-50/40 hover:bg-amber-50/70'
            : isDelayed
              ? 'bg-red-50/40 hover:bg-red-50/70'
              : 'hover:bg-surface-100',
        )}
        style={{ borderLeftWidth: 3, borderLeftColor: getStatusColor(deliverable.status) }}
      >
        <span className="flex-1 text-sm text-gray-900 font-medium truncate">{deliverable.name}</span>

        <StatusDropdown
          status={deliverable.status}
          onChange={handleStatusChange}
          disabled={!canEditItem}
        />

        <span className="text-xs text-gray-400 hidden sm:inline">
          Due: <DateDisplay date={deliverable.due_date} className="text-xs text-gray-400" />
        </span>

        {deliverable.completion_date && (
          <span className="text-xs text-amber-600 hidden sm:inline">
            Completed: <DateDisplay date={deliverable.completion_date} className="text-xs text-amber-600" />
          </span>
        )}

        {assignee && (
          <Avatar name={assignee.full_name} url={assignee.avatar_url} size="sm" />
        )}

        <div className="hidden group-hover:flex items-center gap-1">
          {canEditItem && (
            <button
              onClick={() => setEditOpen(true)}
              className="p-1 rounded-lg hover:bg-surface-200 transition-colors"
              title="Edit deliverable"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          {canDeleteItem && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-1 rounded-lg hover:bg-red-100 transition-colors"
              title="Delete deliverable"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>

      <DeliverableDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        workstreamId={workstreamId}
        deliverable={deliverable}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Deliverable"
        message={`Are you sure you want to delete "${deliverable.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
