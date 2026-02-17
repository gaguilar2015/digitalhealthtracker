import { Trash2 } from 'lucide-react';
import type { ConditionalFormatRule, ConditionalOperator, TrackerColumnType, CellStyle } from '@/types';

interface ConditionalRuleRowProps {
  rule: ConditionalFormatRule;
  columnType: TrackerColumnType;
  options?: string[];
  onChange: (rule: ConditionalFormatRule) => void;
  onDelete: () => void;
}

const OPERATORS_BY_TYPE: Record<TrackerColumnType, { value: ConditionalOperator; label: string }[]> = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not contains' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  date: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'greater_than', label: 'After' },
    { value: 'less_than', label: 'Before' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  datetime: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'greater_than', label: 'After' },
    { value: 'less_than', label: 'Before' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  select: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  multiselect: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  checkbox: [
    { value: 'is_true', label: 'Is checked' },
    { value: 'is_false', label: 'Is unchecked' },
  ],
};

function needsValue(op: ConditionalOperator): boolean {
  return !['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(op);
}

function needsSecondValue(op: ConditionalOperator): boolean {
  return op === 'between';
}

export function ConditionalRuleRow({ rule, columnType, options, onChange, onDelete }: ConditionalRuleRowProps) {
  const operators = OPERATORS_BY_TYPE[columnType] ?? OPERATORS_BY_TYPE.text;

  const update = (patch: Partial<ConditionalFormatRule>) => {
    onChange({ ...rule, ...patch });
  };

  const updateStyle = (key: keyof CellStyle, val: unknown) => {
    update({ style: { ...rule.style, [key]: val } });
  };

  const inputType = columnType === 'number' ? 'number' : columnType === 'date' ? 'date' : columnType === 'datetime' ? 'datetime-local' : 'text';

  return (
    <div className="p-2.5 bg-surface-50 rounded-xl space-y-2">
      <div className="flex gap-2 items-start">
        {/* Operator */}
        <select
          value={rule.operator}
          onChange={e => update({ operator: e.target.value as ConditionalOperator, value: undefined, value2: undefined })}
          className="px-2 py-1.5 text-xs border border-surface-200 rounded-lg focus:border-primary-500 min-w-[120px]"
        >
          {operators.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        {/* Value inputs */}
        {needsValue(rule.operator) && (
          (columnType === 'select' || columnType === 'multiselect') && options ? (
            <select
              value={String(rule.value ?? '')}
              onChange={e => update({ value: e.target.value })}
              className="flex-1 px-2 py-1.5 text-xs border border-surface-200 rounded-lg"
            >
              <option value="">—</option>
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={inputType}
              value={rule.value != null ? String(rule.value) : ''}
              onChange={e => update({ value: columnType === 'number' ? Number(e.target.value) : e.target.value })}
              placeholder="Value"
              className="flex-1 px-2 py-1.5 text-xs border border-surface-200 rounded-lg"
            />
          )
        )}

        {needsSecondValue(rule.operator) && (
          <input
            type={inputType}
            value={rule.value2 != null ? String(rule.value2) : ''}
            onChange={e => update({ value2: columnType === 'number' ? Number(e.target.value) : e.target.value })}
            placeholder="Value 2"
            className="flex-1 px-2 py-1.5 text-xs border border-surface-200 rounded-lg"
          />
        )}

        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Style preview & toggles */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-gray-500 mr-1">Style:</span>
        <button
          type="button"
          onClick={() => updateStyle('bold', !rule.style.bold)}
          className={`px-1.5 py-0.5 text-[10px] rounded font-bold transition-colors ${
            rule.style.bold ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:bg-surface-100'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => updateStyle('italic', !rule.style.italic)}
          className={`px-1.5 py-0.5 text-[10px] rounded italic transition-colors ${
            rule.style.italic ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:bg-surface-100'
          }`}
        >
          I
        </button>
        <input
          type="color"
          value={rule.style.textColor ?? '#111827'}
          onChange={e => updateStyle('textColor', e.target.value)}
          className="w-5 h-5 rounded border border-surface-200 cursor-pointer p-0"
          title="Text color"
        />
        <input
          type="color"
          value={rule.style.backgroundColor ?? '#FFFFFF'}
          onChange={e => updateStyle('backgroundColor', e.target.value)}
          className="w-5 h-5 rounded border border-surface-200 cursor-pointer p-0"
          title="Background color"
        />
        {/* Preview swatch */}
        <span
          className="ml-1 px-2 py-0.5 text-[10px] rounded border border-surface-200"
          style={{
            fontWeight: rule.style.bold ? 'bold' : 'normal',
            fontStyle: rule.style.italic ? 'italic' : 'normal',
            color: rule.style.textColor,
            backgroundColor: rule.style.backgroundColor,
          }}
        >
          Preview
        </span>
      </div>
    </div>
  );
}
