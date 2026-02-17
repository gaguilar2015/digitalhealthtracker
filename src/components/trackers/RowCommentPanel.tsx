import { useState, useRef, useEffect } from 'react';
import { X, Trash2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '@/components/shared/Avatar';
import type { TrackerRowComment, TrackerRow, Tracker, TeamMember } from '@/types';

interface RowCommentPanelProps {
  tracker: Tracker;
  row: TrackerRow;
  rowIndex: number;
  comments: TrackerRowComment[];
  teamMembers: TeamMember[];
  readOnly: boolean;
  currentUserId: string;
  isAdmin: boolean;
  onAddComment: (content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onClose: () => void;
}

export function RowCommentPanel({
  tracker,
  row,
  rowIndex,
  comments,
  teamMembers,
  readOnly,
  currentUserId,
  isAdmin,
  onAddComment,
  onDeleteComment,
  onClose,
}: RowCommentPanelProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(comments.length);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = comments.length;
  }, [comments.length]);

  const getMember = (id: string) => teamMembers.find(m => m.id === id);

  // Row label: use first column value or "Row #N"
  const firstCol = tracker.columns[0];
  const rowLabel = firstCol && row.cells[firstCol.id]
    ? String(row.cells[firstCol.id])
    : `Row #${rowIndex + 1}`;

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      onAddComment(trimmed);
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute right-0 top-0 w-96 bg-white rounded-xl border border-surface-200 shadow-lg z-20 flex flex-col animate-slide-in-right" style={{ height: 'min(600px, calc(100vh - 200px))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">{rowLabel}</span>
          <span className="text-xs text-gray-400 shrink-0">({comments.length})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Comments list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {comments.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            No comments yet.
          </div>
        )}
        {comments.map(comment => {
          const member = getMember(comment.created_by);
          const canDelete = comment.created_by === currentUserId || isAdmin;
          return (
            <div key={comment.id} className="group/comment">
              <div className="flex items-start gap-2.5">
                <Avatar
                  name={member?.full_name ?? 'Unknown'}
                  url={member?.avatar_url}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {member?.full_name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="p-0.5 rounded hover:bg-surface-100 text-gray-300 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-opacity ml-auto shrink-0"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer input */}
      {!readOnly && (
        <div className="border-t border-surface-200 px-4 py-3 shrink-0">
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment..."
              rows={2}
              className="flex-1 text-sm border border-surface-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              className="self-end px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Press Cmd+Enter to submit
          </p>
        </div>
      )}
    </div>
  );
}
