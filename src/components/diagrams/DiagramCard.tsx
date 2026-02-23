import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { getSheetIcon } from '@/lib/utils/sheetIcons';
import type { Diagram, TeamMember } from '@/types';

interface DiagramCardProps {
  diagram: Diagram;
  teamMembers: TeamMember[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  onEdit: (diagram: Diagram) => void;
  onDelete: (diagram: Diagram) => void;
}

export function DiagramCard({ diagram, teamMembers, currentUserId, isAdmin, onEdit, onDelete }: DiagramCardProps) {
  const navigate = useNavigate();
  const creator = teamMembers.find(m => m.id === diagram.created_by);
  const canModify = isAdmin || currentUserId === diagram.created_by;
  const Icon = getSheetIcon(diagram.icon);
  const nodeCount = Array.isArray(diagram.flow_data?.nodes) ? diagram.flow_data.nodes.length : 0;

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-surface-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/diagrams/${diagram.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-gray-900 truncate">
            {diagram.name}
          </span>
        </div>
        {canModify && (
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onEdit(diagram)}
              className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(diagram)}
              className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {diagram.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{diagram.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {creator ? `Created by ${creator.full_name}` : 'Created'} &middot;{' '}
          {format(new Date(diagram.updated_at), 'MMM d, yyyy')}
        </span>
        <span>{nodeCount} node{nodeCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
