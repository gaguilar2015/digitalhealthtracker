import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SheetRowComponent } from './SheetRowComponent';
import type { SheetRowComponentProps } from './SheetRowComponent';

type SortableSheetRowProps = Omit<SheetRowComponentProps, 'dragHandleProps' | 'isDragging'>;

export function SortableSheetRow(props: SortableSheetRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-surface-100 hover:bg-surface-50/50 ${isDragging ? 'opacity-50 bg-primary-50/30' : ''}`}
    >
      <SheetRowComponent
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </tr>
  );
}
