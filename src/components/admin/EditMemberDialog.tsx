import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { z } from 'zod';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { FormField } from '@/components/shared';
import type { TeamMember, PermissionLevel } from '@/types';

const editMemberSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  title: z.string().max(100).nullable().optional(),
  permission_level: z.enum(['admin', 'member', 'viewer']),
});

interface EditMemberValues {
  full_name: string;
  title?: string | null;
  permission_level: PermissionLevel;
}

interface EditMemberDialogProps {
  open: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

export function EditMemberDialog({ open, onClose, member }: EditMemberDialogProps) {
  const { updateMember } = useTeamMembers();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditMemberValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editMemberSchema) as any,
    defaultValues: {
      full_name: '',
      title: null,
      permission_level: 'member',
    },
  });

  useEffect(() => {
    if (open && member) {
      reset({
        full_name: member.full_name,
        title: member.title,
        permission_level: member.permission_level,
      });
    }
  }, [open, member, reset]);

  const onSubmit = async (data: EditMemberValues) => {
    if (!member) return;
    await updateMember({ id: member.id, data });
    onClose();
  };

  if (!open || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Team Member</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Full Name" required error={errors.full_name?.message}>
            <input
              {...register('full_name')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Title" error={errors.title?.message}>
            <input
              {...register('title')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Permission Level" required error={errors.permission_level?.message}>
            <select
              {...register('permission_level')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </FormField>

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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
