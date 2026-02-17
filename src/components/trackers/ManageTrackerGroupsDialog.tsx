import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { useTrackerGroups } from '@/hooks/useTrackerGroups';
import { useTrackerGroupMembers } from '@/hooks/useTrackerGroupMembers';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { WORKSTREAM_COLOR_HEX } from '@/lib/utils/colors';
import { ManageGroupAccessDialog } from './ManageGroupAccessDialog';

interface ManageTrackerGroupsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface GroupDraft {
  id: string;
  name: string;
  description: string;
  color: string;
  isNew: boolean;
}

const COLOR_OPTIONS = Object.values(WORKSTREAM_COLOR_HEX);

export function ManageTrackerGroupsDialog({ open, onClose }: ManageTrackerGroupsDialogProps) {
  const { user } = useAuth();
  const { groups, createGroup, updateGroup, deleteGroup } = useTrackerGroups();
  const { members: teamMembers } = useTeamMembers();
  const [drafts, setDrafts] = useState<GroupDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [expandedColorPicker, setExpandedColorPicker] = useState<string | null>(null);
  const [accessGroupId, setAccessGroupId] = useState<string | null>(null);

  const accessGroup = accessGroupId ? groups.find(g => g.id === accessGroupId) : null;
  const { groupMembers, addGroupMember, removeGroupMember } = useTrackerGroupMembers(accessGroupId ?? undefined);

  useEffect(() => {
    if (open) {
      setDrafts(
        groups.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description ?? '',
          color: g.color ?? COLOR_OPTIONS[0],
          isNew: false,
        })),
      );
      setDeletedIds(new Set());
      setExpandedColorPicker(null);
    }
  }, [open, groups]);

  const addDraft = () => {
    const newId = crypto.randomUUID();
    setDrafts(prev => [
      ...prev,
      {
        id: newId,
        name: '',
        description: '',
        color: COLOR_OPTIONS[prev.length % COLOR_OPTIONS.length],
        isNew: true,
      },
    ]);
    setExpandedColorPicker(null);
  };

  const updateDraft = (index: number, updates: Partial<GroupDraft>) => {
    setDrafts(prev => prev.map((d, i) => (i === index ? { ...d, ...updates } : d)));
  };

  const removeDraft = (index: number) => {
    const draft = drafts[index];
    if (!draft.isNew) {
      setDeletedIds(prev => new Set(prev).add(draft.id));
    }
    setDrafts(prev => prev.filter((_, i) => i !== index));
    if (expandedColorPicker === draft.id) setExpandedColorPicker(null);
  };

  const moveDraft = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= drafts.length) return;
    setDrafts(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete removed groups
      for (const id of deletedIds) {
        await deleteGroup(id);
      }

      // Create new, update existing
      for (let i = 0; i < drafts.length; i++) {
        const draft = drafts[i];
        if (draft.isNew) {
          await createGroup({
            name: draft.name,
            description: draft.description || null,
            color: draft.color,
            sort_order: i,
            created_by: user!.id,
          });
        } else {
          // Check if changed
          const original = groups.find(g => g.id === draft.id);
          if (
            original &&
            (original.name !== draft.name ||
              (original.description ?? '') !== draft.description ||
              (original.color ?? '') !== draft.color ||
              original.sort_order !== i)
          ) {
            await updateGroup({
              id: draft.id,
              data: {
                name: draft.name,
                description: draft.description || null,
                color: draft.color,
                sort_order: i,
              },
            });
          }
        }
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const hasEmptyNames = drafts.some(d => !d.name.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-1">Manage Tracker Groups</h3>
        <p className="text-sm text-gray-500 mb-4">
          Organize trackers into collapsible folders in the sidebar.
        </p>

        <div className="space-y-2">
          {drafts.map((draft, index) => (
            <div key={draft.id} className="bg-surface-50 rounded-xl p-2.5">
              {/* Main row: reorder | color swatch | name | delete */}
              <div className="flex gap-2 items-center">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveDraft(index, -1)}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-surface-200 text-gray-400 disabled:opacity-20"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDraft(index, 1)}
                    disabled={index === drafts.length - 1}
                    className="p-0.5 rounded hover:bg-surface-200 text-gray-400 disabled:opacity-20"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedColorPicker(expandedColorPicker === draft.id ? null : draft.id)}
                  className="w-7 h-7 rounded-full border-2 border-surface-200 shrink-0 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: draft.color }}
                  title="Change color"
                />
                <input
                  value={draft.name}
                  onChange={e => updateDraft(index, { name: e.target.value })}
                  placeholder="Group name"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                />
                {!draft.isNew && (
                  <button
                    type="button"
                    onClick={() => setAccessGroupId(draft.id)}
                    className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-primary-600 shrink-0"
                    title="Manage group access"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeDraft(index)}
                  className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expanded color picker */}
              {expandedColorPicker === draft.id && (
                <div className="flex gap-1.5 flex-wrap mt-2 ml-8 pl-1">
                  {COLOR_OPTIONS.map(hex => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => {
                        updateDraft(index, { color: hex });
                        setExpandedColorPicker(null);
                      }}
                      className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: hex,
                        borderColor: draft.color === hex ? '#1f2937' : 'transparent',
                        transform: draft.color === hex ? 'scale(1.15)' : undefined,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Description row */}
              <div className="mt-1.5 ml-8 pl-1">
                <input
                  value={draft.description}
                  onChange={e => updateDraft(index, { description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-2.5 py-1 text-xs border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500 text-gray-500"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addDraft}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Group
        </button>

        <p className="mt-2 text-xs text-gray-400">
          Trackers not assigned to a group will appear under &quot;Ungrouped&quot;.
        </p>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-surface-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || hasEmptyNames}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Group access dialog */}
      {accessGroup && (
        <ManageGroupAccessDialog
          open={!!accessGroupId}
          onClose={() => setAccessGroupId(null)}
          groupId={accessGroup.id}
          groupName={accessGroup.name}
          groupColor={accessGroup.color ?? '#6B7280'}
          creatorId={accessGroup.created_by}
          groupMembers={groupMembers}
          teamMembers={teamMembers}
          onAddMember={async (teamMemberId) => {
            await addGroupMember({ tracker_group_id: accessGroup.id, team_member_id: teamMemberId });
          }}
          onRemoveMember={removeGroupMember}
        />
      )}
    </div>
  );
}
