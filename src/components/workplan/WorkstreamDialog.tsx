import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { workstreamSchema } from '@/lib/utils/validation';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { FormField, ColorPicker } from '@/components/shared';
import type { Workstream, WorkstreamColor, CreateWorkstream } from '@/types';

type FormData = CreateWorkstream;

interface WorkstreamDialogProps {
  open: boolean;
  onClose: () => void;
  workstream?: Workstream | null;
}

export function WorkstreamDialog({ open, onClose, workstream }: WorkstreamDialogProps) {
  const { createWorkstream, updateWorkstream } = useWorkstreams();
  const { members } = useTeamMembers();
  const isEdit = !!workstream;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(workstreamSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      short_name: '',
      description: '',
      start_date: '',
      end_date: '',
      color: 'blue',
      owner_id: null,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (workstream) {
        reset({
          code: workstream.code,
          name: workstream.name,
          short_name: workstream.short_name,
          description: workstream.description ?? '',
          start_date: workstream.start_date,
          end_date: workstream.end_date,
          color: workstream.color,
          owner_id: workstream.owner_id,
          sort_order: workstream.sort_order,
        });
      } else {
        reset({
          code: '',
          name: '',
          short_name: '',
          description: '',
          start_date: '',
          end_date: '',
          color: 'blue',
          owner_id: null,
          sort_order: 0,
        });
      }
    }
  }, [open, workstream, reset]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      description: data.description || null,
      owner_id: data.owner_id || null,
      color: data.color as WorkstreamColor,
    };
    if (isEdit) {
      await updateWorkstream({ id: workstream.id, data: payload });
    } else {
      await createWorkstream(payload);
    }
    onClose();
  };

  if (!open) return null;

  const selectedColor = watch('color');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {isEdit ? 'Edit Workstream' : 'New Workstream'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" error={errors.code?.message} required>
              <input
                {...register('code')}
                className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                placeholder="WS-1"
              />
            </FormField>
            <FormField label="Short Name" error={errors.short_name?.message} required>
              <input
                {...register('short_name')}
                className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                placeholder="Short label"
              />
            </FormField>
          </div>

          <FormField label="Name" error={errors.name?.message} required>
            <input
              {...register('name')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="Full workstream name"
            />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              placeholder="Optional description"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" error={errors.start_date?.message} required>
              <input
                type="date"
                {...register('start_date')}
                className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              />
            </FormField>
            <FormField label="End Date" error={errors.end_date?.message} required>
              <input
                type="date"
                {...register('end_date')}
                className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              />
            </FormField>
          </div>

          <FormField label="Color" error={errors.color?.message} required>
            <ColorPicker
              value={(selectedColor as WorkstreamColor) || ''}
              onChange={(c) => setValue('color', c)}
            />
          </FormField>

          <FormField label="Owner">
            <select
              {...register('owner_id')}
              className="w-full rounded-xl border-surface-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">No owner</option>
              {members.filter(m => m.is_active).map(m => (
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
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Workstream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
