import { useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { SelectOptionStyle } from '@/types';
import { SelectOptionBadge } from './formatting/SelectOptionBadge';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  optionStyles?: Record<string, SelectOptionStyle>;
  onChange: (selected: string[]) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function MultiSelectDropdown({
  options, selected, optionStyles, onChange, onSave, onCancel,
}: MultiSelectDropdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onSave();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, onCancel]);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute z-50 mt-1 w-56 bg-white border border-surface-200 rounded-xl shadow-lg flex flex-col max-h-60"
    >
      <div className="flex-1 overflow-y-auto py-1">
        {options.map(opt => {
          const checked = selected.includes(opt);
          const style = optionStyles?.[opt];
          return (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-surface-50"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              {style?.backgroundColor ? (
                <SelectOptionBadge value={opt} style={style} />
              ) : (
                <span className="truncate">{opt}</span>
              )}
            </label>
          );
        })}
        {options.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-400">No options defined</p>
        )}
      </div>
      <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-t border-surface-100">
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-50 rounded-md transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Done
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
