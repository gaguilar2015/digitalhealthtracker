import { useState } from 'react';
import { Pencil, Users } from 'lucide-react';
import { WorkstreamBadge, Avatar, ProgressBar, ManageAccessDialog } from '@/components/shared';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useActivities } from '@/hooks/useActivities';
import { useDeliverables } from '@/hooks/useDeliverables';
import { useAllTasks } from '@/hooks/useTasks';
import { usePermissions } from '@/hooks/usePermissions';
import { useWorkstreamMembers } from '@/hooks/useWorkstreamMembers';
import { useAuth } from '@/hooks/useAuth';
import { formatDateRange, calculateProgress, calculateDeepProgress } from '@/lib/utils';
import { WorkstreamDialog } from './WorkstreamDialog';
import type { Workstream } from '@/types';

interface WorkstreamHeaderProps {
  workstream: Workstream;
  activeTab?: 'activities' | 'deliverables';
}

export function WorkstreamHeader({ workstream, activeTab = 'activities' }: WorkstreamHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const { members: teamMembers } = useTeamMembers();
  const { activities } = useActivities(workstream.id);
  const { deliverables } = useDeliverables(workstream.id);
  const { canEditItem } = usePermissions(workstream);
  const { members: workstreamMembers, addMember, removeMember } = useWorkstreamMembers(workstream.id);
  const { isAdmin, teamMember } = useAuth();

  const owner = workstream.owner_id
    ? teamMembers.find(m => m.id === workstream.owner_id)
    : null;

  const { tasks: allTasks } = useAllTasks();

  const isDeliverables = activeTab === 'deliverables';
  const itemLabel = isDeliverables ? 'deliverables' : 'activities';

  // For activities tab: use deep progress (counting tasks within activities)
  // For deliverables tab: deliverables have no sub-items, use simple progress
  const activityIds = new Set(activities.map(a => a.id));
  const relevantTasks = allTasks.filter(t => activityIds.has(t.activity_id));
  const progress = isDeliverables
    ? calculateProgress(deliverables)
    : calculateDeepProgress(activities, relevantTasks);

  // Count leaf items for the display text
  const completedCount = isDeliverables
    ? deliverables.filter(d => d.status === 'complete').length
    : (() => {
        let completed = 0;
        for (const activity of activities) {
          const actTasks = relevantTasks.filter(t => t.activity_id === activity.id);
          if (actTasks.length > 0) {
            completed += actTasks.filter(t => t.status === 'complete').length;
          } else {
            completed += activity.status === 'complete' ? 1 : 0;
          }
        }
        return completed;
      })();
  const totalCount = isDeliverables
    ? deliverables.length
    : (() => {
        let total = 0;
        for (const activity of activities) {
          const actTasks = relevantTasks.filter(t => t.activity_id === activity.id);
          total += actTasks.length > 0 ? actTasks.length : 1;
        }
        return total;
      })();

  const descriptionIsLong = (workstream.description?.length ?? 0) > 150;

  // Can manage access: admin or workstream owner
  const canManageAccess = isAdmin || (teamMember && workstream.owner_id === teamMember.id);

  return (
    <>
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <WorkstreamBadge code={workstream.code} color={workstream.color} />
            <h2 className="text-xl font-bold text-gray-900">{workstream.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            {canManageAccess && (
              <button
                onClick={() => setAccessOpen(true)}
                className="p-1.5 rounded hover:bg-surface-100"
                title="Manage access"
              >
                <Users className="w-4 h-4 text-gray-400" />
              </button>
            )}
            {canEditItem && (
              <button
                onClick={() => setEditOpen(true)}
                className="p-1.5 rounded hover:bg-surface-100"
                title="Edit workstream"
              >
                <Pencil className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
          <span>{formatDateRange(workstream.start_date, workstream.end_date)}</span>
          {owner && (
            <div className="flex items-center gap-1.5">
              <Avatar name={owner.full_name} url={owner.avatar_url} size="sm" />
              <span>{owner.full_name}</span>
            </div>
          )}
        </div>

        {workstream.description && (
          <div className="mb-3">
            <p className="text-sm text-gray-600">
              {descriptionIsLong && !descExpanded
                ? workstream.description.slice(0, 150) + '...'
                : workstream.description}
            </p>
            {descriptionIsLong && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-xs text-primary-500 hover:text-primary-600 mt-1"
              >
                {descExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-48">
            <ProgressBar value={progress} />
          </div>
          <span className="text-sm text-gray-500">
            {completedCount} of {totalCount} {isDeliverables ? itemLabel : 'items'} complete ({Math.round(progress)}%)
          </span>
        </div>
      </div>

      <WorkstreamDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        workstream={workstream}
      />

      <ManageAccessDialog
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
        ownerId={workstream.owner_id ?? ''}
        ownerLabel="Owner"
        members={workstreamMembers}
        teamMembers={teamMembers}
        onAddMember={async (teamMemberId) => {
          await addMember({ workstream_id: workstream.id, team_member_id: teamMemberId });
        }}
        onRemoveMember={removeMember}
      />
    </>
  );
}
