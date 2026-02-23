import { useState, useRef, useEffect } from 'react';
import { Shapes, RectangleHorizontal, Squircle, Cylinder, Diamond, FileText, Cloud, User, Drum, StickyNote, Circle, SquareDashed } from 'lucide-react';
import type { DiagramNodeType } from '@/types';

const nodeTypeItems: { type: DiagramNodeType; label: string; icon: typeof RectangleHorizontal; description: string }[] = [
  { type: 'system', label: 'Rectangle', icon: RectangleHorizontal, description: 'Systems & tools' },
  { type: 'process', label: 'Rounded Rectangle', icon: Squircle, description: 'Processes & steps' },
  { type: 'database', label: 'Cylinder', icon: Cylinder, description: 'Data stores' },
  { type: 'form', label: 'Parallelogram', icon: Diamond, description: 'Data entry' },
  { type: 'decision', label: 'Diamond', icon: Diamond, description: 'Decision points' },
  { type: 'document', label: 'Document', icon: FileText, description: 'Reports & outputs' },
  { type: 'cloud', label: 'Cloud', icon: Cloud, description: 'External services' },
  { type: 'person', label: 'Person', icon: User, description: 'Actors & users' },
  { type: 'queue', label: 'Queue', icon: Drum, description: 'Message buffers' },
  { type: 'note', label: 'Note', icon: StickyNote, description: 'Annotations' },
  { type: 'terminal', label: 'Oval', icon: Circle, description: 'Start/end points' },
  { type: 'group', label: 'Container', icon: SquareDashed, description: 'Zones & areas' },
];

interface NodePaletteProps {
  onAddNode: (type: DiagramNodeType) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (type: DiagramNodeType) => {
    onAddNode(type);
    setOpen(false);
  };

  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          open ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Shapes className="w-4 h-4" />
        Shapes
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-[280px] grid grid-cols-3 gap-1">
          {nodeTypeItems.map(item => (
            <button
              key={item.type}
              onClick={() => handleClick(item.type)}
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 border border-transparent transition-colors"
              title={item.description}
            >
              <item.icon className="w-4 h-4 text-gray-500" />
              <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
