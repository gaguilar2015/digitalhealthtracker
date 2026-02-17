import type { SelectOptionStyle } from '@/types';

interface SelectOptionBadgeProps {
  value: string;
  style?: SelectOptionStyle;
}

export function SelectOptionBadge({ value, style }: SelectOptionBadgeProps) {
  if (!style?.backgroundColor) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-full bg-gray-100 text-gray-700">
        {value}
      </span>
    );
  }

  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-full"
      style={{
        backgroundColor: style.backgroundColor,
        color: style.textColor || '#374151',
      }}
    >
      {value}
    </span>
  );
}
