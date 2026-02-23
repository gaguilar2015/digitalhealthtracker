import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { FormField } from '@/components/shared';
import { DIAGRAM_NODE_TYPES } from '@/types';
import type { DiagramNodeData, DiagramNodeType, DiagramLegendItem } from '@/types';

interface NodeEditorProps {
  open: boolean;
  onClose: () => void;
  nodeData: DiagramNodeData;
  onSave: (data: Partial<DiagramNodeData>) => void;
  legendItems: DiagramLegendItem[];
}

export function NodeEditor({ open, onClose, nodeData, onSave, legendItems }: NodeEditorProps) {
  const [label, setLabel] = useState(nodeData.label);
  const [description, setDescription] = useState(nodeData.description ?? '');
  const [nodeType, setNodeType] = useState<DiagramNodeType>(nodeData.nodeType);
  const [color, setColor] = useState(nodeData.color ?? '');
  const [borderColor, setBorderColor] = useState(nodeData.borderColor ?? '');
  const [details, setDetails] = useState(nodeData.details ?? '');
  const [fontSize, setFontSize] = useState<number | undefined>(nodeData.fontSize);
  const [detailFields, setDetailFields] = useState<{ label: string; value: string }[]>(
    nodeData.detailFields ?? [],
  );

  useEffect(() => {
    if (open) {
      setLabel(nodeData.label);
      setDescription(nodeData.description ?? '');
      setNodeType(nodeData.nodeType);
      setColor(nodeData.color ?? '');
      setBorderColor(nodeData.borderColor ?? '');
      setDetails(nodeData.details ?? '');
      setFontSize(nodeData.fontSize);
      setDetailFields(nodeData.detailFields ?? []);
    }
  }, [open, nodeData]);

  const handleSave = () => {
    onSave({
      label,
      description: description || undefined,
      nodeType,
      color: color || undefined,
      borderColor: borderColor || undefined,
      fontSize: fontSize || undefined,
      details: details || undefined,
      detailFields: detailFields.length > 0 ? detailFields : undefined,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Node</h3>

        <div className="space-y-4">
          <FormField label="Label" required>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            />
          </FormField>

          <FormField label="Node Type">
            <select
              value={nodeType}
              onChange={e => setNodeType(e.target.value as DiagramNodeType)}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
            >
              {DIAGRAM_NODE_TYPES.map(t => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Fill Color">
              <div className="flex items-center gap-2">
                {color ? (
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-8 h-8 rounded border border-surface-200 cursor-pointer shrink-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setColor('#EFF6FF')}
                    className="w-8 h-8 rounded border-2 border-dashed border-gray-300 shrink-0 flex items-center justify-center bg-white hover:border-gray-400 transition-colors"
                    title="Click to set a fill color"
                  >
                    <span className="text-gray-300 text-xs leading-none">/</span>
                  </button>
                )}
                <input
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="Default"
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-surface-200 rounded-lg"
                />
              </div>
              {color && (
                <button
                  type="button"
                  onClick={() => setColor('')}
                  className="mt-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Reset to default
                </button>
              )}
            </FormField>
            <FormField label="Border Color">
              <div className="flex items-center gap-2">
                {borderColor ? (
                  <input
                    type="color"
                    value={borderColor}
                    onChange={e => setBorderColor(e.target.value)}
                    className="w-8 h-8 rounded border border-surface-200 cursor-pointer shrink-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setBorderColor('#93C5FD')}
                    className="w-8 h-8 rounded border-2 border-dashed border-gray-300 shrink-0 flex items-center justify-center bg-white hover:border-gray-400 transition-colors"
                    title="Click to set a border color"
                  >
                    <span className="text-gray-300 text-xs leading-none">/</span>
                  </button>
                )}
                <input
                  value={borderColor}
                  onChange={e => setBorderColor(e.target.value)}
                  placeholder="Default"
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-surface-200 rounded-lg"
                />
              </div>
              {borderColor && (
                <button
                  type="button"
                  onClick={() => setBorderColor('')}
                  className="mt-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Reset to default
                </button>
              )}
            </FormField>
          </div>

          <FormField label="Font Size">
            <div className="flex items-center gap-1">
              {[
                { label: 'XS', value: 9 },
                { label: 'S', value: 11 },
                { label: 'M', value: 14 },
                { label: 'L', value: 18 },
                { label: 'XL', value: 24 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFontSize(fontSize === opt.value ? undefined : opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    fontSize === opt.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-surface-200 hover:bg-surface-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {fontSize != null && (
              <button
                type="button"
                onClick={() => setFontSize(undefined)}
                className="mt-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Reset to default
              </button>
            )}
          </FormField>

          {legendItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Apply Legend Color</label>
              <div className="flex flex-wrap gap-1.5">
                {legendItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setColor(item.color);
                      setBorderColor(item.color);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors"
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <FormField label="Details (notes)">
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
              placeholder="Additional notes about this node..."
            />
          </FormField>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Detail Fields</label>
            <div className="space-y-2">
              {detailFields.map((field, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={field.label}
                    onChange={e => {
                      const updated = [...detailFields];
                      updated[i] = { ...updated[i], label: e.target.value };
                      setDetailFields(updated);
                    }}
                    placeholder="Label"
                    className="flex-1 px-2 py-1.5 text-xs border border-surface-200 rounded-lg"
                  />
                  <input
                    value={field.value}
                    onChange={e => {
                      const updated = [...detailFields];
                      updated[i] = { ...updated[i], value: e.target.value };
                      setDetailFields(updated);
                    }}
                    placeholder="Value"
                    className="flex-1 px-2 py-1.5 text-xs border border-surface-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setDetailFields(f => f.filter((_, j) => j !== i))}
                    className="p-1 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDetailFields(f => [...f, { label: '', value: '' }])}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Field
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!label.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
