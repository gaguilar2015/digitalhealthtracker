import { memo } from 'react';
import { Pencil, Copy, Trash2, Maximize, ArrowUp, ArrowDown, Scissors, Minus, CornerDownRight } from 'lucide-react';

export type ContextMenuType = 'node' | 'edge' | 'pane';

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  action: string;
  destructive?: boolean;
  submenu?: { label: string; action: string }[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  type: ContextMenuType;
  onAction: (action: string) => void;
  onClose: () => void;
  edgeType?: string;
}

const NODE_MENU: ContextMenuItem[] = [
  { label: 'Edit', icon: <Pencil className="w-3.5 h-3.5" />, action: 'edit' },
  { label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, action: 'duplicate' },
  { label: 'Bring to Front', icon: <ArrowUp className="w-3.5 h-3.5" />, action: 'toFront' },
  { label: 'Send to Back', icon: <ArrowDown className="w-3.5 h-3.5" />, action: 'toBack' },
  { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, action: 'delete', destructive: true },
];

const EDGE_TYPES = [
  { label: 'Smooth Step', action: 'edgeType:labeled' },
  { label: 'Straight', action: 'edgeType:straight' },
  { label: 'Bezier', action: 'edgeType:bezier' },
];

const PANE_MENU: ContextMenuItem[] = [
  { label: 'Paste', icon: <Copy className="w-3.5 h-3.5" />, action: 'paste' },
  { label: 'Select All', icon: <Maximize className="w-3.5 h-3.5" />, action: 'selectAll' },
  { label: 'Fit View', icon: <Scissors className="w-3.5 h-3.5" />, action: 'fitView' },
];

function ContextMenuComponent({ x, y, type, onAction, onClose, edgeType }: ContextMenuProps) {
  const items = type === 'node' ? NODE_MENU : type === 'edge' ? [] : PANE_MENU;

  return (
    <>
      {/* Backdrop to close */}
      <div className="fixed inset-0 z-[100]" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-[101] bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        {type === 'edge' ? (
          <>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Edge Type</div>
            {EDGE_TYPES.map(et => (
              <button
                key={et.action}
                onClick={() => { onAction(et.action); onClose(); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                  edgeType && et.action === `edgeType:${edgeType}` ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {et.label}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { onAction('straightenEdge'); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Minus className="w-3.5 h-3.5" />
              Straighten Edge
            </button>
            <button
              onClick={() => { onAction('makeOrthogonal'); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              Make Orthogonal
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { onAction('editLabel'); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Label
            </button>
            <button
              onClick={() => { onAction('delete'); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </>
        ) : (
          items.map(item => (
            <button
              key={item.action}
              onClick={() => { onAction(item.action); onClose(); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                item.destructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))
        )}
      </div>
    </>
  );
}

export const ContextMenu = memo(ContextMenuComponent);
