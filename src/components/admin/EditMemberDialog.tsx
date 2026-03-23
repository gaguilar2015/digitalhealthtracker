import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Eye, EyeOff, RefreshCw, Copy, Check, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { FormField } from '@/components/shared';
import { getAllSubordinateIds } from '@/lib/utils/hierarchy';
import type { TeamMember, PermissionLevel } from '@/types';

const editMemberSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  title: z.string().max(100).nullable().optional(),
  permission_level: z.enum(['admin', 'member', 'viewer']),
  supervisor_id: z.string().nullable().optional(),
});

interface EditMemberValues {
  full_name: string;
  title?: string | null;
  permission_level: PermissionLevel;
  supervisor_id?: string | null;
}

interface EditMemberDialogProps {
  open: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generatePassword(): string {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, byte => CHARSET[byte % CHARSET.length]).join('');
}

export function EditMemberDialog({ open, onClose, member }: EditMemberDialogProps) {
  const { updateMember, resetPassword, members } = useTeamMembers();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

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
      supervisor_id: null,
    },
  });

  useEffect(() => {
    if (open && member) {
      reset({
        full_name: member.full_name,
        title: member.title,
        permission_level: member.permission_level,
        supervisor_id: member.supervisor_id,
      });
      setShowResetPassword(false);
      setNewPassword('');
      setShowPassword(false);
      setCopied(false);
      setPasswordError('');
    }
  }, [open, member, reset]);

  const handleGenerate = () => {
    setNewPassword(generatePassword());
    setShowPassword(true);
    setCopied(false);
    setPasswordError('');
  };

  const handleCopy = async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetPassword = async () => {
    if (!member) return;
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setPasswordError('');
    setResetting(true);
    try {
      await resetPassword({ userId: member.id, password: newPassword });
      setShowResetPassword(false);
      setNewPassword('');
    } finally {
      setResetting(false);
    }
  };

  const onSubmit = async (data: EditMemberValues) => {
    if (!member) return;
    await updateMember({ id: member.id, data: { ...data, supervisor_id: data.supervisor_id || null } });
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

          <FormField label="Reports To">
            <select
              {...register('supervisor_id')}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">None (top level)</option>
              {members
                .filter(m => {
                  if (!member) return false;
                  if (m.id === member.id) return false;
                  // Prevent cycles: exclude anyone in this member's subordinate chain
                  const subordinates = getAllSubordinateIds(member.id, members);
                  return !subordinates.has(m.id);
                })
                .filter(m => m.is_active)
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}{m.title ? ` (${m.title})` : ''}
                  </option>
                ))}
            </select>
          </FormField>

          {/* Reset Password Section */}
          <div className="border-t border-surface-200 pt-4">
            {!showResetPassword ? (
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <KeyRound className="w-4 h-4" />
                Reset Password
              </button>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }}
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
                {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                <p className="text-xs text-gray-400">
                  Share this password with the user. They can change it later in their profile.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetting || !newPassword}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
                  >
                    {resetting ? 'Resetting...' : 'Set Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowResetPassword(false); setNewPassword(''); setPasswordError(''); }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
