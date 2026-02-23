import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { diagramSchema } from '@/lib/utils/validation';
import { FormField } from '@/components/shared';
import { SHEET_ICONS } from '@/lib/utils/sheetIcons';
import { useDiagramGroups } from '@/hooks/useDiagramGroups';
import { clsx } from 'clsx';

interface CreateDiagramFormValues {
  name: string;
  description: string | null;
}

interface CreateDiagramDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDiagramFormValues & { icon: string | null; group_id: string | null }) => Promise<void>;
  defaultGroupId?: string | null;
}

export function CreateDiagramDialog({ open, onClose, onSubmit, defaultGroupId }: CreateDiagramDialogProps) {
  const [selectedIcon, setSelectedIcon] = useState('Workflow');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { groups } = useDiagramGroups();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDiagramFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(diagramSchema) as any,
    defaultValues: { name: '', description: null },
  });

  useEffect(() => {
    if (open) {
      reset({ name: '', description: null });
      setSelectedIcon('Workflow');
      setSelectedGroupId(defaultGroupId ?? null);
    }
  }, [open, reset, defaultGroupId]);

  const handleFormSubmit = async (data: CreateDiagramFormValues) => {
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

        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Diagram</h3>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField label="Name" required error={errors.name?.message}>
            <input
              {...register('name')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              placeholder="e.g., Surveillance Notifiable Diseases Workflow"
            />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              placeholder="What does this diagram show?"
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
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </FormField>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-8 gap-1.5">
              {SHEET_ICONS.map(({ name, icon: IconComp }) => (
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
              {isSubmitting ? 'Creating...' : 'Create Diagram'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
