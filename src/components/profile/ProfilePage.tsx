import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { profileSchema } from '@/lib/utils/validation';
import { teamMembersApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, FormField } from '@/components/shared';
import { ChangePasswordDialog } from './ChangePasswordDialog';
interface ProfileFormValues {
  full_name: string;
  title?: string | null;
  location?: string | null;
  phone?: string | null;
  bio?: string | null;
}

const PERMISSION_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const PERMISSION_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-700',
};

export default function ProfilePage() {
  const { user, teamMember } = useAuth();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      full_name: '',
      title: null,
      location: null,
      phone: null,
      bio: null,
    },
  });

  useEffect(() => {
    if (teamMember) {
      reset({
        full_name: teamMember.full_name,
        title: teamMember.title,
        location: teamMember.location,
        phone: teamMember.phone,
        bio: teamMember.bio,
      });
    }
  }, [teamMember, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!teamMember) return;
    try {
      await teamMembersApi.update(teamMember.id, data);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile');
    }
  };

  if (!teamMember) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: editable form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-surface-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={teamMember.full_name} url={teamMember.avatar_url} size="lg" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{teamMember.full_name}</h2>
              {teamMember.title && (
                <p className="text-sm text-gray-500">{teamMember.title}</p>
              )}
            </div>
          </div>

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
                placeholder="e.g., Project Manager"
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              />
            </FormField>

            <FormField label="Location" error={errors.location?.message}>
              <input
                {...register('location')}
                placeholder="e.g., Belize City, Belize"
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              />
            </FormField>

            <FormField label="Phone" error={errors.phone?.message}>
              <input
                {...register('phone')}
                type="tel"
                placeholder="e.g., +501 123-4567"
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              />
            </FormField>

            <FormField label="Bio" error={errors.bio?.message}>
              <textarea
                {...register('bio')}
                rows={3}
                placeholder="A short bio..."
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              />
            </FormField>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setPasswordDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
              >
                <KeyRound className="w-4 h-4" />
                Change Password
              </button>
            </div>
          </form>
        </div>

        {/* Right: read-only info */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6 h-fit">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Information</h3>
          <div className="space-y-4">
            <div>
              <span className="block text-xs text-gray-500 mb-1">Email</span>
              <span className="text-sm text-gray-900">{user?.email ?? teamMember.email}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 mb-1">Permission Level</span>
              <span
                className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${PERMISSION_COLORS[teamMember.permission_level]}`}
              >
                {PERMISSION_LABELS[teamMember.permission_level]}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500 mb-1">Member Since</span>
              <span className="text-sm text-gray-900">
                {format(new Date(teamMember.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </div>
  );
}
