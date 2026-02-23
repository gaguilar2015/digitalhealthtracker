import { useState, useMemo } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/shared';
import type { DiagramMember, DiagramGroupMember, TeamMember } from '@/types';

interface ManageAccessDialogProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  diagramMembers: DiagramMember[];
  teamMembers: TeamMember[];
  onAddMember: (teamMemberId: string) => Promise<void>;
  onRemoveMember: (diagramMemberId: string) => Promise<void>;
  groupName?: string;
  groupColor?: string;
  groupMembers?: DiagramGroupMember[];
}

export function ManageAccessDialog({
  open, onClose, creatorId,
  diagramMembers, teamMembers,
  onAddMember, onRemoveMember,
  groupName, groupColor, groupMembers,
}: ManageAccessDialogProps) {
  const [selectedId, setSelectedId] = useState('');
  const [adding, setAdding] = useState(false);

  const memberIds = useMemo(
    () => new Set(diagramMembers.map(m => m.team_member_id)),
    [diagramMembers],
  );

  const groupMemberIds = useMemo(
    () => new Set((groupMembers ?? []).map(m => m.team_member_id)),
    [groupMembers],
  );

  const availableMembers = useMemo(
    () => teamMembers.filter(m => m.is_active && !memberIds.has(m.id) && !groupMemberIds.has(m.id)),
    [teamMembers, memberIds, groupMemberIds],
  );

  // Group members who are NOT already direct members
  const inheritedMembers = useMemo(
    () => (groupMembers ?? []).filter(gm => !memberIds.has(gm.team_member_id)),
    [groupMembers, memberIds],
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

        <div className="space-y-2">
          {diagramMembers.map(dm => {
            const member = teamMembers.find(m => m.id === dm.team_member_id);
            if (!member) return null;
            const isCreator = dm.team_member_id === creatorId;

            return (
              <div key={dm.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50">
                <div className="flex items-center gap-3">
                  <Avatar name={member.full_name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.full_name}
                      {isCreator && (
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">Creator</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{member.permission_level}</p>
                  </div>
                </div>
                {!isCreator && (
                  <button
                    onClick={() => onRemoveMember(dm.id)}
                    className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Inherited group members */}
        {groupName && inheritedMembers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-surface-100">
            <div className="flex items-center gap-2 mb-2">
              {groupColor && (
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: groupColor }} />
              )}
              <p className="text-xs font-medium text-gray-500">
                Via group: {groupName}
              </p>
            </div>
            <div className="space-y-2">
              {inheritedMembers.map(gm => {
                const member = teamMembers.find(m => m.id === gm.team_member_id);
                if (!member) return null;
                return (
                  <div key={gm.id} className="flex items-center justify-between p-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.full_name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.full_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {member.permission_level}
                          <span className="ml-1.5 text-gray-300">via {groupName}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
