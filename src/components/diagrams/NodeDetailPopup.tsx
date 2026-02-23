import { X, Pencil } from 'lucide-react';
import type { DiagramNodeData } from '@/types';

interface NodeDetailPopupProps {
  nodeData: DiagramNodeData;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit?: () => void;
}

export function NodeDetailPopup({ nodeData, position, onClose, onEdit }: NodeDetailPopupProps) {
  return (
    <div
      className="absolute z-20 bg-white rounded-xl shadow-lg border border-surface-200 p-4 min-w-[200px] max-w-[300px]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded bg-gray-100 text-gray-500 mb-1">
            {nodeData.nodeType}
          </span>
          <h4 className="text-sm font-semibold text-gray-900">{nodeData.label}</h4>
        </div>
        <div className="flex items-center gap-0.5">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {nodeData.description && (
        <p className="text-xs text-gray-500 mb-2">{nodeData.description}</p>
      )}

      {nodeData.details && (
        <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">{nodeData.details}</p>
      )}

      {nodeData.detailFields && nodeData.detailFields.length > 0 && (
        <div className="space-y-1 border-t border-surface-100 pt-2 mt-2">
          {nodeData.detailFields.map((field, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider shrink-0">
                {field.label}
              </span>
              <span className="text-xs text-gray-700">{field.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
