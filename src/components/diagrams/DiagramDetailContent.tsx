import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Users, Trash2, Map } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { useDiagramDetail } from '@/hooks/useDiagramDetail';
import { useDiagrams } from '@/hooks/useDiagrams';
import { useDiagramGroups } from '@/hooks/useDiagramGroups';
import { useDiagramGroupMembers } from '@/hooks/useDiagramGroupMembers';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonLoader, ConfirmDialog } from '@/components/shared';
import { DiagramCanvasV2, type DiagramCanvasApi } from '@/lib/diagram-engine';
import { DiagramToolbar } from './DiagramToolbar';
import { NodeDetailPopup } from './NodeDetailPopup';
import { NodeEditor } from './NodeEditor';
import { LegendDisplay } from './LegendDisplay';
import { LegendEditor } from './LegendEditor';
import { EditDiagramDialog } from './EditDiagramDialog';
import { ManageAccessDialog } from './ManageAccessDialog';
import { getSheetIcon } from '@/lib/utils/sheetIcons';
import { toast } from 'sonner';
import type { DiagramFlowData, DiagramNodeData } from '@/types';

function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

function saveSetting(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

type DiagramNode = {
  id: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  selected?: boolean;
  type?: string;
};

interface DiagramDetailContentProps {
  diagramId: string;
}

export function DiagramDetailContent({ diagramId }: DiagramDetailContentProps) {
  const navigate = useNavigate();
  const { user, isAdmin, isViewer } = useAuth();
  const { members: teamMembers } = useTeamMembers();
  const { deleteDiagram } = useDiagrams();
  const { groups: diagramGroups } = useDiagramGroups();
  const {
    diagram, isLoading,
    members: diagramMembers,
    updateDiagram, saveFlowData, isSaving,
    saveLegend, addMember, removeMember,
  } = useDiagramDetail(diagramId);
  const diagramGroup = diagram?.group_id ? diagramGroups.find(g => g.id === diagram.group_id) : undefined;
  const { groupMembers } = useDiagramGroupMembers(diagram?.group_id ?? undefined);

  const [editOpen, setEditOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [showLegend, setShowLegend] = useState(() => loadSetting('diagram.showLegend', true));
  const [deleting, setDeleting] = useState(false);

  // Canvas feature toggles
  const [snapToGrid, setSnapToGrid] = useState(() => loadSetting('diagram.snapToGrid', true));
  const [showMinimap, setShowMinimap] = useState(() => loadSetting('diagram.showMinimap', true));
  const [selectionCount, setSelectionCount] = useState(0);
  const [canUndoState, setCanUndoState] = useState(false);
  const [canRedoState, setCanRedoState] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>(() => loadSetting('diagram.interactionMode', 'pan'));

  // Node interaction state
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [popupNode, setPopupNode] = useState<{ node: DiagramNode; position: { x: number; y: number } } | null>(null);

  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const readOnly = isViewer;

  // V/H keyboard shortcuts to switch interaction mode
  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'v' || e.key === 'V') {
        saveSetting('diagram.interactionMode', 'select');
        setInteractionMode('select');
      } else if (e.key === 'h' || e.key === 'H') {
        saveSetting('diagram.interactionMode', 'pan');
        setInteractionMode('pan');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly]);

  const getApi = useCallback((): DiagramCanvasApi | undefined => {
    return (canvasWrapperRef.current?.querySelector('[data-diagram-api]') as HTMLElement & {
      __diagramApi?: DiagramCanvasApi;
    })?.__diagramApi;
  }, []);

  // Poll undo/redo state (lightweight, runs on re-render triggers)
  const refreshUndoRedo = useCallback(() => {
    const api = getApi();
    if (api) {
      setCanUndoState(api.canUndo());
      setCanRedoState(api.canRedo());
      setSelectionCount(api.getSelectionCount());
    }
  }, [getApi]);

  const handleFlowChange = useCallback(
    (data: DiagramFlowData) => {
      if (!readOnly) {
        saveFlowData(data);
      }
      refreshUndoRedo();
    },
    [saveFlowData, readOnly, refreshUndoRedo],
  );

  const handleNodeClick = useCallback(
    (node: DiagramNode) => {
      setPopupNode({
        node,
        position: { x: 20, y: 20 },
      });
      setSelectedNode(node);
      refreshUndoRedo();
    },
    [refreshUndoRedo],
  );

  const handleNodeUpdate = useCallback(
    (data: Partial<DiagramNodeData>) => {
      if (!selectedNode) return;
      getApi()?.updateNode(selectedNode.id, data);
      setPopupNode(null);
    },
    [selectedNode, getApi],
  );

  const handleExportPng = useCallback(async () => {
    const canvasEl = canvasWrapperRef.current?.querySelector('[data-diagram-api]') as HTMLElement;
    if (!canvasEl) return;
    try {
      const dataUrl = await toPng(canvasEl, {
        backgroundColor: '#F9FAFB',
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLElement && node.hasAttribute('data-diagram-minimap')),
      });
      const link = document.createElement('a');
      link.download = `${diagram?.name ?? 'diagram'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Exported as PNG');
    } catch {
      toast.error('Failed to export PNG');
    }
  }, [diagram?.name]);

  const handleExportSvg = useCallback(async () => {
    const canvasEl = canvasWrapperRef.current?.querySelector('[data-diagram-api]') as HTMLElement;
    if (!canvasEl) return;
    try {
      const dataUrl = await toSvg(canvasEl, {
        backgroundColor: '#F9FAFB',
        filter: (node) => !(node instanceof HTMLElement && node.hasAttribute('data-diagram-minimap')),
      });
      const link = document.createElement('a');
      link.download = `${diagram?.name ?? 'diagram'}.svg`;
      link.href = dataUrl;
      link.click();
      toast.success('Exported as SVG');
    } catch {
      toast.error('Failed to export SVG');
    }
  }, [diagram?.name]);

  const handleDeleteDiagram = async () => {
    try {
      await deleteDiagram(diagramId);
      navigate('/diagrams');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete diagram');
    }
  };

  // Toolbar callbacks that proxy to canvas API
  const handleUndo = useCallback(() => { getApi()?.undo(); refreshUndoRedo(); }, [getApi, refreshUndoRedo]);
  const handleRedo = useCallback(() => { getApi()?.redo(); refreshUndoRedo(); }, [getApi, refreshUndoRedo]);
  const handleDeleteSelected = useCallback(() => { getApi()?.deleteSelected(); refreshUndoRedo(); }, [getApi, refreshUndoRedo]);
  const handleDuplicate = useCallback(() => { getApi()?.duplicateSelected(); refreshUndoRedo(); }, [getApi, refreshUndoRedo]);
  const handleFitView = useCallback(() => { getApi()?.fitView(); }, [getApi]);
  const handleZoomIn = useCallback(() => { getApi()?.zoomIn(); }, [getApi]);
  const handleZoomOut = useCallback(() => { getApi()?.zoomOut(); }, [getApi]);
  const handleAddNode = useCallback((type: string) => { getApi()?.addNode(type); refreshUndoRedo(); }, [getApi, refreshUndoRedo]);

  if (isLoading) {
    return <SkeletonLoader variant="card" count={1} />;
  }

  if (!diagram) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Diagram not found</h2>
        <p className="text-sm text-gray-500">Select a diagram from the sidebar.</p>
      </div>
    );
  }

  const isCreator = user?.id === diagram.created_by;
  const canManage = isAdmin || isCreator;
  const Icon = getSheetIcon(diagram.icon);

  return (
    <>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Icon className="w-6 h-6 text-indigo-400" />
              {diagram.name}
            </h1>
            {diagram.description && (
              <p className="text-sm text-gray-500 mt-1">{diagram.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {canManage && (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => setLegendOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
                >
                  <Map className="w-4 h-4" />
                  <span className="hidden sm:inline">Legend</span>
                </button>
                <button
                  onClick={() => setAccessOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Access</span>
                </button>
                <button
                  onClick={() => setDeleting(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-surface-200 rounded-xl hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <DiagramToolbar
        readOnly={readOnly}
        isSaving={isSaving}
        onToggleLegend={() => setShowLegend(v => { const next = !v; saveSetting('diagram.showLegend', next); return next; })}
        showLegend={showLegend}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onAddNode={handleAddNode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndoState}
        canRedo={canRedoState}
        onDeleteSelected={handleDeleteSelected}
        onDuplicate={handleDuplicate}
        onFitView={handleFitView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(v => { const next = !v; saveSetting('diagram.snapToGrid', next); return next; })}
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap(v => { const next = !v; saveSetting('diagram.showMinimap', next); return next; })}
        selectionCount={selectionCount}
        interactionMode={interactionMode}
        onSetInteractionMode={(mode) => { saveSetting('diagram.interactionMode', mode); setInteractionMode(mode); }}
      />

      {/* Canvas */}
      <div ref={canvasWrapperRef} className="relative bg-white rounded-xl shadow-sm border border-surface-200" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
        <DiagramCanvasV2
          flowData={diagram.flow_data}
          readOnly={readOnly}
          onFlowChange={handleFlowChange}
          onNodeClick={handleNodeClick}
          snapToGrid={snapToGrid}
          showMinimap={showMinimap}
          interactionMode={interactionMode}
        />

        {/* Legend overlay */}
        {showLegend && diagram.legend.length > 0 && (
          <LegendDisplay items={diagram.legend} />
        )}

        {/* Node detail popup */}
        {popupNode && (
          <NodeDetailPopup
            nodeData={popupNode.node.data as unknown as DiagramNodeData}
            position={popupNode.position}
            onClose={() => setPopupNode(null)}
            onEdit={!readOnly ? () => {
              setNodeEditorOpen(true);
              setPopupNode(null);
            } : undefined}
          />
        )}
      </div>

      {/* Dialogs */}
      {canManage && diagram && (
        <>
          <EditDiagramDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            onSubmit={async data => { await updateDiagram(data); }}
            diagram={diagram}
          />
          <LegendEditor
            open={legendOpen}
            onClose={() => setLegendOpen(false)}
            items={diagram.legend}
            onSave={async items => { await saveLegend(items); }}
          />
          <ManageAccessDialog
            open={accessOpen}
            onClose={() => setAccessOpen(false)}
            creatorId={diagram.created_by}
            diagramMembers={diagramMembers}
            teamMembers={teamMembers}
            onAddMember={async (teamMemberId) => {
              await addMember({ diagram_id: diagram.id, team_member_id: teamMemberId });
            }}
            onRemoveMember={removeMember}
            groupName={diagramGroup?.name}
            groupColor={diagramGroup?.color ?? undefined}
            groupMembers={groupMembers.length > 0 ? groupMembers : undefined}
          />
          <ConfirmDialog
            open={deleting}
            onClose={() => setDeleting(false)}
            onConfirm={handleDeleteDiagram}
            title="Delete Diagram"
            message={`Are you sure you want to delete "${diagram.name}"? This action cannot be undone.`}
            confirmLabel="Delete"
            destructive
          />
        </>
      )}

      {/* Node editor */}
      {selectedNode && (
        <NodeEditor
          open={nodeEditorOpen}
          onClose={() => setNodeEditorOpen(false)}
          nodeData={selectedNode.data as unknown as DiagramNodeData}
          onSave={handleNodeUpdate}
          legendItems={diagram.legend}
        />
      )}
    </>
  );
}
