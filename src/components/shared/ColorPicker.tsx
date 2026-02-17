import { WORKSTREAM_COLORS } from '@/types';
import type { WorkstreamColor } from '@/types';
import { WORKSTREAM_COLOR_HEX } from '@/lib/utils/colors';
import { clsx } from 'clsx';

interface ColorPickerProps {
  value: WorkstreamColor | '';
  onChange: (color: WorkstreamColor) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {WORKSTREAM_COLORS.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={clsx(
            'w-8 h-8 rounded-full border-2 transition-all',
            value === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105',
          )}
          style={{ backgroundColor: WORKSTREAM_COLOR_HEX[color] }}
          title={color}
        />
      ))}
    </div>
  );
}
