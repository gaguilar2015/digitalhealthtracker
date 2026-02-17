import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { trackerSchema } from '@/lib/utils/validation';
import { FormField } from '@/components/shared';
import { TRACKER_COLUMN_TYPES } from '@/types';
import { TRACKER_ICONS } from '@/lib/utils/trackerIcons';
import { useTrackerGroups } from '@/hooks/useTrackerGroups';
import { clsx } from 'clsx';

interface CreateTrackerFormValues {
  name: string;
  description: string | null;
  columns: { id: string; name: string; type: 'text' | 'number' | 'date' | 'select' | 'checkbox'; options?: string[] }[];
}

interface CreateTrackerDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTrackerFormValues & { icon: string | null; group_id: string | null }) => Promise<void>;
  defaultGroupId?: string | null;
}

function generateId() {
  return crypto.randomUUID();
}

export function CreateTrackerDialog({ open, onClose, onSubmit, defaultGroupId }: CreateTrackerDialogProps) {
  const [selectedIcon, setSelectedIcon] = useState('Table2');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { groups } = useTrackerGroups();
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTrackerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(trackerSchema) as any,
    defaultValues: {
      name: '',
      description: null,
      columns: [{ id: generateId(), name: '', type: 'text' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'columns' });

  useEffect(() => {
    if (open) {
      reset({
        name: '',
        description: null,
        columns: [{ id: generateId(), name: '', type: 'text' }],
      });
      setSelectedIcon('Table2');
      setSelectedGroupId(defaultGroupId ?? null);
    }
  }, [open, reset, defaultGroupId]);

  const handleFormSubmit = async (data: CreateTrackerFormValues) => {
    // Parse comma-separated options for select columns
    const processed = {
      ...data,
      icon: selectedIcon,
      group_id: selectedGroupId,
      columns: data.columns.map(col => ({
        ...col,
        options: col.type === 'select' && col.options
          ? col.options
          : undefined,
      })),
    };
    await onSubmit(processed);
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

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Tracker</h3>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField label="Name" required error={errors.name?.message}>
            <input
              {...register('name')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              placeholder="e.g., Data Quality Issue Log"
            />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              placeholder="What is this tracker for?"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Columns <span className="text-red-500">*</span>
            </label>
            {errors.columns?.message && (
              <p className="text-sm text-red-600 mb-2">{errors.columns.message}</p>
            )}
            <div className="space-y-3">
              {fields.map((field, index) => {
                const colType = watch(`columns.${index}.type`);
                return (
                  <div key={field.id} className="flex gap-2 items-start p-3 bg-surface-50 rounded-xl">
                    <input type="hidden" {...register(`columns.${index}.id`)} />
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          {...register(`columns.${index}.name`)}
                          placeholder="Column name"
                          className="flex-1 px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                        />
                        <select
                          {...register(`columns.${index}.type`)}
                          className="px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                        >
                          {TRACKER_COLUMN_TYPES.map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      {colType === 'select' && (
                        <input
                          {...register(`columns.${index}.options`)}
                          placeholder="Options (comma-separated, e.g., Low, Medium, High)"
                          className="w-full px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                          onChange={e => {
                            const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            // Store as array through the register
                            e.target.value = val.join(', ');
                          }}
                        />
                      )}
                      {errors.columns?.[index]?.name && (
                        <p className="text-xs text-red-600">{errors.columns[index].name?.message}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                      className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => append({ id: generateId(), name: '', type: 'text' })}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
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
              {isSubmitting ? 'Creating...' : 'Create Tracker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
