import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { z } from 'zod';
import { FormField } from '@/components/shared';
import { TRACKER_ICONS } from '@/lib/utils/trackerIcons';
import { useTrackerGroups } from '@/hooks/useTrackerGroups';
import { clsx } from 'clsx';
import type { Tracker } from '@/types';

const editTrackerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
});

interface EditTrackerFormValues {
  name: string;
  description: string | null;
}

interface EditTrackerDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EditTrackerFormValues & { icon: string | null; group_id: string | null }) => Promise<void>;
  tracker: Tracker;
}

export function EditTrackerDialog({ open, onClose, onSubmit, tracker }: EditTrackerDialogProps) {
  const [selectedIcon, setSelectedIcon] = useState<string>(tracker.icon ?? 'Table2');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(tracker.group_id);
  const { groups } = useTrackerGroups();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditTrackerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editTrackerSchema) as any,
    defaultValues: {
      name: tracker.name,
      description: tracker.description,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: tracker.name,
        description: tracker.description,
      });
      setSelectedIcon(tracker.icon ?? 'Table2');
      setSelectedGroupId(tracker.group_id);
    }
  }, [open, tracker, reset]);

  const handleFormSubmit = async (data: EditTrackerFormValues) => {
    await onSubmit({ ...data, icon: selectedIcon, group_id: selectedGroupId });
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

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Tracker</h3>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField label="Name" required error={errors.name?.message}>
            <input
              {...register('name')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          {groups.length > 0 && (
            <FormField label="Group">
              <select
                value={selectedGroupId ?? ''}
                onChange={e => setSelectedGroupId(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">No group</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {TRACKER_ICONS.map(({ name, icon: IconComp }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  className={clsx(
                    'p-2 rounded-lg transition-colors flex items-center justify-center',
                    selectedIcon === name
                      ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                      : 'hover:bg-surface-100 text-gray-500 hover:text-gray-700',
                  )}
                  title={name}
                >
                  <IconComp className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
