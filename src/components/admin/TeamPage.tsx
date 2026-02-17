import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { SkeletonLoader, ConfirmDialog } from '@/components/shared';
import { TeamTable } from './TeamTable';
import { InviteMemberDialog } from './InviteMemberDialog';
import { EditMemberDialog } from './EditMemberDialog';
import type { TeamMember } from '@/types';

export default function TeamPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { members, isLoading, deactivateMember, reactivateMember, resendInvite } = useTeamMembers();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deactivatingMember, setDeactivatingMember] = useState<TeamMember | null>(null);

  if (authLoading) return null;

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleDeactivate = async () => {
    if (deactivatingMember) {
      await deactivateMember(deactivatingMember.id);
      setDeactivatingMember(null);
    }
  };

  const handleReactivate = async (member: TeamMember) => {
    await reactivateMember(member.id);
  };

  const handleResendInvite = async (member: TeamMember) => {
    await resendInvite(member.email);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {isLoading ? (
        <SkeletonLoader variant="table" count={5} />
      ) : (
        <TeamTable
          members={members}
          onEdit={setEditingMember}
          onDeactivate={setDeactivatingMember}
          onReactivate={handleReactivate}
          onResendInvite={handleResendInvite}
        />
      )}

      <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />

      <EditMemberDialog
        open={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
      />

      <ConfirmDialog
        open={!!deactivatingMember}
        onClose={() => setDeactivatingMember(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Member"
        message={`Are you sure you want to deactivate ${deactivatingMember?.full_name}? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        destructive
      />
    </div>
  );
}
