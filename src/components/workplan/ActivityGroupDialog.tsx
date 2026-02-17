import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { activityGroupSchema } from '@/lib/utils/validation';
import { useActivityGroups } from '@/hooks/useActivityGroups';
import { FormField } from '@/components/shared';
import type { ActivityGroup, CreateActivityGroup } from '@/types';

type FormData = CreateActivityGroup;

interface ActivityGroupDialogProps {
  open: boolean;
  onClose: () => void;
  workstreamId: string;
  activityGroup?: ActivityGroup | null;
}

export function ActivityGroupDialog({ open, onClose, workstreamId, activityGroup }: ActivityGroupDialogProps) {
  const { createActivityGroup, updateActivityGroup } = useActivityGroups(workstreamId);
  const isEdit = !!activityGroup;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(activityGroupSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      workstream_id: workstreamId,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (activityGroup) {
        reset({
          code: activityGroup.code,
          name: activityGroup.name,
          workstream_id: workstreamId,
          sort_order: activityGroup.sort_order,
        });
      } else {
        reset({
          code: '',
          name: '',
          workstream_id: workstreamId,
          sort_order: 0,
        });
      }
    }
  }, [open, activityGroup, workstreamId, reset]);

  const onSubmit = async (data: FormData) => {
    if (isEdit) {
      await updateActivityGroup({ id: activityGroup.id, data });
    } else {
      await createActivityGroup(data);
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
          {isEdit ? 'Edit Activity Group' : 'New Activity Group'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Code" error={errors.code?.message} required>
            <input
              {...register('code')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="AG-1"
            />
          </FormField>

          <FormField label="Name" error={errors.name?.message} required>
            <input
              {...register('name')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="Activity group name"
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
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
