import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, Paintbrush, X } from 'lucide-react';
import { FormatColorPicker } from './FormatColorPicker';
import { FORMAT_TEXT_COLORS, FORMAT_BG_COLORS } from '@/types';
import type { CellStyle } from '@/types';

interface FormatToolbarProps {
  style: CellStyle;
  onChange: (style: CellStyle) => void;
  onClose: () => void;
}

export function FormatToolbar({ style, onChange, onClose }: FormatToolbarProps) {
  const toggle = (key: keyof CellStyle, val: unknown) => {
    onChange({ ...style, [key]: val });
  };

  return (
    <div className="sticky top-0 z-10 mb-3 flex items-center gap-0.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-surface-200">
      <button
        type="button"
        onClick={() => toggle('bold', !style.bold)}
        className={`p-1.5 rounded transition-colors ${style.bold ? 'bg-primary-100 text-primary-700' : 'hover:bg-surface-100 text-gray-500'}`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => toggle('italic', !style.italic)}
        className={`p-1.5 rounded transition-colors ${style.italic ? 'bg-primary-100 text-primary-700' : 'hover:bg-surface-100 text-gray-500'}`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-surface-200 mx-1" />

      <FormatColorPicker
        colors={FORMAT_TEXT_COLORS}
        value={style.textColor}
        onChange={c => toggle('textColor', c)}
        label="Text Color"
      >
        <Type className="w-4 h-4" style={{ color: style.textColor || '#6B7280' }} />
      </FormatColorPicker>

      <FormatColorPicker
        colors={FORMAT_BG_COLORS}
        value={style.backgroundColor}
        onChange={c => toggle('backgroundColor', c)}
        label="Background"
      >
        <Paintbrush className="w-4 h-4" style={{ color: style.backgroundColor && style.backgroundColor !== 'transparent' ? style.backgroundColor : '#6B7280' }} />
      </FormatColorPicker>

      <div className="w-px h-5 bg-surface-200 mx-1" />

      {(['left', 'center', 'right'] as const).map(align => {
        const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
        return (
          <button
            key={align}
            type="button"
            onClick={() => toggle('textAlign', style.textAlign === align ? undefined : align)}
            className={`p-1.5 rounded transition-colors ${style.textAlign === align ? 'bg-primary-100 text-primary-700' : 'hover:bg-surface-100 text-gray-500'}`}
            title={align.charAt(0).toUpperCase() + align.slice(1)}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="w-px h-5 bg-surface-200 mx-1" />

      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded hover:bg-surface-100 text-gray-400"
        title="Deselect"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
