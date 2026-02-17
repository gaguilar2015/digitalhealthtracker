import { Link2, FileText, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Resource, TeamMember } from '@/types';

interface ResourceCardProps {
  resource: Resource;
  teamMembers: TeamMember[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  onEdit: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function ResourceCard({ resource, teamMembers, currentUserId, isAdmin, onEdit, onDelete }: ResourceCardProps) {
  const creator = teamMembers.find(m => m.id === resource.created_by);
  const canModify = isAdmin || currentUserId === resource.created_by;

  const handleClick = () => {
    if (resource.type === 'link' && resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    } else if (resource.type === 'file' && resource.file_url) {
      window.open(resource.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <button
          onClick={handleClick}
          className="flex items-center gap-2 text-left group min-w-0"
        >
          <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center text-gray-500">
            {resource.type === 'link' ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <span className="text-sm font-medium text-gray-900 group-hover:text-primary-600 truncate">
            {resource.label}
          </span>
        </button>
        {canModify && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(resource)}
              className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(resource)}
              className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {resource.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{resource.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {creator ? `Added by ${creator.full_name}` : 'Added'} &middot;{' '}
          {format(new Date(resource.created_at), 'MMM d, yyyy')}
        </span>
        <span className="truncate ml-2">
          {resource.type === 'link' && resource.url
            ? getDomain(resource.url)
            : resource.file_size != null
              ? formatFileSize(resource.file_size)
              : null}
        </span>
      </div>
    </div>
  );
}
