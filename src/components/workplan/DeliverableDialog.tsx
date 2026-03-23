import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { deliverableSchema } from '@/lib/utils/validation';
import { useDeliverables } from '@/hooks/useDeliverables';
import { useActivities } from '@/hooks/useActivities';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWorkstreamMembers } from '@/hooks/useWorkstreamMembers';
import { useAuth } from '@/hooks/useAuth';
import { FormField } from '@/components/shared';
import { ITEM_STATUSES } from '@/types';
import { getStatusLabel } from '@/lib/utils';
import type { Deliverable, CreateDeliverable } from '@/types';

type FormData = CreateDeliverable;

interface DeliverableDialogProps {
  open: boolean;
  onClose: () => void;
  workstreamId: string;
  deliverable?: Deliverable | null;
}

export function DeliverableDialog({ open, onClose, workstreamId, deliverable }: DeliverableDialogProps) {
  const { createDeliverable, updateDeliverable } = useDeliverables(workstreamId);
  const { activities } = useActivities(workstreamId);
  const { members } = useTeamMembers();
  const { members: wsMemberRecords } = useWorkstreamMembers(workstreamId);
  const { teamMember } = useAuth();
  const isEdit = !!deliverable;

  // Filter to only show workstream members in the assignment dropdown
  const wsMemberIds = new Set(wsMemberRecords.map(m => m.team_member_id));
  const assignableMembers = members.filter(m => m.is_active && wsMemberIds.has(m.id));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(deliverableSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      workstream_id: workstreamId,
      activity_id: null,
      due_date: '',
      status: 'not_started',
      assigned_to: null,
      notes: '',
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (deliverable) {
        reset({
          name: deliverable.name,
          description: deliverable.description ?? '',
          workstream_id: workstreamId,
          activity_id: deliverable.activity_id,
          due_date: deliverable.due_date,
          status: deliverable.status,
          assigned_to: deliverable.assigned_to,
          notes: deliverable.notes ?? '',
          sort_order: deliverable.sort_order,
        });
      } else {
        reset({
          name: '',
          description: '',
          workstream_id: workstreamId,
          activity_id: null,
          due_date: '',
          status: 'not_started',
          assigned_to: teamMember?.id ?? null,
          notes: '',
          sort_order: 0,
        });
      }
    }
  }, [open, deliverable, workstreamId, reset, teamMember]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      description: data.description || null,
      activity_id: data.activity_id || null,
      assigned_to: data.assigned_to || null,
      notes: data.notes || null,
    };
    if (isEdit) {
      await updateDeliverable({ id: deliverable.id, data: payload });
    } else {
      await createDeliverable(payload);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {isEdit ? 'Edit Deliverable' : 'New Deliverable'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" error={errors.name?.message} required>
            <input
              {...register('name')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="Deliverable name"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="Optional description"
            />
          </FormField>

          <FormField label="Linked Activity">
            <select
              {...register('activity_id')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">None (workstream-level)</option>
              {[...activities]
                .sort((a, b) => a.code.localeCompare(b.code))
                .map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Due Date" error={errors.due_date?.message} required>
              <input
                type="date"
                {...register('due_date')}
                className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              />
            </FormField>
            <FormField label="Status">
              <select
                {...register('status')}
                className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              >
                {ITEM_STATUSES.map(s => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Assigned To">
            <select
              {...register('assigned_to')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">Unassigned</option>
              {assignableMembers.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Notes">
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="Optional notes"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
