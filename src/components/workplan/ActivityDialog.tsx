import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { activitySchema } from '@/lib/utils/validation';
import { queryKeys } from '@/lib/queryKeys';
import { useActivities } from '@/hooks/useActivities';
import { useActivityGroups } from '@/hooks/useActivityGroups';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useWorkstreamMembers } from '@/hooks/useWorkstreamMembers';
import { useAuth } from '@/hooks/useAuth';
import { FormField } from '@/components/shared';
import { ITEM_STATUSES } from '@/types';
import { getStatusLabel } from '@/lib/utils';
import type { Activity, ItemStatus, CreateActivity } from '@/types';

type FormData = CreateActivity;

interface ActivityDialogProps {
  open: boolean;
  onClose: () => void;
  workstreamId: string;
  activity?: Activity | null;
}

export function ActivityDialog({ open, onClose, workstreamId, activity }: ActivityDialogProps) {
  const { createActivity, updateActivity } = useActivities(workstreamId);
  const { workstreams } = useWorkstreams();
  const { members } = useTeamMembers();
  const { members: wsMemberRecords } = useWorkstreamMembers(workstreamId);
  const { teamMember } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!activity;

  // Filter to only show workstream members in the assignment dropdown
  const wsMemberIds = new Set(wsMemberRecords.map(m => m.team_member_id));
  const assignableMembers = members.filter(m => m.is_active && wsMemberIds.has(m.id));

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(activitySchema) as any,
    defaultValues: {
      code: '',
      name: '',
      output: '',
      workstream_id: workstreamId,
      activity_group_id: null,
      start_date: '',
      end_date: '',
      status: 'not_started' as ItemStatus,
      assigned_to: null,
      notes: '',
      sort_order: 0,
    },
  });

  // Use the selected workstream for activity groups (supports changing workstream during edit)
  const selectedWorkstreamId = watch('workstream_id');
  const { activityGroups } = useActivityGroups(selectedWorkstreamId || workstreamId);

  // Clear activity_group_id when workstream changes (groups are per-workstream)
  useEffect(() => {
    if (isEdit && selectedWorkstreamId && selectedWorkstreamId !== workstreamId) {
      setValue('activity_group_id', null);
    }
  }, [isEdit, selectedWorkstreamId, workstreamId, setValue]);

  useEffect(() => {
    if (open) {
      if (activity) {
        reset({
          code: activity.code,
          name: activity.name,
          output: activity.output ?? '',
          workstream_id: activity.workstream_id,
          activity_group_id: activity.activity_group_id,
          start_date: activity.start_date,
          end_date: activity.end_date,
          status: activity.status,
          assigned_to: activity.assigned_to,
          notes: activity.notes ?? '',
          sort_order: activity.sort_order,
        });
      } else {
        reset({
          code: '',
          name: '',
          output: '',
          workstream_id: workstreamId,
          activity_group_id: null,
          start_date: '',
          end_date: '',
          status: 'not_started',
          assigned_to: teamMember?.id ?? null,
          notes: '',
          sort_order: 0,
        });
      }
    }
  }, [open, activity, workstreamId, reset, teamMember]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      output: data.output || null,
      activity_group_id: data.activity_group_id || null,
      assigned_to: data.assigned_to || null,
      notes: data.notes || null,
    };
    if (isEdit) {
      const workstreamChanged = data.workstream_id !== workstreamId;
      await updateActivity({ id: activity.id, data: payload });
      if (workstreamChanged) {
        // Invalidate the new workstream's activity cache so the moved activity appears there
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.byWorkstream(data.workstream_id),
        });
      }
    } else {
      await createActivity(payload);
    }
    onClose();
  };

  if (!open) return null;

  const inputClasses = "w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-surface-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {isEdit ? 'Edit Activity' : 'New Activity'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" error={errors.code?.message} required>
              <input
                {...register('code')}
                className={inputClasses}
                placeholder="A-1.1"
              />
            </FormField>
            <FormField label="Status">
              <select
                {...register('status')}
                className={inputClasses}
              >
                {ITEM_STATUSES.map(s => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </FormField>
          </div>

          {isEdit && workstreams.length > 1 && (
            <FormField label="Workstream">
              <select
                {...register('workstream_id')}
                className={inputClasses}
              >
                {workstreams.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.code} - {ws.name}</option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label="Name" error={errors.name?.message} required>
            <input
              {...register('name')}
              className={inputClasses}
              placeholder="Activity name"
            />
          </FormField>

          <FormField label="Output">
            <input
              {...register('output')}
              className={inputClasses}
              placeholder="Expected output"
            />
          </FormField>

          {activityGroups.length > 0 && (
            <FormField label="Activity Group">
              <select
                {...register('activity_group_id')}
                className={inputClasses}
              >
                <option value="">No group (ungrouped)</option>
                {activityGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.code} - {g.name}</option>
                ))}
              </select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" error={errors.start_date?.message} required>
              <input
                type="date"
                {...register('start_date')}
                className={inputClasses}
              />
            </FormField>
            <FormField label="End Date" error={errors.end_date?.message} required>
              <input
                type="date"
                {...register('end_date')}
                className={inputClasses}
              />
            </FormField>
          </div>

          <FormField label="Assigned To">
            <select
              {...register('assigned_to')}
              className={inputClasses}
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
              className={inputClasses}
              placeholder="Optional notes"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
