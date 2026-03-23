import { ChevronDown, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import type { Workstream, TeamMember } from '@/types';

export type DetailLevel = 'workstream' | 'activity_group' | 'activity' | 'task';

interface GanttControlsProps {
  zoom: number;
  onZoomChange: (z: number) => void;
  detailLevel: DetailLevel;
  onDetailChange: (d: DetailLevel) => void;
  selectedWorkstreams: string[];
  onFilterChange: (ids: string[]) => void;
  onExport: (format: 'png' | 'pdf') => void;
  workstreams: Workstream[];
  members: TeamMember[];
  selectedOwners: string[];
  onOwnerFilterChange: (ids: string[]) => void;
}

const zoomOptions: { value: number; label: string }[] = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
];

const detailOptions: { value: DetailLevel; label: string }[] = [
  { value: 'workstream', label: 'Workstream' },
  { value: 'activity_group', label: 'Activity Group' },
  { value: 'activity', label: 'Activity' },
  { value: 'task', label: 'Task' },
];

export function GanttControls({
  zoom,
  onZoomChange,
  detailLevel,
  onDetailChange,
  selectedWorkstreams,
  onFilterChange,
  onExport,
  workstreams,
  members,
  selectedOwners,
  onOwnerFilterChange,
}: GanttControlsProps) {
  const [showExport, setShowExport] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showOwnerFilter, setShowOwnerFilter] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const ownerFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
      if (ownerFilterRef.current && !ownerFilterRef.current.contains(e.target as Node)) setShowOwnerFilter(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleWorkstream = (id: string) => {
    if (selectedWorkstreams.includes(id)) {
      onFilterChange(selectedWorkstreams.filter(w => w !== id));
    } else {
      onFilterChange([...selectedWorkstreams, id]);
    }
  };

  // Build unique owner list from workstreams
  const ownerOptions = (() => {
    const seen = new Set<string>();
    const result: { id: string; label: string }[] = [];
    for (const ws of workstreams) {
      const key = ws.owner_id ?? '__unassigned__';
      if (seen.has(key)) continue;
      seen.add(key);
      const owner = ws.owner_id ? members.find(m => m.id === ws.owner_id) : null;
      result.push({
        id: key,
        label: owner ? (owner.title || owner.full_name) : 'Unassigned',
      });
    }
    return result;
  })();

  const toggleOwner = (id: string) => {
    if (selectedOwners.includes(id)) {
      onOwnerFilterChange(selectedOwners.filter(o => o !== id));
    } else {
      onOwnerFilterChange([...selectedOwners, id]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Zoom */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Zoom:</span>
        {zoomOptions.map(o => (
          <button
            key={o.value}
            onClick={() => onZoomChange(o.value)}
            className={clsx(
              'px-2.5 py-1 text-xs rounded font-medium transition-colors',
              zoom === o.value ? 'bg-primary-100 text-primary-700' : 'bg-surface-50 text-gray-600 hover:bg-surface-200',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Detail Level */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Detail:</span>
        {detailOptions.map(o => (
          <button
            key={o.value}
            onClick={() => onDetailChange(o.value)}
            className={clsx(
              'px-2.5 py-1 text-xs rounded font-medium transition-colors',
              detailLevel === o.value ? 'bg-primary-100 text-primary-700' : 'bg-surface-50 text-gray-600 hover:bg-surface-200',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Filter by Workstream */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => setShowFilter(prev => !prev)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded font-medium bg-surface-50 text-gray-600 hover:bg-surface-200"
        >
          Filter
          {selectedWorkstreams.length > 0 && selectedWorkstreams.length < workstreams.length && (
            <span className="bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {selectedWorkstreams.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>
        {showFilter && (
          <div className="absolute top-full mt-1 left-0 bg-white border border-surface-200 rounded-lg shadow-lg py-1 z-20 min-w-[200px]">
            <button
              onClick={() => onFilterChange(workstreams.map(ws => ws.id))}
              className="w-full text-left px-3 py-1.5 text-xs text-primary-600 hover:bg-surface-100"
            >
              Select all
            </button>
            <button
              onClick={() => onFilterChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-primary-600 hover:bg-surface-100"
            >
              Clear all
            </button>
            <div className="border-t my-1" />
            {workstreams.map(ws => (
              <label key={ws.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedWorkstreams.includes(ws.id)}
                  onChange={() => toggleWorkstream(ws.id)}
                  className="rounded border-surface-200 text-primary-600"
                />
                <span className="text-xs text-gray-700">{ws.code} - {ws.short_name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Filter by Owner/Role */}
      <div className="relative" ref={ownerFilterRef}>
        <button
          onClick={() => setShowOwnerFilter(prev => !prev)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded font-medium bg-surface-50 text-gray-600 hover:bg-surface-200"
        >
          Role
          {selectedOwners.length > 0 && selectedOwners.length < ownerOptions.length && (
            <span className="bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {selectedOwners.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>
        {showOwnerFilter && (
          <div className="absolute top-full mt-1 left-0 bg-white border border-surface-200 rounded-lg shadow-lg py-1 z-20 min-w-[200px]">
            <button
              onClick={() => onOwnerFilterChange(ownerOptions.map(o => o.id))}
              className="w-full text-left px-3 py-1.5 text-xs text-primary-600 hover:bg-surface-100"
            >
              Select all
            </button>
            <button
              onClick={() => onOwnerFilterChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-primary-600 hover:bg-surface-100"
            >
              Clear all
            </button>
            <div className="border-t my-1" />
            {ownerOptions.map(o => (
              <label key={o.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOwners.includes(o.id)}
                  onChange={() => toggleOwner(o.id)}
                  className="rounded border-surface-200 text-primary-600"
                />
                <span className="text-xs text-gray-700">{o.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export */}
      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setShowExport(prev => !prev)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded font-medium bg-surface-50 text-gray-600 hover:bg-surface-200"
        >
          <Download className="w-3.5 h-3.5" />
          Export
          <ChevronDown className="w-3 h-3" />
        </button>
        {showExport && (
          <div className="absolute top-full mt-1 right-0 bg-white border border-surface-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
            <button
              onClick={() => { onExport('png'); setShowExport(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-surface-100"
            >
              Export as PNG
            </button>
            <button
              onClick={() => { onExport('pdf'); setShowExport(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-surface-100"
            >
              Export as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
