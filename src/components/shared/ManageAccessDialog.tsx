import { useState, useMemo } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';
import type { TeamMember } from '@/types';

interface MemberRecord {
  id: string;
  team_member_id: string;
}

interface ManageAccessDialogProps {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  ownerLabel?: string;
  members: MemberRecord[];
  teamMembers: TeamMember[];
  onAddMember: (teamMemberId: string) => Promise<void>;
  onRemoveMember: (memberRecordId: string) => Promise<void>;
}

export function ManageAccessDialog({
  open, onClose, ownerId, ownerLabel = 'Owner',
  members, teamMembers,
  onAddMember, onRemoveMember,
}: ManageAccessDialogProps) {
  const [selectedId, setSelectedId] = useState('');
  const [adding, setAdding] = useState(false);

  const memberIds = useMemo(
    () => new Set(members.map(m => m.team_member_id)),
    [members],
  );

  const availableMembers = useMemo(
    () => teamMembers.filter(m => m.is_active && !memberIds.has(m.id)),
    [teamMembers, memberIds],
  );

  const handleAdd = async () => {
    if (!selectedId) return;
    setAdding(true);
    try {
      await onAddMember(selectedId);
      setSelectedId('');
    } finally {
      setAdding(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Access</h3>

        {/* Add member */}
        {availableMembers.length > 0 && (
          <div className="flex gap-2 mb-4">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Select a team member...</option>
              {availableMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.permission_level})
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!selectedId || adding}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {adding ? '...' : 'Add'}
            </button>
          </div>
        )}

        {/* Current members */}
        <div className="space-y-2">
          {members.map(tm => {
            const member = teamMembers.find(m => m.id === tm.team_member_id);
            if (!member) return null;
            const isOwner = tm.team_member_id === ownerId;

            return (
              <div key={tm.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50">
                <div className="flex items-center gap-3">
                  <Avatar name={member.full_name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.full_name}
                      {isOwner && (
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">{ownerLabel}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{member.permission_level}</p>
                  </div>
                </div>
                {!isOwner && (
                  <button
                    onClick={() => onRemoveMember(tm.id)}
                    className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
