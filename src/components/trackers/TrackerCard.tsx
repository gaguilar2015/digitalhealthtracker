import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { getTrackerIcon } from '@/lib/utils/trackerIcons';
import type { Tracker, TeamMember } from '@/types';

interface TrackerCardProps {
  tracker: Tracker;
  teamMembers: TeamMember[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  onEdit: (tracker: Tracker) => void;
  onDelete: (tracker: Tracker) => void;
}

export function TrackerCard({ tracker, teamMembers, currentUserId, isAdmin, onEdit, onDelete }: TrackerCardProps) {
  const navigate = useNavigate();
  const creator = teamMembers.find(m => m.id === tracker.created_by);
  const canModify = isAdmin || currentUserId === tracker.created_by;
  const Icon = getTrackerIcon(tracker.icon);

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-surface-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/trackers/${tracker.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-gray-500">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-gray-900 truncate">
            {tracker.name}
          </span>
        </div>
        {canModify && (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onEdit(tracker)}
              className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(tracker)}
              className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {tracker.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{tracker.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {creator ? `Created by ${creator.full_name}` : 'Created'} &middot;{' '}
          {format(new Date(tracker.updated_at), 'MMM d, yyyy')}
        </span>
        <span>{tracker.columns.length} column{tracker.columns.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
