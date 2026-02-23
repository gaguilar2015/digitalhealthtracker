import {
  Download, Map, Undo2, Redo2, Trash2, Copy, Grid3x3,
  Maximize, Image, Hand, MousePointer, ZoomIn, ZoomOut,
} from 'lucide-react';
import { NodePalette } from './NodePalette';
import type { DiagramNodeType } from '@/types';

interface DiagramToolbarProps {
  readOnly: boolean;
  isSaving: boolean;
  onToggleLegend: () => void;
  showLegend: boolean;
  onExportPng: () => void;
  onExportSvg: () => void;
  onAddNode: (type: DiagramNodeType) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDeleteSelected: () => void;
  onDuplicate: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  selectionCount: number;
  interactionMode: 'pan' | 'select';
  onSetInteractionMode: (mode: 'pan' | 'select') => void;
}

export function DiagramToolbar({
  readOnly, isSaving,
  onToggleLegend, showLegend,
  onExportPng, onExportSvg,
  onAddNode,
  onUndo, onRedo, canUndo, canRedo,
  onDeleteSelected, onDuplicate,
  onFitView, onZoomIn, onZoomOut,
  snapToGrid, onToggleSnap,
  showMinimap, onToggleMinimap,
  selectionCount,
  interactionMode, onSetInteractionMode,
}: DiagramToolbarProps) {
  const btnBase = 'flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors';
  const btnDefault = `${btnBase} text-gray-600 hover:bg-gray-100`;
  const btnActive = `${btnBase} bg-primary-50 text-primary-700`;
  const btnDisabled = `${btnBase} text-gray-300 cursor-not-allowed`;

  return (
    <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5 bg-white border border-surface-200 rounded-xl mb-3">
      {/* Left: Node palette */}
      <div className="flex-1 min-w-0">
        {!readOnly ? (
          <NodePalette onAddNode={onAddNode} />
        ) : (
          <span className="text-xs text-gray-400">Read-only</span>
        )}
      </div>

      {/* Interaction mode toggle */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2">
          <button
            onClick={() => onSetInteractionMode('select')}
            className={interactionMode === 'select' ? btnActive : btnDefault}
            title="Select tool (V) — Click to select, drag to box-select"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSetInteractionMode('pan')}
            className={interactionMode === 'pan' ? btnActive : btnDefault}
            title="Pan tool (H) — Drag to move the canvas"
          >
            <Hand className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Center: Edit actions */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 border-l border-r border-gray-200 px-2">
          <button onClick={onUndo} disabled={!canUndo} className={canUndo ? btnDefault : btnDisabled} title="Undo (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRedo} disabled={!canRedo} className={canRedo ? btnDefault : btnDisabled} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button onClick={onDuplicate} disabled={selectionCount === 0} className={selectionCount > 0 ? btnDefault : btnDisabled} title="Duplicate (Ctrl+D)">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDeleteSelected} disabled={selectionCount === 0} className={selectionCount > 0 ? `${btnBase} text-red-500 hover:bg-red-50` : btnDisabled} title="Delete (Del)">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {selectionCount > 0 && (
            <span className="text-[10px] text-gray-400 ml-1">{selectionCount} sel.</span>
          )}
        </div>
      )}

      {/* Right: View & Export */}
      <div className="flex items-center gap-1 shrink-0">
        {isSaving && (
          <span className="text-xs text-gray-400 animate-pulse mr-1">Saving...</span>
        )}
        {!readOnly && (
          <button
            onClick={onToggleSnap}
            className={snapToGrid ? btnActive : btnDefault}
            title="Snap to Grid"
          >
            <Grid3x3 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onToggleMinimap}
          className={showMinimap ? btnActive : btnDefault}
          title="Toggle MiniMap"
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mini</span>
        </button>
        <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg px-0.5">
          <button onClick={onZoomOut} className={btnDefault} title="Zoom Out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={onZoomIn} className={btnDefault} title="Zoom In">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={onFitView} className={btnDefault} title="Fit View">
          <Maximize className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <button
          onClick={onToggleLegend}
          className={showLegend ? btnActive : btnDefault}
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Legend</span>
        </button>
        <button onClick={onExportPng} className={btnDefault} title="Export PNG">
          <Download className="w-3.5 h-3.5" />
          PNG
        </button>
        <button onClick={onExportSvg} className={btnDefault} title="Export SVG">
          <Image className="w-3.5 h-3.5" />
          SVG
        </button>
      </div>
    </div>
  );
}
