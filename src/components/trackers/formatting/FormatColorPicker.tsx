import { useState, useRef, useEffect } from 'react';

interface FormatColorPickerProps {
  colors: readonly string[];
  value: string | undefined;
  onChange: (color: string | undefined) => void;
  label: string;
  children: React.ReactNode;
}

export function FormatColorPicker({ colors, value, onChange, label, children }: FormatColorPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-surface-100 transition-colors"
        title={label}
      >
        {children}
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 p-2 bg-white rounded-xl shadow-lg border border-surface-200 w-[176px]">
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">{label}</p>
          <div className="grid grid-cols-4 gap-1">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => { onChange(color === 'transparent' ? undefined : color); setOpen(false); }}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  (value ?? 'transparent') === color ? 'border-primary-500 scale-110' : 'border-surface-200 hover:border-surface-300'
                }`}
                style={{ backgroundColor: color === 'transparent' ? '#fff' : color }}
                title={color === 'transparent' ? 'None' : color}
              >
                {color === 'transparent' && (
                  <span className="block w-full h-full relative">
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">
                      &times;
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
