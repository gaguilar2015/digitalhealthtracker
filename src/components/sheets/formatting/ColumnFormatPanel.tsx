import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, Paintbrush, WrapText, Ellipsis } from 'lucide-react';
import { FormatColorPicker } from './FormatColorPicker';
import { FORMAT_TEXT_COLORS, FORMAT_BG_COLORS } from '@/types';
import type { CellStyle } from '@/types';

interface ColumnFormatPanelProps {
  style: CellStyle | undefined;
  onChange: (style: CellStyle) => void;
}

export function ColumnFormatPanel({ style, onChange }: ColumnFormatPanelProps) {
  const s = style ?? {};

  const toggle = (key: keyof CellStyle, val: unknown) => {
    onChange({ ...s, [key]: val });
  };

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      <button
        type="button"
        onClick={() => toggle('bold', !s.bold)}
        className={`p-1.5 rounded transition-colors ${s.bold ? 'bg-primary-100 text-primary-700' : 'hover:bg-surface-100 text-gray-500'}`}
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => toggle('italic', !s.italic)}
        className={`p-1.5 rounded transition-colors ${s.italic ? 'bg-primary-100 text-primary-700' : 'hover:bg-surface-100 text-gray-500'}`}
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-surface-200 mx-0.5" />

      <FormatColorPicker
        colors={FORMAT_TEXT_COLORS}
        value={s.textColor}
        onChange={c => toggle('textColor', c)}
        label="Text Color"
      >
        <Type className="w-3.5 h-3.5" style={{ color: s.textColor || '#6B7280' }} />
      </FormatColorPicker>

      <FormatColorPicker
        colors={FORMAT_BG_COLORS}
        value={s.backgroundColor}
        onChange={c => toggle('backgroundColor', c)}
        label="Background"
      >
        <Paintbrush className="w-3.5 h-3.5" style={{ color: s.backgroundColor && s.backgroundColor !== 'transparent' ? s.backgroundColor : '#6B7280' }} />
      </FormatColorPicker>

      <div className="w-px h-5 bg-surface-200 mx-0.5" />

      {(['left', 'center', 'right'] as const).map(align => {
        const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
        return (
          <button
            key={align}
            type="button"
            onClick={() => toggle('textAlign', s.textAlign === align ? undefined : align)}
            className={`p-1.5 rounded transition-colors ${s.textAlign === align ? 'bg-primary-100 text-primary-700' : 'hover:bg-surface-100 text-gray-500'}`}
            title={align.charAt(0).toUpperCase() + align.slice(1)}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}

      <div className="w-px h-5 bg-surface-200 mx-0.5" />

      <button
        type="button"
        onClick={() => toggle('overflow', s.overflow === 'truncate' ? undefined : 'truncate')}
        className={`p-1.5 rounded transition-colors ${s.overflow === 'truncate' ? 'bg-primary-100 text-primary-700' : 'hover:bg-surface-100 text-gray-500'}`}
        title="Truncate (clip with ellipsis)"
      >
        <Ellipsis className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => toggle('overflow', s.overflow === 'wrap' ? undefined : 'wrap')}
        className={`p-1.5 rounded transition-colors ${s.overflow === 'wrap' ? 'bg-primary-100 text-primary-700' : 'hover:bg-surface-100 text-gray-500'}`}
        title="Wrap text"
      >
        <WrapText className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
