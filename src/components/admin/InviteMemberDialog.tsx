import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';
import { inviteMemberSchema } from '@/lib/utils/validation';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { FormField } from '@/components/shared';

interface InviteFormValues {
  email: string;
  full_name: string;
  title: string | null;
  permission_level: 'admin' | 'member' | 'viewer';
  password: string;
}

interface InviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
}

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generatePassword(): string {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, byte => CHARSET[byte % CHARSET.length]).join('');
}

export function InviteMemberDialog({ open, onClose }: InviteMemberDialogProps) {
  const { inviteMember } = useTeamMembers();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(inviteMemberSchema) as any,
    defaultValues: {
      email: '',
      full_name: '',
      title: null,
      permission_level: 'member',
      password: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        email: '',
        full_name: '',
        title: null,
        permission_level: 'member',
        password: '',
      });
      setShowPassword(false);
      setCopied(false);
    }
  }, [open, reset]);

  const handleGenerate = () => {
    setValue('password', generatePassword(), { shouldValidate: true });
    setShowPassword(true);
    setCopied(false);
  };

  const handleCopy = async () => {
    const pw = getValues('password');
    if (!pw) return;
    await navigator.clipboard.writeText(pw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (data: InviteFormValues) => {
    await inviteMember({
      ...data,
      title: data.title ?? null,
    });
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

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Team Member</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Email" required error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              placeholder="name@example.com"
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Full Name" required error={errors.full_name?.message}>
            <input
              {...register('full_name')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Title" error={errors.title?.message}>
            <input
              {...register('title')}
              placeholder="e.g., Health Systems Analyst"
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

          <FormField label="Password" required error={errors.password?.message}>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 pr-9 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="px-2 py-2 text-gray-400 hover:text-gray-600 border border-surface-200 rounded-xl hover:bg-surface-50"
                title="Generate password"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-2 text-gray-400 hover:text-gray-600 border border-surface-200 rounded-xl hover:bg-surface-50"
                title="Copy password"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Share this password with the user. They can change it later in their profile.
            </p>
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
              {isSubmitting ? 'Creating...' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
