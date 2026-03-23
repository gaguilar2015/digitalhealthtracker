import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { teamMembersApi } from '@/lib/api';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { UpdateTeamMember, PermissionLevel } from '@/types';

export function useTeamMembers() {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();

  const query = useQuery({
    queryKey: queryKeys.teamMembers.all(),
    queryFn: teamMembersApi.getAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamMember }) => teamMembersApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.all() });
      logEvent({ event_type: 'update', entity_type: 'team_member', entity_id: id });
      toast.success('Team member updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => teamMembersApi.deactivate(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.all() });
      logEvent({ event_type: 'update', entity_type: 'team_member', entity_id: id });
      toast.success('Member deactivated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => teamMembersApi.reactivate(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.all() });
      logEvent({ event_type: 'update', entity_type: 'team_member', entity_id: id });
      toast.success('Member reactivated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; full_name: string; title: string | null; permission_level: PermissionLevel; password: string; supervisor_id?: string | null }) =>
      teamMembersApi.invite(data.email, data.full_name, data.title, data.permission_level, data.password, data.supervisor_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.teamMembers.all() });
      logEvent({ event_type: 'create', entity_type: 'team_member' });
      toast.success('Member created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      teamMembersApi.resetPassword(data.userId, data.password),
    onSuccess: () => {
      toast.success('Password reset');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    updateMember: updateMutation.mutateAsync,
    deactivateMember: deactivateMutation.mutateAsync,
    reactivateMember: reactivateMutation.mutateAsync,
    inviteMember: inviteMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
  };
}
