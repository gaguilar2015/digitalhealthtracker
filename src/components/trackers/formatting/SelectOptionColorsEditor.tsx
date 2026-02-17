import { SELECT_OPTION_COLORS } from '@/types';
import type { SelectOptionStyle } from '@/types';

interface SelectOptionColorsEditorProps {
  options: string[];
  optionStyles: Record<string, SelectOptionStyle>;
  onChange: (styles: Record<string, SelectOptionStyle>) => void;
}

export function SelectOptionColorsEditor({ options, optionStyles, onChange }: SelectOptionColorsEditorProps) {
  const setStyle = (option: string, style: SelectOptionStyle | undefined) => {
    const next = { ...optionStyles };
    if (style) {
      next[option] = style;
    } else {
      delete next[option];
    }
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      {options.map(opt => {
        const current = optionStyles[opt];
        return (
          <div key={opt} className="flex items-center gap-2">
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium min-w-[60px] text-center truncate"
              style={{
                backgroundColor: current?.backgroundColor ?? '#F3F4F6',
                color: current?.textColor ?? '#374151',
              }}
            >
              {opt}
            </span>
            <div className="flex gap-1 flex-wrap">
              {SELECT_OPTION_COLORS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStyle(opt, { backgroundColor: c.bg, textColor: c.text })}
                  className={`w-5 h-5 rounded-md border transition-all ${
                    current?.backgroundColor === c.bg ? 'border-primary-500 ring-1 ring-primary-300' : 'border-surface-200 hover:border-surface-300'
                  }`}
                  style={{ backgroundColor: c.bg }}
                  title={`${c.bg}`}
                />
              ))}
              <button
                type="button"
                onClick={() => setStyle(opt, undefined)}
                className={`w-5 h-5 rounded-md border border-surface-200 flex items-center justify-center text-[8px] text-gray-400 hover:border-surface-300 ${
                  !current ? 'border-primary-500 ring-1 ring-primary-300' : ''
                }`}
                title="No color"
              >
                &times;
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
