import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { taskSchema } from '@/lib/utils/validation';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWorkstreamMembers } from '@/hooks/useWorkstreamMembers';
import { useAuth } from '@/hooks/useAuth';
import { FormField } from '@/components/shared';
import { ITEM_STATUSES } from '@/types';
import { getStatusLabel } from '@/lib/utils';
import type { Task, CreateTask } from '@/types';

type FormData = CreateTask;

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  activityId: string;
  workstreamId?: string;
  task?: Task | null;
}

export function TaskDialog({ open, onClose, activityId, workstreamId, task }: TaskDialogProps) {
  const { createTask, updateTask } = useTasks(activityId);
  const { members } = useTeamMembers();
  const { members: wsMemberRecords } = useWorkstreamMembers(workstreamId);
  const { teamMember } = useAuth();
  const isEdit = !!task;

  // Filter to only show workstream members in the assignment dropdown
  const wsMemberIds = new Set(wsMemberRecords.map(m => m.team_member_id));
  const assignableMembers = workstreamId
    ? members.filter(m => m.is_active && wsMemberIds.has(m.id))
    : members.filter(m => m.is_active);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(taskSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      activity_id: activityId,
      start_date: null,
      end_date: null,
      status: 'not_started',
      assigned_to: null,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (task) {
        reset({
          code: task.code ?? '',
          name: task.name,
          activity_id: activityId,
          start_date: task.start_date,
          end_date: task.end_date,
          status: task.status,
          assigned_to: task.assigned_to,
          sort_order: task.sort_order,
        });
      } else {
        reset({
          code: '',
          name: '',
          activity_id: activityId,
          start_date: null,
          end_date: null,
          status: 'not_started',
          assigned_to: teamMember?.id ?? null,
          sort_order: 0,
        });
      }
    }
  }, [open, task, activityId, reset, teamMember]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      code: data.code || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      assigned_to: data.assigned_to || null,
    };
    if (isEdit) {
      await updateTask({ id: task.id, data: payload });
    } else {
      await createTask(payload);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {isEdit ? 'Edit Task' : 'New Task'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Code (optional)">
            <input
              {...register('code')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="T-1.1.1"
            />
          </FormField>

          <FormField label="Name" error={errors.name?.message} required>
            <input
              {...register('name')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="Task name"
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

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date">
              <input
                type="date"
                {...register('start_date')}
                className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Inherits from activity if empty</p>
            </FormField>
            <FormField label="End Date">
              <input
                type="date"
                {...register('end_date')}
                className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Inherits from activity if empty</p>
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
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
