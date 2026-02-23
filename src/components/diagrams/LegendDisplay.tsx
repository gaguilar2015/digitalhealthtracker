import type { DiagramLegendItem } from '@/types';

interface LegendDisplayProps {
  items: DiagramLegendItem[];
}

export function LegendDisplay({ items }: LegendDisplayProps) {
  if (items.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl border border-surface-200 shadow-sm p-3 max-w-[240px]">
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Legend</h4>
      <div className="space-y-1.5">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm shrink-0 border border-black/10"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0">
              <span className="text-xs font-medium text-gray-800">{item.label}</span>
              {item.description && (
                <span className="text-[10px] text-gray-400 ml-1">{item.description}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
