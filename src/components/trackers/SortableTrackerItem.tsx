import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableTrackerItemProps {
  id: string;
  children: ReactNode;
  /** When true, renders a compact version without the grip icon (used in collapsed sidebar) */
  compact?: boolean;
}

export function SortableTrackerItem({ id, children, compact }: SortableTrackerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 bg-primary-50/30 rounded-lg' : ''}`}
        {...attributes}
        {...listeners}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/drag relative ${isDragging ? 'opacity-50 bg-primary-50/30 rounded-lg' : ''}`}
    >
      <div
        className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing p-0.5 rounded text-gray-300 hover:text-gray-500 opacity-0 group-hover/drag:opacity-100 transition-opacity touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      {children}
    </div>
  );
}
