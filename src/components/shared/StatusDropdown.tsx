import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ITEM_STATUSES } from '@/types';
import type { ItemStatus } from '@/types';
import { getStatusLabel, getStatusColor, getStatusBgClass } from '@/lib/utils';
import { clsx } from 'clsx';

interface StatusDropdownProps {
  status: ItemStatus;
  onChange: (status: ItemStatus) => void;
  disabled?: boolean;
}

export function StatusDropdown({ status, onChange, disabled }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={clsx(
          'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-all whitespace-nowrap',
          getStatusBgClass(status),
          !disabled && 'hover:opacity-80 cursor-pointer',
          disabled && 'cursor-default',
        )}
        title={getStatusLabel(status)}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: getStatusColor(status) }}
        />
        {getStatusLabel(status)}
        {!disabled && <ChevronDown className="w-3 h-3 opacity-50" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white/95 backdrop-blur-xl border border-surface-200 rounded-lg shadow-lg py-1 z-40 min-w-[10rem]">
          {ITEM_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors',
                s === status ? 'bg-surface-100 font-medium' : 'hover:bg-surface-100',
              )}
            >
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md',
                  getStatusBgClass(s),
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(s) }} />
                {getStatusLabel(s)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
