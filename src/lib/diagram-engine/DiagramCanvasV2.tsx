/**
 * Custom Diagram Engine - Main Canvas Component (V2)
 *
 * Pure SVG canvas with React rendering. Replaces React Flow entirely.
 * Implements: zoom/pan, node rendering, ports, edge routing, selection,
 * resize, undo/redo, copy/paste, keyboard shortcuts, context menus, minimap.
 *
 * Exposes the same DiagramCanvasApi interface as the original DiagramCanvas
 * so DiagramDetailContent requires no changes to swap in V2.
 */

import { useCallback, useRef, useState, useEffect, useReducer, memo } from 'react';
import type { DiagramFlowData, DiagramNodeData, DiagramNodeType } from '@/types';
import type {
  CanvasNode,
  CanvasEdge,
  CanvasEdgeType,
  ViewportState,
  InteractionState,
  Point,
  PortSide,
  ResizeHandle,
  CanvasState,
  CanvasAction,
  AlignmentGuide,
} from './types';
import { NODE_DEFAULT_SIZES, getDefaultPorts, getGroupPorts } from './types';
import {
  screenToCanvas,
  zoomAtPoint,
  fitView as computeFitView,
  getPortPosition,
  findNodeAtPoint,
  findPortAtPoint,
  findResizeHandleAtPoint,
  getResizeHandlePositions,
  applyResize,
  snapToGrid as snapVal,
  normalizeRect,
  rectsOverlap,
} from './math';
import { ARROW_MARKER_ID, getObstaclesForEdge, getAutoPortSide, computeOrthogonalPoints } from './edgePaths';
import { flowDataToCanvas, canvasToFlowData } from './conversion';
import { useUndoRedoV2 } from './useUndoRedoV2';
import { SvgNodeRenderer } from './SvgNodes';
import { SvgEdge, ConnectionPreview, resolveEdgeEndpoints } from './SvgEdges';
import { ContextMenu, type ContextMenuType } from '@/components/diagrams/ContextMenu';
import { MiniMapV2 } from './MiniMapV2';
import { computeAlignmentGuides } from './alignmentGuides';

// ─── DiagramCanvasApi (same interface as V1) ────────────────

export interface DiagramCanvasApi {
  updateNode: (nodeId: string, data: Partial<DiagramNodeData>) => void;
  updateEdge: (edgeId: string, data: { label?: string }) => void;
  deleteSelected: () => void;
  getFlowData: () => DiagramFlowData;
  duplicateSelected: () => void;
  addNode: (type: string) => void;
  fitView: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getSelectionCount: () => number;
  selectAll: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

// ─── Props ──────────────────────────────────────────────────

interface DiagramCanvasV2Props {
  flowData: DiagramFlowData;
  readOnly: boolean;
  onFlowChange: (data: DiagramFlowData) => void;
  onNodeClick?: (node: { id: string; data: Record<string, unknown>; position: { x: number; y: number }; width?: number; height?: number; selected?: boolean; type?: string }) => void;
  snapToGrid: boolean;
  showMinimap: boolean;
  interactionMode: 'pan' | 'select';
}

// ─── State Reducer ──────────────────────────────────────────

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SET_NODES':
      return { ...state, nodes: action.nodes };
    case 'SET_EDGES':
      return { ...state, edges: action.edges };
    case 'SET_VIEWPORT':
      return { ...state, viewport: action.viewport };
    case 'SET_INTERACTION':
      return { ...state, interaction: action.interaction };
    case 'SET_HOVERED_NODE':
      return { ...state, hoveredNodeId: action.nodeId };
    case 'SET_HOVERED_EDGE':
      return { ...state, hoveredEdgeId: action.edgeId };
    case 'SET_HOVERED_PORT':
      return { ...state, hoveredPortInfo: action.info };
    case 'SET_EDITING_EDGE_LABEL':
      return { ...state, editingEdgeLabelId: action.edgeId };
    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === action.nodeId ? { ...n, ...action.updates } : n,
        ),
      };
    case 'UPDATE_NODE_DATA':
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === action.nodeId ? { ...n, data: { ...n.data, ...action.data } } : n,
        ),
      };
    case 'UPDATE_EDGE':
      return {
        ...state,
        edges: state.edges.map(e =>
          e.id === action.edgeId ? { ...e, ...action.updates } : e,
        ),
      };
    case 'ADD_NODE':
      return { ...state, nodes: [...state.nodes, action.node] };
    case 'ADD_EDGE':
      return { ...state, edges: [...state.edges, action.edge] };
    case 'DELETE_NODES': {
      const deleteSet = new Set(action.nodeIds);
      return {
        ...state,
        nodes: state.nodes.filter(n => !deleteSet.has(n.id)),
        edges: state.edges.filter(e => !deleteSet.has(e.source) && !deleteSet.has(e.target)),
      };
    }
    case 'DELETE_EDGES': {
      const deleteSet = new Set(action.edgeIds);
      return {
        ...state,
        edges: state.edges.filter(e => !deleteSet.has(e.id)),
      };
    }
    case 'SELECT_NODE': {
      if (action.additive) {
        return {
          ...state,
          nodes: state.nodes.map(n =>
            n.id === action.nodeId ? { ...n, selected: !n.selected } : n,
          ),
        };
      }
      return {
        ...state,
        nodes: state.nodes.map(n => ({ ...n, selected: n.id === action.nodeId })),
        edges: state.edges.map(e => ({ ...e, selected: false })),
      };
    }
    case 'SELECT_EDGE': {
      if (action.additive) {
        return {
          ...state,
          edges: state.edges.map(e =>
            e.id === action.edgeId ? { ...e, selected: !e.selected } : e,
          ),
        };
      }
      return {
        ...state,
        nodes: state.nodes.map(n => ({ ...n, selected: false })),
        edges: state.edges.map(e => ({ ...e, selected: e.id === action.edgeId })),
      };
    }
    case 'SELECT_ALL':
      return {
        ...state,
        nodes: state.nodes.map(n => ({ ...n, selected: true })),
        edges: state.edges.map(e => ({ ...e, selected: true })),
      };
    case 'DESELECT_ALL':
      return {
        ...state,
        nodes: state.nodes.map(n => ({ ...n, selected: false })),
        edges: state.edges.map(e => ({ ...e, selected: false })),
      };
    case 'SELECT_IN_RECT': {
      const rect = action.rect;
      return {
        ...state,
        nodes: state.nodes.map(n => ({
          ...n,
          selected: rectsOverlap(rect, { x: n.x, y: n.y, width: n.width, height: n.height }),
        })),
      };
    }
    case 'MOVE_NODES':
      return {
        ...state,
        nodes: state.nodes.map(n => {
          if (!action.nodeIds.includes(n.id)) return n;
          return { ...n, x: n.x + action.dx, y: n.y + action.dy };
        }),
      };
    case 'RESIZE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === action.nodeId
            ? { ...n, x: action.bounds.x, y: action.bounds.y, width: action.bounds.width, height: action.bounds.height }
            : n,
        ),
      };
    case 'SET_EDGE_WAYPOINTS':
      return {
        ...state,
        edges: state.edges.map(e =>
          e.id === action.edgeId ? { ...e, waypoints: action.waypoints } : e,
        ),
      };
    case 'SET_ALIGNMENT_GUIDES':
      return { ...state, alignmentGuides: action.guides };
    case 'BRING_TO_FRONT': {
      const node = state.nodes.find(n => n.id === action.nodeId);
      if (!node) return state;
      return {
        ...state,
        nodes: [...state.nodes.filter(n => n.id !== action.nodeId), node],
      };
    }
    case 'SEND_TO_BACK': {
      const node = state.nodes.find(n => n.id === action.nodeId);
      if (!node) return state;
      return {
        ...state,
        nodes: [node, ...state.nodes.filter(n => n.id !== action.nodeId)],
      };
    }
    case 'BATCH': {
      let s = state;
      for (const a of action.actions) {
        s = canvasReducer(s, a);
      }
      return s;
    }
    default:
      return state;
  }
}

// ─── Grid Size ──────────────────────────────────────────────

const GRID_SIZE = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_SENSITIVITY = 0.0025;

// ─── Waypoint insertion helper ───────────────────────────────

/** Find the best segment index to insert a waypoint along an edge path.
 *  Returns the index where the new waypoint should be spliced into the waypoints array. */
function findBestWaypointInsertionIndex(edge: CanvasEdge, point: Point): number {
  // If no existing waypoints, insert at index 0
  if (edge.waypoints.length === 0) return 0;

  // Find the closest segment between consecutive waypoints.
  // The path goes: (implicit source) → wp[0] → wp[1] → ... → (implicit target)
  // We only check segments between existing waypoints since we don't have
  // source/target port positions here.
  let bestDist = Infinity;
  let bestIdx = 0;

  // Check distance to each segment between consecutive waypoints
  for (let i = 0; i < edge.waypoints.length - 1; i++) {
    const a = edge.waypoints[i];
    const b = edge.waypoints[i + 1];
    const dist = pointToSegmentDistance(point, a, b);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i + 1; // Insert between wp[i] and wp[i+1]
    }
  }

  // Also check "before first waypoint" and "after last waypoint"
  const distToFirst = Math.sqrt(
    (point.x - edge.waypoints[0].x) ** 2 + (point.y - edge.waypoints[0].y) ** 2,
  );
  const distToLast = Math.sqrt(
    (point.x - edge.waypoints[edge.waypoints.length - 1].x) ** 2 +
    (point.y - edge.waypoints[edge.waypoints.length - 1].y) ** 2,
  );

  if (distToFirst < bestDist) {
    bestIdx = 0;
    bestDist = distToFirst;
  }
  if (distToLast < bestDist) {
    bestIdx = edge.waypoints.length;
  }

  return bestIdx;
}

/** Distance from a point to a line segment */
function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

// ─── Edge waypoint snap helpers ──────────────────────────────

/** Resolve the neighboring path points (prev/next) for a waypoint at the given index */
function getEdgeNeighborPoints(
  edge: CanvasEdge,
  waypointIndex: number,
  nodeMapRef: Map<string, CanvasNode>,
): { prev: Point; next: Point } | null {
  const sourceNode = nodeMapRef.get(edge.source);
  const targetNode = nodeMapRef.get(edge.target);
  if (!sourceNode || !targetNode) return null;

  // Resolve port positions (same logic as SvgEdges / edgePaths)
  const { sourceSide, targetSide } = getAutoPortSide(sourceNode, targetNode);
  const sSide = (edge.sourceHandle as PortSide | null) ?? sourceSide;
  const tSide = (edge.targetHandle as PortSide | null) ?? targetSide;
  const sourcePos = getPortPosition(sourceNode, sSide);
  const targetPos = getPortPosition(targetNode, tSide);

  const prev = waypointIndex === 0
    ? { x: sourcePos.x, y: sourcePos.y }
    : edge.waypoints[waypointIndex - 1];

  const next = waypointIndex === edge.waypoints.length - 1
    ? { x: targetPos.x, y: targetPos.y }
    : edge.waypoints[waypointIndex + 1];

  return { prev, next };
}

/** Check alignment with prev/next neighbors and return snapped position + guide lines */
function computeEdgeWaypointSnap(
  canvasPos: Point,
  prev: Point,
  next: Point,
  threshold = 8,
): { snapped: Point; guides: AlignmentGuide[] } {
  let snapX = canvasPos.x;
  let snapY = canvasPos.y;
  const guides: AlignmentGuide[] = [];

  // X-axis alignment (vertical guide lines)
  const dxPrev = Math.abs(canvasPos.x - prev.x);
  const dxNext = Math.abs(canvasPos.x - next.x);
  if (dxPrev <= threshold || dxNext <= threshold) {
    // Both within threshold → prefer the closer one
    if (dxPrev <= threshold && dxNext <= threshold) {
      snapX = dxPrev <= dxNext ? prev.x : next.x;
    } else if (dxPrev <= threshold) {
      snapX = prev.x;
    } else {
      snapX = next.x;
    }
    // Vertical guide spanning from prev/next Y to cursor Y
    const allYs = [prev.y, next.y, canvasPos.y];
    guides.push({
      type: 'vertical',
      position: snapX,
      from: Math.min(...allYs) - 20,
      to: Math.max(...allYs) + 20,
    });
  }

  // Y-axis alignment (horizontal guide lines)
  const dyPrev = Math.abs(canvasPos.y - prev.y);
  const dyNext = Math.abs(canvasPos.y - next.y);
  if (dyPrev <= threshold || dyNext <= threshold) {
    if (dyPrev <= threshold && dyNext <= threshold) {
      snapY = dyPrev <= dyNext ? prev.y : next.y;
    } else if (dyPrev <= threshold) {
      snapY = prev.y;
    } else {
      snapY = next.y;
    }
    const allXs = [prev.x, next.x, canvasPos.x];
    guides.push({
      type: 'horizontal',
      position: snapY,
      from: Math.min(...allXs) - 20,
      to: Math.max(...allXs) + 20,
    });
  }

  return { snapped: { x: snapX, y: snapY }, guides };
}

// ─── Parallel-shift helpers ──────────────────────────────────

/** Build the full path points for an edge: [sourcePortPos, ...waypoints, targetPortPos] */
function getEdgeFullPathPoints(
  edge: CanvasEdge,
  nodeMapRef: Map<string, CanvasNode>,
): Point[] | null {
  const sourceNode = nodeMapRef.get(edge.source);
  const targetNode = nodeMapRef.get(edge.target);
  if (!sourceNode || !targetNode) return null;

  const { sourceSide, targetSide } = getAutoPortSide(sourceNode, targetNode);
  const sSide = (edge.sourceHandle as PortSide | null) ?? sourceSide;
  const tSide = (edge.targetHandle as PortSide | null) ?? targetSide;
  const sourcePos = getPortPosition(sourceNode, sSide);
  const targetPos = getPortPosition(targetNode, tSide);

  return [
    { x: sourcePos.x, y: sourcePos.y },
    ...edge.waypoints,
    { x: targetPos.x, y: targetPos.y },
  ];
}

/** Find which segment of the full path a point is closest to.
 *  Returns the segment index (0-based) in the full path points array. */
function findClosestSegment(pathPoints: Point[], point: Point): number {
  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const dist = pointToSegmentDistance(point, pathPoints[i], pathPoints[i + 1]);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ─── Main Component ─────────────────────────────────────────

function DiagramCanvasV2Inner({
  flowData,
  readOnly,
  onFlowChange,
  onNodeClick,
  snapToGrid: snapEnabled,
  showMinimap,
  interactionMode,
}: DiagramCanvasV2Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize state from flowData
  const initialData = useRef(flowDataToCanvas(flowData));
  const [state, dispatch] = useReducer(canvasReducer, {
    nodes: initialData.current.nodes,
    edges: initialData.current.edges,
    viewport: initialData.current.viewport,
    interaction: { mode: 'idle' },
    hoveredNodeId: null,
    hoveredEdgeId: null,
    hoveredPortInfo: null,
    editingEdgeLabelId: null,
    alignmentGuides: [],
  });

  // Clipboard
  const clipboard = useRef<{ nodes: CanvasNode[]; edges: CanvasEdge[] } | null>(null);

  // Undo/redo
  const { takeSnapshot, undo, redo, canUndo, canRedo } = useUndoRedoV2();

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: ContextMenuType;
    nodeId?: string;
    edgeId?: string;
    edgeType?: string;
  } | null>(null);

  // Edge label editing overlay state
  const [editingLabel, setEditingLabel] = useState<{
    edgeId: string;
    value: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // ─── Emit changes ───────────────────────────────────────

  const emitChange = useCallback(
    (nodes: CanvasNode[], edges: CanvasEdge[], viewport: ViewportState) => {
      onFlowChange(canvasToFlowData(nodes, edges, viewport));
    },
    [onFlowChange],
  );

  // Emit on state changes (nodes, edges, viewport)
  // IMPORTANT: Skip the initial mount to avoid corrupting V1 data on round-trip.
  // The first render always creates new array references from flowDataToCanvas(),
  // which would trigger emitChange and overwrite the original data format.
  const hasMounted = useRef(false);
  const prevStateRef = useRef({ nodes: state.nodes, edges: state.edges, viewport: state.viewport });
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const prev = prevStateRef.current;
    if (prev.nodes !== state.nodes || prev.edges !== state.edges || prev.viewport !== state.viewport) {
      prevStateRef.current = { nodes: state.nodes, edges: state.edges, viewport: state.viewport };
      emitChange(state.nodes, state.edges, state.viewport);
    }
  }, [state.nodes, state.edges, state.viewport, emitChange]);

  // ─── Helpers ────────────────────────────────────────────

  const getContainerRect = useCallback((): DOMRect => {
    return containerRef.current?.getBoundingClientRect() ?? new DOMRect();
  }, []);

  const toCanvas = useCallback((screenX: number, screenY: number): Point => {
    return screenToCanvas(screenX, screenY, state.viewport, getContainerRect());
  }, [state.viewport, getContainerRect]);

  // ─── Node map for quick lookup ──────────────────────────

  const nodeMap = useRef(new Map<string, CanvasNode>());
  useEffect(() => {
    const map = new Map<string, CanvasNode>();
    for (const n of state.nodes) map.set(n.id, n);
    nodeMap.current = map;
  }, [state.nodes]);

  // ─── API Methods ────────────────────────────────────────

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<DiagramNodeData>) => {
      takeSnapshot(state.nodes, state.edges);
      dispatch({ type: 'UPDATE_NODE_DATA', nodeId, data });
    },
    [state.nodes, state.edges, takeSnapshot],
  );

  const updateEdgeData = useCallback(
    (edgeId: string, data: { label?: string }) => {
      takeSnapshot(state.nodes, state.edges);
      dispatch({
        type: 'UPDATE_EDGE',
        edgeId,
        updates: { data: { ...state.edges.find(e => e.id === edgeId)?.data, ...data } },
      });
    },
    [state.nodes, state.edges, takeSnapshot],
  );

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = state.nodes.filter(n => n.selected).map(n => n.id);
    const selectedEdgeIds = state.edges.filter(e => e.selected).map(e => e.id);
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

    takeSnapshot(state.nodes, state.edges);
    dispatch({
      type: 'BATCH',
      actions: [
        { type: 'DELETE_NODES', nodeIds: selectedNodeIds },
        { type: 'DELETE_EDGES', edgeIds: selectedEdgeIds },
      ],
    });
  }, [state.nodes, state.edges, takeSnapshot]);

  const getFlowData = useCallback((): DiagramFlowData => {
    return canvasToFlowData(state.nodes, state.edges, state.viewport);
  }, [state.nodes, state.edges, state.viewport]);

  const duplicateSelected = useCallback(() => {
    const selectedNodes = state.nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;

    takeSnapshot(state.nodes, state.edges);

    const idMap = new Map<string, string>();
    const newNodes = selectedNodes.map(n => {
      const newId = crypto.randomUUID();
      idMap.set(n.id, newId);
      return { ...n, id: newId, x: n.x + 30, y: n.y + 30, selected: false, data: { ...n.data } };
    });

    const selectedIds = new Set(selectedNodes.map(n => n.id));
    const newEdges = state.edges
      .filter(e => selectedIds.has(e.source) && selectedIds.has(e.target))
      .map(e => ({
        ...e,
        id: crypto.randomUUID(),
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
        selected: false,
        data: { ...e.data },
      }));

    dispatch({
      type: 'BATCH',
      actions: [
        ...newNodes.map(n => ({ type: 'ADD_NODE' as const, node: n })),
        ...newEdges.map(e => ({ type: 'ADD_EDGE' as const, edge: e })),
      ],
    });
  }, [state.nodes, state.edges, takeSnapshot]);

  const addNode = useCallback(
    (type: string) => {
      const rect = getContainerRect();
      const center = screenToCanvas(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        state.viewport,
        rect,
      );

      const nodeType = type as DiagramNodeType;
      const defaults = NODE_DEFAULT_SIZES[nodeType] ?? NODE_DEFAULT_SIZES.system;

      const pos = snapEnabled
        ? { x: snapVal(center.x - defaults.width / 2, GRID_SIZE), y: snapVal(center.y - defaults.height / 2, GRID_SIZE) }
        : { x: center.x - defaults.width / 2, y: center.y - defaults.height / 2 };

      takeSnapshot(state.nodes, state.edges);

      const newNode: CanvasNode = {
        id: crypto.randomUUID(),
        type: nodeType,
        x: pos.x,
        y: pos.y,
        width: defaults.width,
        height: defaults.height,
        data: {
          label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          nodeType,
        } as DiagramNodeData,
        selected: false,
        ports: nodeType === 'group' ? getGroupPorts() : getDefaultPorts(),
      };

      dispatch({ type: 'ADD_NODE', node: newNode });
    },
    [state.viewport, state.nodes, state.edges, snapEnabled, getContainerRect, takeSnapshot],
  );

  const handleFitView = useCallback(() => {
    const rect = getContainerRect();
    const vp = computeFitView(state.nodes, rect.width, rect.height);
    dispatch({ type: 'SET_VIEWPORT', viewport: vp });
  }, [state.nodes, getContainerRect]);

  const ZOOM_STEP = 0.2;

  const handleZoomIn = useCallback(() => {
    const rect = getContainerRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const newVp = zoomAtPoint(state.viewport, centerX, centerY, rect, ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    dispatch({ type: 'SET_VIEWPORT', viewport: newVp });
  }, [state.viewport, getContainerRect]);

  const handleZoomOut = useCallback(() => {
    const rect = getContainerRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const newVp = zoomAtPoint(state.viewport, centerX, centerY, rect, -ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    dispatch({ type: 'SET_VIEWPORT', viewport: newVp });
  }, [state.viewport, getContainerRect]);

  const handleUndo = useCallback(() => {
    const result = undo(state.nodes, state.edges);
    if (result) {
      dispatch({
        type: 'BATCH',
        actions: [
          { type: 'SET_NODES', nodes: result.nodes },
          { type: 'SET_EDGES', edges: result.edges },
        ],
      });
    }
  }, [undo, state.nodes, state.edges]);

  const handleRedo = useCallback(() => {
    const result = redo(state.nodes, state.edges);
    if (result) {
      dispatch({
        type: 'BATCH',
        actions: [
          { type: 'SET_NODES', nodes: result.nodes },
          { type: 'SET_EDGES', edges: result.edges },
        ],
      });
    }
  }, [redo, state.nodes, state.edges]);

  const selectAll = useCallback(() => {
    dispatch({ type: 'SELECT_ALL' });
  }, []);

  const getSelectionCount = useCallback(() => {
    return state.nodes.filter(n => n.selected).length + state.edges.filter(e => e.selected).length;
  }, [state.nodes, state.edges]);

  // ─── Copy/Paste ─────────────────────────────────────────

  const copySelected = useCallback(() => {
    const selectedNodes = state.nodes.filter(n => n.selected);
    if (selectedNodes.length === 0) return;
    const selectedIds = new Set(selectedNodes.map(n => n.id));
    const selectedEdges = state.edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target));
    clipboard.current = { nodes: structuredClone(selectedNodes), edges: structuredClone(selectedEdges) };
  }, [state.nodes, state.edges]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard.current || clipboard.current.nodes.length === 0) return;
    takeSnapshot(state.nodes, state.edges);

    const idMap = new Map<string, string>();
    const newNodes = clipboard.current.nodes.map(n => {
      const newId = crypto.randomUUID();
      idMap.set(n.id, newId);
      return { ...n, id: newId, x: n.x + 30, y: n.y + 30, selected: true, data: { ...n.data } };
    });

    const newEdges = clipboard.current.edges.map(e => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
      selected: false,
      data: { ...e.data },
    }));

    dispatch({
      type: 'BATCH',
      actions: [
        { type: 'DESELECT_ALL' },
        ...newNodes.map(n => ({ type: 'ADD_NODE' as const, node: n })),
        ...newEdges.map(e => ({ type: 'ADD_EDGE' as const, edge: e })),
      ],
    });

    // Shift clipboard offset for repeated paste
    clipboard.current = {
      nodes: clipboard.current.nodes.map(n => ({ ...n, x: n.x + 30, y: n.y + 30 })),
      edges: clipboard.current.edges,
    };
  }, [state.nodes, state.edges, takeSnapshot]);

  // ─── Mouse event handlers ───────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readOnly && e.button !== 1) return; // allow middle-click pan in readOnly
      if (contextMenu) { setContextMenu(null); return; }

      const canvasPos = toCanvas(e.clientX, e.clientY);

      // Check for waypoint handle click (edge bending)
      if (!readOnly && e.button === 0) {
        const waypointEl = (e.target as SVGElement).closest('[data-waypoint-index]');
        if (waypointEl) {
          const wpIndex = parseInt(waypointEl.getAttribute('data-waypoint-index') ?? '0', 10);
          const edgeId = waypointEl.getAttribute('data-edge-id') ?? '';
          if (edgeId) {
            takeSnapshot(state.nodes, state.edges);
            dispatch({
              type: 'SET_INTERACTION',
              interaction: {
                mode: 'bending-edge',
                edgeId,
                waypointIndex: wpIndex,
                startCanvasPos: canvasPos,
              },
            });
            return;
          }
        }
      }

      // Check for edge endpoint handle click (reconnecting)
      if (!readOnly && e.button === 0) {
        const endpointEl = (e.target as SVGElement).closest('[data-edge-endpoint]');
        if (endpointEl) {
          const endType = endpointEl.getAttribute('data-edge-endpoint') as 'source' | 'target';
          const edgeId = endpointEl.getAttribute('data-edge-id') ?? '';
          const edge = state.edges.find(ed => ed.id === edgeId);
          if (edge) {
            const sourceNode = nodeMap.current.get(edge.source);
            const targetNode = nodeMap.current.get(edge.target);
            if (sourceNode && targetNode) {
              const ep = resolveEdgeEndpoints(edge, sourceNode, targetNode);
              takeSnapshot(state.nodes, state.edges);
              // The "fixed" end is the one NOT being dragged
              const fixedNodeId = endType === 'source' ? edge.target : edge.source;
              const fixedPort = endType === 'source' ? ep.targetSide : ep.sourceSide;
              dispatch({
                type: 'SET_INTERACTION',
                interaction: {
                  mode: 'reconnecting-edge',
                  edgeId,
                  end: endType,
                  fixedNodeId,
                  fixedPort,
                  previewEnd: canvasPos,
                },
              });
              return;
            }
          }
        }
      }

      // Check for port click (edge creation)
      if (!readOnly && e.button === 0) {
        const portHit = findPortAtPoint(state.nodes, canvasPos, 10 / state.viewport.zoom);
        if (portHit) {
          dispatch({
            type: 'SET_INTERACTION',
            interaction: {
              mode: 'connecting',
              sourceNodeId: portHit.nodeId,
              sourcePort: portHit.side,
              previewEnd: canvasPos,
            },
          });
          return;
        }
      }

      // Check for resize handle on selected node
      if (!readOnly && e.button === 0) {
        const selectedNodes = state.nodes.filter(n => n.selected);
        if (selectedNodes.length === 1) {
          const handle = findResizeHandleAtPoint(selectedNodes[0], canvasPos, 8 / state.viewport.zoom);
          if (handle) {
            const n = selectedNodes[0];
            dispatch({
              type: 'SET_INTERACTION',
              interaction: {
                mode: 'resizing',
                nodeId: n.id,
                handle,
                startBounds: { x: n.x, y: n.y, width: n.width, height: n.height },
                startCanvasPos: canvasPos,
              },
            });
            return;
          }
        }
      }

      // Check for node click
      const hitNode = findNodeAtPoint(state.nodes, canvasPos);

      if (hitNode && e.button === 0 && !readOnly) {
        // Start dragging
        const isSelected = hitNode.selected;
        const isShift = e.shiftKey;

        if (isShift) {
          dispatch({ type: 'SELECT_NODE', nodeId: hitNode.id, additive: true });
        } else if (!isSelected) {
          dispatch({ type: 'SELECT_NODE', nodeId: hitNode.id, additive: false });
        }

        // Collect all selected node IDs (after selection update)
        const selectedIds = isShift
          ? state.nodes.filter(n => n.selected || n.id === hitNode.id).map(n => n.id)
          : isSelected
            ? state.nodes.filter(n => n.selected).map(n => n.id)
            : [hitNode.id];

        const startPositions = new Map<string, Point>();
        for (const n of state.nodes) {
          if (selectedIds.includes(n.id)) {
            startPositions.set(n.id, { x: n.x, y: n.y });
          }
        }

        takeSnapshot(state.nodes, state.edges);

        dispatch({
          type: 'SET_INTERACTION',
          interaction: {
            mode: 'dragging',
            nodeIds: selectedIds,
            startPositions,
            startCanvasPos: canvasPos,
          },
        });
        return;
      }

      // Check for edge click — start a pending bend (becomes actual bend on drag)
      if (e.button === 0) {
        const hitEdgeId = (e.target as SVGElement).closest('[data-edge-hit]')?.getAttribute('data-edge-hit');
        if (hitEdgeId) {
          dispatch({ type: 'SELECT_EDGE', edgeId: hitEdgeId, additive: e.shiftKey });
          if (!readOnly) {
            dispatch({
              type: 'SET_INTERACTION',
              interaction: {
                mode: 'edge-bend-pending',
                edgeId: hitEdgeId,
                startCanvasPos: canvasPos,
                startScreenX: e.clientX,
                startScreenY: e.clientY,
              },
            });
          }
          return;
        }
      }

      // Pan (middle-click, or left-click in pan mode, or space+click)
      if (e.button === 1 || (e.button === 0 && (interactionMode === 'pan' || readOnly))) {
        dispatch({
          type: 'SET_INTERACTION',
          interaction: {
            mode: 'panning',
            startScreenX: e.clientX,
            startScreenY: e.clientY,
            startViewport: { ...state.viewport },
          },
        });
        return;
      }

      // Rubber band selection (left-click in select mode on empty space)
      if (e.button === 0 && interactionMode === 'select' && !readOnly) {
        dispatch({ type: 'DESELECT_ALL' });
        dispatch({
          type: 'SET_INTERACTION',
          interaction: {
            mode: 'selecting',
            startCanvasX: canvasPos.x,
            startCanvasY: canvasPos.y,
            currentCanvasX: canvasPos.x,
            currentCanvasY: canvasPos.y,
          },
        });
      }
    },
    [readOnly, state.nodes, state.edges, state.viewport, interactionMode, toCanvas, contextMenu, takeSnapshot],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const canvasPos = toCanvas(e.clientX, e.clientY);

      switch (state.interaction.mode) {
        case 'panning': {
          const dx = e.clientX - state.interaction.startScreenX;
          const dy = e.clientY - state.interaction.startScreenY;
          dispatch({
            type: 'SET_VIEWPORT',
            viewport: {
              x: state.interaction.startViewport.x + dx,
              y: state.interaction.startViewport.y + dy,
              zoom: state.interaction.startViewport.zoom,
            },
          });
          break;
        }
        case 'dragging': {
          const dx = canvasPos.x - state.interaction.startCanvasPos.x;
          const dy = canvasPos.y - state.interaction.startCanvasPos.y;

          // First, compute tentative new positions
          let newNodes = state.nodes.map(n => {
            const startPos = state.interaction.mode === 'dragging' ? state.interaction.startPositions.get(n.id) : null;
            if (!startPos) return n;
            const newPos = snapEnabled
              ? { x: snapVal(startPos.x + dx, GRID_SIZE), y: snapVal(startPos.y + dy, GRID_SIZE) }
              : { x: startPos.x + dx, y: startPos.y + dy };
            return { ...n, x: newPos.x, y: newPos.y };
          });

          // Compute alignment guides (only when not snapping to grid)
          const draggingState = state.interaction as Extract<InteractionState, { mode: 'dragging' }>;
          if (!snapEnabled) {
            const alignment = computeAlignmentGuides(draggingState.nodeIds, newNodes);

            // Apply alignment snapping
            if (alignment.snapDx !== 0 || alignment.snapDy !== 0) {
              newNodes = newNodes.map(n => {
                if (!draggingState.nodeIds.includes(n.id)) return n;
                return { ...n, x: n.x + alignment.snapDx, y: n.y + alignment.snapDy };
              });
            }

            dispatch({ type: 'SET_ALIGNMENT_GUIDES', guides: alignment.guides });
          } else {
            // Clear guides when using grid snap
            if (state.alignmentGuides.length > 0) {
              dispatch({ type: 'SET_ALIGNMENT_GUIDES', guides: [] });
            }
          }

          dispatch({ type: 'SET_NODES', nodes: newNodes });
          break;
        }
        case 'connecting': {
          dispatch({
            type: 'SET_INTERACTION',
            interaction: { ...state.interaction, previewEnd: canvasPos },
          });
          // Highlight port under cursor
          const portHit = findPortAtPoint(state.nodes, canvasPos, 12 / state.viewport.zoom);
          dispatch({
            type: 'SET_HOVERED_PORT',
            info: portHit ? { nodeId: portHit.nodeId, side: portHit.side } : null,
          });
          break;
        }
        case 'reconnecting-edge': {
          dispatch({
            type: 'SET_INTERACTION',
            interaction: { ...state.interaction, previewEnd: canvasPos },
          });
          // Highlight port under cursor (exclude the fixed node's original port)
          const reconPortHit = findPortAtPoint(state.nodes, canvasPos, 12 / state.viewport.zoom);
          dispatch({
            type: 'SET_HOVERED_PORT',
            info: reconPortHit ? { nodeId: reconPortHit.nodeId, side: reconPortHit.side } : null,
          });
          break;
        }
        case 'selecting': {
          dispatch({
            type: 'SET_INTERACTION',
            interaction: { ...state.interaction, currentCanvasX: canvasPos.x, currentCanvasY: canvasPos.y },
          });
          // Update selection based on rubber band
          const rect = normalizeRect(
            state.interaction.startCanvasX,
            state.interaction.startCanvasY,
            canvasPos.x,
            canvasPos.y,
          );
          dispatch({ type: 'SELECT_IN_RECT', rect });
          break;
        }
        case 'edge-bend-pending': {
          // If the user drags past a threshold, decide: parallel shift or vertex bend
          const pending = state.interaction as Extract<InteractionState, { mode: 'edge-bend-pending' }>;
          const dx = e.clientX - pending.startScreenX;
          const dy = e.clientY - pending.startScreenY;
          const dragDist = Math.sqrt(dx * dx + dy * dy);

          if (dragDist > 4) {
            const edge = state.edges.find(ed => ed.id === pending.edgeId);
            if (!edge) break;

            takeSnapshot(state.nodes, state.edges);

            // Get full path and find which segment was clicked
            const pathPoints = getEdgeFullPathPoints(edge, nodeMap.current);
            if (!pathPoints || pathPoints.length < 2) break;
            const segIdx = findClosestSegment(pathPoints, pending.startCanvasPos);
            const segA = pathPoints[segIdx];
            const segB = pathPoints[segIdx + 1];

            // Compute segment direction and perpendicular
            const segDx = segB.x - segA.x;
            const segDy = segB.y - segA.y;
            const segLen = Math.sqrt(segDx * segDx + segDy * segDy);

            // For zero-length segments, fall through to vertex mode
            if (segLen > 0.1) {
              const segDirX = segDx / segLen;
              const segDirY = segDy / segLen;
              // Perpendicular: rotate 90° CCW
              const perpX = -segDirY;
              const perpY = segDirX;

              // Decompose the drag vector (in canvas coords) into parallel and perpendicular
              const dragCanvasDx = canvasPos.x - pending.startCanvasPos.x;
              const dragCanvasDy = canvasPos.y - pending.startCanvasPos.y;
              const parallelComponent = Math.abs(dragCanvasDx * segDirX + dragCanvasDy * segDirY);
              const perpComponent = Math.abs(dragCanvasDx * perpX + dragCanvasDy * perpY);

              if (perpComponent > parallelComponent) {
                // ─── Parallel shift mode ───
                // Insert two waypoints that form a segment parallel to the original.
                // segIdx is 0-based in pathPoints which is [sourcePort, ...waypoints, targetPort],
                // so the waypoint-array insert index for point pathPoints[segIdx] is (segIdx - 1 + 1) = segIdx,
                // accounting for the sourcePort at pathPoints[0] not being in the waypoints array.
                // Waypoint insert index for pathPoints[segIdx] is segIdx (before first wp) or segIdx-1+1 for others.
                // More precisely: pathPoints[0] = sourcePort, pathPoints[1..n-1] = waypoints, pathPoints[n] = targetPort.
                // So waypoint index for pathPoints[k] (where k>=1 and k<=n-1) is k-1.
                // The two points forming the clicked segment are pathPoints[segIdx] and pathPoints[segIdx+1].
                // We insert two new waypoints at the waypoint-array position corresponding to between these.
                const wpInsertIdx = segIdx; // insert position in waypoints array (0 = before first wp)

                // Initial positions = the projected click point on the segment, duplicated
                // As user drags, both move perpendicular
                const projT = segLen > 0
                  ? Math.max(0, Math.min(1, ((pending.startCanvasPos.x - segA.x) * segDx + (pending.startCanvasPos.y - segA.y) * segDy) / (segLen * segLen)))
                  : 0.5;
                // Place the two waypoints at 1/4 and 3/4 of the segment (or at segment endpoints for short segments)
                const margin = Math.min(0.25, 0.25); // fraction inset from endpoints
                const tA = Math.max(margin, Math.min(projT - 0.05, 1 - margin));
                const tB = Math.min(1 - margin, Math.max(projT + 0.05, margin));
                const posA = { x: segA.x + tA * segDx, y: segA.y + tA * segDy };
                const posB = { x: segA.x + tB * segDx, y: segA.y + tB * segDy };

                // Apply the initial perpendicular offset from the drag
                const perpOffset = dragCanvasDx * perpX + dragCanvasDy * perpY;
                const wpA = { x: posA.x + perpOffset * perpX, y: posA.y + perpOffset * perpY };
                const wpB = { x: posB.x + perpOffset * perpX, y: posB.y + perpOffset * perpY };

                const newWaypoints = [...edge.waypoints];
                newWaypoints.splice(wpInsertIdx, 0, wpA, wpB);
                dispatch({ type: 'SET_EDGE_WAYPOINTS', edgeId: edge.id, waypoints: newWaypoints });

                dispatch({
                  type: 'SET_INTERACTION',
                  interaction: {
                    mode: 'parallel-shifting-edge',
                    edgeId: edge.id,
                    waypointIndexA: wpInsertIdx,
                    waypointIndexB: wpInsertIdx + 1,
                    perpDirection: { x: perpX, y: perpY },
                    startCanvasPos: pending.startCanvasPos,
                    originalPosA: posA,
                    originalPosB: posB,
                  },
                });
                break;
              }
            }

            // ─── Vertex bend mode (default / parallel drag along segment) ───
            const snappedPos = snapEnabled
              ? { x: snapVal(canvasPos.x, GRID_SIZE), y: snapVal(canvasPos.y, GRID_SIZE) }
              : canvasPos;
            const insertIdx = findBestWaypointInsertionIndex(edge, pending.startCanvasPos);
            const newWaypoints = [...edge.waypoints];
            newWaypoints.splice(insertIdx, 0, snappedPos);
            dispatch({ type: 'SET_EDGE_WAYPOINTS', edgeId: edge.id, waypoints: newWaypoints });
            dispatch({
              type: 'SET_INTERACTION',
              interaction: {
                mode: 'bending-edge',
                edgeId: edge.id,
                waypointIndex: insertIdx,
                startCanvasPos: canvasPos,
              },
            });
          }
          break;
        }
        case 'bending-edge': {
          const bending = state.interaction as Extract<InteractionState, { mode: 'bending-edge' }>;
          const edge = state.edges.find(ed => ed.id === bending.edgeId);
          if (edge) {
            const newWaypoints = [...edge.waypoints];

            // Try orthogonal snapping with neighbor points first
            const neighbors = getEdgeNeighborPoints(edge, bending.waypointIndex, nodeMap.current);
            if (neighbors) {
              const { snapped, guides } = computeEdgeWaypointSnap(canvasPos, neighbors.prev, neighbors.next);
              if (guides.length > 0) {
                // Alignment snap overrides grid snap
                newWaypoints[bending.waypointIndex] = snapped;
                dispatch({ type: 'SET_ALIGNMENT_GUIDES', guides });
                dispatch({ type: 'SET_EDGE_WAYPOINTS', edgeId: bending.edgeId, waypoints: newWaypoints });
                break;
              }
            }

            // Fall through to grid snap (or raw position)
            if (state.alignmentGuides.length > 0) {
              dispatch({ type: 'SET_ALIGNMENT_GUIDES', guides: [] });
            }
            const snappedPos = snapEnabled
              ? { x: snapVal(canvasPos.x, GRID_SIZE), y: snapVal(canvasPos.y, GRID_SIZE) }
              : canvasPos;
            newWaypoints[bending.waypointIndex] = snappedPos;
            dispatch({ type: 'SET_EDGE_WAYPOINTS', edgeId: bending.edgeId, waypoints: newWaypoints });
          }
          break;
        }
        case 'parallel-shifting-edge': {
          const shifting = state.interaction as Extract<InteractionState, { mode: 'parallel-shifting-edge' }>;
          const edge = state.edges.find(ed => ed.id === shifting.edgeId);
          if (edge) {
            // Project total drag delta onto the perpendicular direction
            const totalDx = canvasPos.x - shifting.startCanvasPos.x;
            const totalDy = canvasPos.y - shifting.startCanvasPos.y;
            const perpOffset = totalDx * shifting.perpDirection.x + totalDy * shifting.perpDirection.y;

            let wpA = {
              x: shifting.originalPosA.x + perpOffset * shifting.perpDirection.x,
              y: shifting.originalPosA.y + perpOffset * shifting.perpDirection.y,
            };
            let wpB = {
              x: shifting.originalPosB.x + perpOffset * shifting.perpDirection.x,
              y: shifting.originalPosB.y + perpOffset * shifting.perpDirection.y,
            };

            if (snapEnabled) {
              wpA = { x: snapVal(wpA.x, GRID_SIZE), y: snapVal(wpA.y, GRID_SIZE) };
              wpB = { x: snapVal(wpB.x, GRID_SIZE), y: snapVal(wpB.y, GRID_SIZE) };
            }

            const newWaypoints = [...edge.waypoints];
            newWaypoints[shifting.waypointIndexA] = wpA;
            newWaypoints[shifting.waypointIndexB] = wpB;
            dispatch({ type: 'SET_EDGE_WAYPOINTS', edgeId: shifting.edgeId, waypoints: newWaypoints });
          }
          break;
        }
        case 'resizing': {
          const resizing = state.interaction as Extract<InteractionState, { mode: 'resizing' }>;
          const dx = canvasPos.x - resizing.startCanvasPos.x;
          const dy = canvasPos.y - resizing.startCanvasPos.y;
          const nodeType = state.nodes.find(n => n.id === resizing.nodeId)?.type ?? 'system';
          const mins = NODE_DEFAULT_SIZES[nodeType] ?? NODE_DEFAULT_SIZES.system;
          let bounds = applyResize(resizing.startBounds, resizing.handle, dx, dy, mins.minWidth, mins.minHeight);
          if (snapEnabled) {
            bounds = {
              x: snapVal(bounds.x, GRID_SIZE),
              y: snapVal(bounds.y, GRID_SIZE),
              width: Math.max(mins.minWidth, snapVal(bounds.width, GRID_SIZE)),
              height: Math.max(mins.minHeight, snapVal(bounds.height, GRID_SIZE)),
            };
          }
          dispatch({ type: 'RESIZE_NODE', nodeId: resizing.nodeId, bounds });
          break;
        }
        case 'idle': {
          // Hover detection
          const hoveredNode = findNodeAtPoint(state.nodes, canvasPos);
          if (hoveredNode?.id !== state.hoveredNodeId) {
            dispatch({ type: 'SET_HOVERED_NODE', nodeId: hoveredNode?.id ?? null });
          }
          // Port hover
          const portHit = findPortAtPoint(state.nodes, canvasPos, 10 / state.viewport.zoom);
          dispatch({
            type: 'SET_HOVERED_PORT',
            info: portHit ? { nodeId: portHit.nodeId, side: portHit.side } : null,
          });
          break;
        }
      }
    },
    [state, toCanvas, snapEnabled],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      switch (state.interaction.mode) {
        case 'connecting': {
          const canvasPos = toCanvas(e.clientX, e.clientY);
          const targetPort = findPortAtPoint(state.nodes, canvasPos, 12 / state.viewport.zoom);

          if (targetPort && targetPort.nodeId !== state.interaction.sourceNodeId) {
            takeSnapshot(state.nodes, state.edges);
            const newEdge: CanvasEdge = {
              id: crypto.randomUUID(),
              source: state.interaction.sourceNodeId,
              target: targetPort.nodeId,
              sourceHandle: state.interaction.sourcePort,
              targetHandle: targetPort.side,
              type: 'labeled',
              data: { label: '' },
              waypoints: [],
              selected: false,
              markerEnd: { type: 'arrowclosed', width: 16, height: 16 },
            };
            dispatch({ type: 'ADD_EDGE', edge: newEdge });
          }
          dispatch({ type: 'SET_HOVERED_PORT', info: null });
          break;
        }
        case 'reconnecting-edge': {
          const canvasPos = toCanvas(e.clientX, e.clientY);
          const recon = state.interaction as Extract<InteractionState, { mode: 'reconnecting-edge' }>;
          const dropPort = findPortAtPoint(state.nodes, canvasPos, 12 / state.viewport.zoom);

          if (dropPort && dropPort.nodeId !== recon.fixedNodeId) {
            // Reconnect: update the edge's source or target
            const updates: Partial<CanvasEdge> = recon.end === 'source'
              ? { source: dropPort.nodeId, sourceHandle: dropPort.side }
              : { target: dropPort.nodeId, targetHandle: dropPort.side };
            dispatch({ type: 'UPDATE_EDGE', edgeId: recon.edgeId, updates });
          }
          // If dropped on empty space or same node, snapshot was already taken so undo reverts
          dispatch({ type: 'SET_HOVERED_PORT', info: null });
          break;
        }
        case 'dragging':
          // Clear alignment guides on drop
          if (state.alignmentGuides.length > 0) {
            dispatch({ type: 'SET_ALIGNMENT_GUIDES', guides: [] });
          }
          break;
        case 'edge-bend-pending':
          // Released without dragging — was just a click to select the edge
          break;
        case 'bending-edge':
        case 'parallel-shifting-edge':
          // Clear alignment guides on drop
          if (state.alignmentGuides.length > 0) {
            dispatch({ type: 'SET_ALIGNMENT_GUIDES', guides: [] });
          }
          break;
        case 'selecting':
        case 'resizing':
        case 'panning':
          break;
      }
      dispatch({ type: 'SET_INTERACTION', interaction: { mode: 'idle' } });
    },
    [state, toCanvas, takeSnapshot],
  );

  // ─── Wheel (zoom/pan) ─────────────────────────────────
  // Must use a native listener with { passive: false } so preventDefault()
  // actually blocks the browser's built-in pinch-to-zoom on the page.

  const viewportRef = useRef(state.viewport);
  viewportRef.current = state.viewport;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey) {
        // Pinch-to-zoom (trackpad pinch sends ctrlKey + deltaY)
        const rect = containerRef.current?.getBoundingClientRect() ?? new DOMRect();
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newVp = zoomAtPoint(viewportRef.current, e.clientX, e.clientY, rect, delta, MIN_ZOOM, MAX_ZOOM);
        dispatch({ type: 'SET_VIEWPORT', viewport: newVp });
      } else {
        // Two-finger scroll → pan the canvas
        const vp = viewportRef.current;
        dispatch({
          type: 'SET_VIEWPORT',
          viewport: {
            x: vp.x - e.deltaX,
            y: vp.y - e.deltaY,
            zoom: vp.zoom,
          },
        });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ─── Double-click (edge label editing) ─────────────────

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readOnly) return;

      // Check for waypoint double-click (delete waypoint)
      const waypointEl = (e.target as SVGElement).closest('[data-waypoint-index]');
      if (waypointEl) {
        const wpIndex = parseInt(waypointEl.getAttribute('data-waypoint-index') ?? '0', 10);
        const edgeId = waypointEl.getAttribute('data-edge-id') ?? '';
        const edge = state.edges.find(ed => ed.id === edgeId);
        if (edge) {
          takeSnapshot(state.nodes, state.edges);
          const newWaypoints = edge.waypoints.filter((_, i) => i !== wpIndex);
          dispatch({ type: 'SET_EDGE_WAYPOINTS', edgeId, waypoints: newWaypoints });
        }
        return;
      }

      // Check for edge label double-click vs edge path double-click
      const labelPlaceholder = (e.target as SVGElement).closest('[data-edge-label-placeholder]')?.getAttribute('data-edge-label-placeholder');

      if (labelPlaceholder) {
        const edge = state.edges.find(ed => ed.id === labelPlaceholder);
        if (edge) {
          setEditingLabel({
            edgeId: edge.id,
            value: edge.data.label ?? '',
            screenX: e.clientX,
            screenY: e.clientY,
          });
        }
        return;
      }

      // Check for edge hit — double-click opens label editor
      const edgeHit = (e.target as SVGElement).closest('[data-edge-hit]')?.getAttribute('data-edge-hit');

      if (edgeHit) {
        const edge = state.edges.find(ed => ed.id === edgeHit);
        if (edge) {
          // Double-click on edge → open label editor (for both labeled and unlabeled)
          setEditingLabel({
            edgeId: edge.id,
            value: edge.data.label ?? '',
            screenX: e.clientX,
            screenY: e.clientY,
          });
        }
      }
    },
    [readOnly, state.edges, state.nodes, toCanvas, snapEnabled, takeSnapshot],
  );

  // ─── Node click (detail popup) ─────────────────────────

  const handleNodeClickEvent = useCallback(
    (_e: React.MouseEvent<SVGGElement>, node: CanvasNode) => {
      if (state.interaction.mode !== 'idle') return;
      // Only fire onNodeClick for left-click that didn't move (drag)
      onNodeClick?.({
        id: node.id,
        data: node.data as unknown as Record<string, unknown>,
        position: { x: node.x, y: node.y },
        width: node.width,
        height: node.height,
        selected: node.selected,
        type: node.type,
      });
    },
    [onNodeClick, state.interaction.mode],
  );

  // ─── Context menu ──────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (readOnly) return;
      e.preventDefault();

      const canvasPos = toCanvas(e.clientX, e.clientY);

      // Check node
      const hitNode = findNodeAtPoint(state.nodes, canvasPos);
      if (hitNode) {
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', nodeId: hitNode.id });
        return;
      }

      // Check edge
      const edgeHit = (e.target as SVGElement).closest('[data-edge-hit]')?.getAttribute('data-edge-hit');
      if (edgeHit) {
        const edge = state.edges.find(ed => ed.id === edgeHit);
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'edge', edgeId: edgeHit, edgeType: edge?.type });
        return;
      }

      // Pane context menu
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'pane' });
    },
    [readOnly, state.nodes, state.edges, toCanvas],
  );

  const handleContextAction = useCallback(
    (action: string) => {
      if (!contextMenu) return;

      if (contextMenu.type === 'node' && contextMenu.nodeId) {
        const nodeId = contextMenu.nodeId;
        if (action === 'edit') {
          const node = state.nodes.find(n => n.id === nodeId);
          if (node) {
            onNodeClick?.({
              id: node.id,
              data: node.data as unknown as Record<string, unknown>,
              position: { x: node.x, y: node.y },
              width: node.width,
              height: node.height,
              selected: node.selected,
              type: node.type,
            });
          }
        } else if (action === 'duplicate') {
          const node = state.nodes.find(n => n.id === nodeId);
          if (node) {
            takeSnapshot(state.nodes, state.edges);
            dispatch({
              type: 'ADD_NODE',
              node: {
                ...node,
                id: crypto.randomUUID(),
                x: node.x + 30,
                y: node.y + 30,
                selected: false,
                data: { ...node.data },
              },
            });
          }
        } else if (action === 'delete') {
          takeSnapshot(state.nodes, state.edges);
          dispatch({ type: 'DELETE_NODES', nodeIds: [nodeId] });
        } else if (action === 'toFront') {
          dispatch({ type: 'BRING_TO_FRONT', nodeId });
        } else if (action === 'toBack') {
          dispatch({ type: 'SEND_TO_BACK', nodeId });
        }
      } else if (contextMenu.type === 'edge' && contextMenu.edgeId) {
        const edgeId = contextMenu.edgeId;
        if (action === 'delete') {
          takeSnapshot(state.nodes, state.edges);
          dispatch({ type: 'DELETE_EDGES', edgeIds: [edgeId] });
        } else if (action === 'editLabel') {
          dispatch({ type: 'SELECT_EDGE', edgeId, additive: false });
        } else if (action === 'straightenEdge') {
          takeSnapshot(state.nodes, state.edges);
          dispatch({ type: 'SET_EDGE_WAYPOINTS', edgeId, waypoints: [] });
        } else if (action === 'makeOrthogonal') {
          const edge = state.edges.find(e => e.id === edgeId);
          const sourceNode = edge ? nodeMap.current.get(edge.source) : undefined;
          const targetNode = edge ? nodeMap.current.get(edge.target) : undefined;
          if (edge && sourceNode && targetNode) {
            takeSnapshot(state.nodes, state.edges);
            const { sourceSide, targetSide } = getAutoPortSide(sourceNode, targetNode);
            const sSide = (edge.sourceHandle as PortSide | null) ?? sourceSide;
            const tSide = (edge.targetHandle as PortSide | null) ?? targetSide;
            const sourcePos = getPortPosition(sourceNode, sSide);
            const targetPos = getPortPosition(targetNode, tSide);
            const orthoPoints = computeOrthogonalPoints(
              sourcePos.x, sourcePos.y, sSide,
              targetPos.x, targetPos.y, tSide,
            );
            // Extract inner waypoints (exclude first=source and last=target endpoints)
            const innerWaypoints = orthoPoints.slice(1, -1);
            dispatch({ type: 'SET_EDGE_WAYPOINTS', edgeId, waypoints: innerWaypoints });
          }
        } else if (action.startsWith('edgeType:')) {
          const newType = action.replace('edgeType:', '') as CanvasEdgeType;
          takeSnapshot(state.nodes, state.edges);
          dispatch({ type: 'UPDATE_EDGE', edgeId, updates: { type: newType } });
        }
      } else if (contextMenu.type === 'pane') {
        if (action === 'paste') pasteClipboard();
        else if (action === 'selectAll') selectAll();
        else if (action === 'fitView') handleFitView();
      }

      setContextMenu(null);
    },
    [contextMenu, state.nodes, state.edges, onNodeClick, takeSnapshot, pasteClipboard, selectAll, handleFitView],
  );

  // ─── Keyboard shortcuts ────────────────────────────────

  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (mod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (mod && e.key === 'c') {
        e.preventDefault();
        copySelected();
      } else if (mod && e.key === 'v') {
        e.preventDefault();
        pasteClipboard();
      } else if (mod && e.key === 'a') {
        e.preventDefault();
        selectAll();
      } else if (mod && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const selectedIds = state.nodes.filter(n => n.selected).map(n => n.id);
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const step = snapEnabled ? GRID_SIZE : 1;
        const distance = e.shiftKey ? step * 5 : step;
        const dx = e.key === 'ArrowLeft' ? -distance : e.key === 'ArrowRight' ? distance : 0;
        const dy = e.key === 'ArrowUp' ? -distance : e.key === 'ArrowDown' ? distance : 0;
        takeSnapshot(state.nodes, state.edges);
        dispatch({ type: 'MOVE_NODES', nodeIds: selectedIds, dx, dy });
      }
    };

    const el = containerRef.current;
    el?.addEventListener('keydown', handleKeyDown);
    return () => el?.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, deleteSelected, handleUndo, handleRedo, copySelected, pasteClipboard, selectAll, duplicateSelected, state.nodes, state.edges, snapEnabled, takeSnapshot]);

  // ─── Expose API ────────────────────────────────────────

  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { __diagramApi?: DiagramCanvasApi }).__diagramApi = {
        updateNode: updateNodeData,
        updateEdge: updateEdgeData,
        deleteSelected,
        getFlowData,
        duplicateSelected,
        addNode,
        fitView: handleFitView,
        undo: handleUndo,
        redo: handleRedo,
        canUndo,
        canRedo,
        getSelectionCount,
        selectAll,
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
      };
    }
  });

  // ─── Save edge label ──────────────────────────────────

  const saveEdgeLabel = useCallback(() => {
    if (!editingLabel) return;
    updateEdgeData(editingLabel.edgeId, { label: editingLabel.value.trim() });
    setEditingLabel(null);
  }, [editingLabel, updateEdgeData]);

  // ─── Render ────────────────────────────────────────────

  const { nodes, edges, viewport, interaction } = state;
  const transform = `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`;

  const cursorStyle = (() => {
    switch (interaction.mode) {
      case 'panning': return 'grabbing';
      case 'dragging': return 'move';
      case 'connecting': return 'crosshair';
      case 'selecting': return 'crosshair';
      case 'resizing': return 'nwse-resize';
      case 'bending-edge': return 'grabbing';
      case 'edge-bend-pending': return 'grab';
      case 'reconnecting-edge': return 'crosshair';
      default:
        if (interactionMode === 'pan') return 'grab';
        return 'default';
    }
  })();

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gray-50"
      data-diagram-api
      tabIndex={0}
      style={{ cursor: cursorStyle }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Defs: arrow marker */}
        <defs>
          <marker
            id={ARROW_MARKER_ID}
            viewBox="0 0 16 16"
            refX={14}
            refY={8}
            markerWidth={10}
            markerHeight={10}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 16 8 L 0 16 Z" fill="#9CA3AF" />
          </marker>
          {/* Selected arrow marker (blue) */}
          <marker
            id={`${ARROW_MARKER_ID}-selected`}
            viewBox="0 0 16 16"
            refX={14}
            refY={8}
            markerWidth={10}
            markerHeight={10}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 16 8 L 0 16 Z" fill="#3B82F6" />
          </marker>
        </defs>

        {/* Background grid */}
        <g transform={transform}>
          <GridBackground zoom={viewport.zoom} snapEnabled={snapEnabled} />
        </g>

        {/* Canvas content */}
        <g transform={transform}>
          {/* Edges layer (below nodes) */}
          <g className="edges-layer">
            {edges.map(edge => {
              const sourceNode = nodeMap.current.get(edge.source);
              const targetNode = nodeMap.current.get(edge.target);
              if (!sourceNode || !targetNode) return null;
              // Compute obstacles for this edge (other nodes, excluding source/target)
              const obstacles = edge.type === 'labeled' && edge.waypoints.length === 0
                ? getObstaclesForEdge(nodes, edge)
                : undefined;
              return (
                <SvgEdge
                  key={edge.id}
                  edge={edge}
                  sourceNode={sourceNode}
                  targetNode={targetNode}
                  obstacles={obstacles}
                />
              );
            })}
          </g>

          {/* Connection preview */}
          {interaction.mode === 'connecting' && (() => {
            const sourceNode = nodeMap.current.get(interaction.sourceNodeId);
            if (!sourceNode) return null;
            const sourcePos = getPortPosition(sourceNode, interaction.sourcePort);
            return (
              <ConnectionPreview
                sourceX={sourcePos.x}
                sourceY={sourcePos.y}
                targetX={interaction.previewEnd.x}
                targetY={interaction.previewEnd.y}
              />
            );
          })()}

          {/* Reconnection preview */}
          {interaction.mode === 'reconnecting-edge' && (() => {
            const fixedNode = nodeMap.current.get(interaction.fixedNodeId);
            if (!fixedNode) return null;
            const fixedPos = getPortPosition(fixedNode, interaction.fixedPort);
            // Fixed end is the anchor; preview end is where cursor is dragging
            const srcX = interaction.end === 'source' ? interaction.previewEnd.x : fixedPos.x;
            const srcY = interaction.end === 'source' ? interaction.previewEnd.y : fixedPos.y;
            const tgtX = interaction.end === 'target' ? interaction.previewEnd.x : fixedPos.x;
            const tgtY = interaction.end === 'target' ? interaction.previewEnd.y : fixedPos.y;
            return (
              <ConnectionPreview
                sourceX={srcX}
                sourceY={srcY}
                targetX={tgtX}
                targetY={tgtY}
              />
            );
          })()}

          {/* Nodes layer */}
          <g className="nodes-layer">
            {nodes.map(node => (
              <NodeWrapper
                key={node.id}
                node={node}
                isHovered={state.hoveredNodeId === node.id}
                hoveredPort={state.hoveredPortInfo?.nodeId === node.id ? state.hoveredPortInfo.side : null}
                interactionMode={interaction.mode}
                readOnly={readOnly}
                zoom={viewport.zoom}
                onClick={handleNodeClickEvent}
              />
            ))}
          </g>

          {/* Selection rubber band */}
          {interaction.mode === 'selecting' && (
            <SelectionRect interaction={interaction} />
          )}

          {/* Resize handles on selected nodes */}
          {!readOnly && interaction.mode === 'idle' && nodes.filter(n => n.selected).length === 1 && (
            <ResizeHandlesOverlay node={nodes.find(n => n.selected)!} zoom={viewport.zoom} />
          )}

          {/* Alignment guides */}
          {state.alignmentGuides.length > 0 && (
            <AlignmentGuidesOverlay guides={state.alignmentGuides} zoom={viewport.zoom} />
          )}
        </g>
      </svg>

      {/* Edge label editing overlay */}
      {editingLabel && (
        <div
          className="fixed z-50"
          style={{ left: editingLabel.screenX - 60, top: editingLabel.screenY - 14 }}
        >
          <input
            autoFocus
            value={editingLabel.value}
            onChange={e => setEditingLabel(prev => prev ? { ...prev, value: e.target.value } : null)}
            onBlur={saveEdgeLabel}
            onKeyDown={e => {
              if (e.key === 'Enter') saveEdgeLabel();
              if (e.key === 'Escape') setEditingLabel(null);
            }}
            className="px-2 py-0.5 bg-white border-2 border-primary-400 rounded text-[10px] text-gray-700 font-medium shadow-sm outline-none min-w-[60px]"
            placeholder="Label..."
          />
        </div>
      )}

      {/* MiniMap */}
      {showMinimap && (
        <MiniMapV2
          nodes={nodes}
          viewport={viewport}
          containerRef={containerRef}
          onViewportChange={(vp) => dispatch({ type: 'SET_VIEWPORT', viewport: vp })}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          edgeType={contextMenu.edgeType}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

/** SVG background grid dots */
const GridBackground = memo(function GridBackground({ zoom, snapEnabled }: { zoom: number; snapEnabled: boolean }) {
  if (!snapEnabled) return null;

  const gridSize = GRID_SIZE;

  return (
    <>
      <defs>
        <pattern
          id="grid-pattern"
          x={0}
          y={0}
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={gridSize / 2} cy={gridSize / 2} r={Math.max(0.5, 0.8 / zoom)} fill="#E5E7EB" />
        </pattern>
      </defs>
      <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#grid-pattern)" />
    </>
  );
});

/** Node wrapper with ports and hover effects */
const NodeWrapper = memo(function NodeWrapper({
  node,
  isHovered,
  hoveredPort,
  interactionMode,
  readOnly,
  zoom,
  onClick,
}: {
  node: CanvasNode;
  isHovered: boolean;
  hoveredPort: PortSide | null;
  interactionMode: string;
  readOnly: boolean;
  zoom: number;
  onClick: (e: React.MouseEvent<SVGGElement>, node: CanvasNode) => void;
}) {
  const showPorts = !readOnly && (isHovered || node.selected) && node.type !== 'group';

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      data-node-id={node.id}
      onClick={(e) => {
        // Only fire click if we weren't dragging
        if (interactionMode === 'idle') {
          onClick(e, node);
        }
      }}
      style={{ cursor: readOnly ? 'default' : 'move' }}
    >
      <SvgNodeRenderer node={node} />

      {/* Ports */}
      {showPorts && node.ports.map(port => {
        const pos = getPortPosition(
          { ...node, x: 0, y: 0 } as CanvasNode,
          port.side,
        );
        const isHoveredPort = hoveredPort === port.side;
        const portR = isHoveredPort ? 5 / zoom : 3.5 / zoom;

        return (
          <circle
            key={port.id}
            cx={pos.x}
            cy={pos.y}
            r={portR}
            fill={isHoveredPort ? '#3B82F6' : '#9CA3AF'}
            stroke="white"
            strokeWidth={1.5 / zoom}
            style={{ cursor: 'crosshair' }}
          />
        );
      })}
    </g>
  );
});

/** Rubber band selection rectangle */
function SelectionRect({ interaction }: {
  interaction: Extract<InteractionState, { mode: 'selecting' }>;
}) {
  const rect = normalizeRect(
    interaction.startCanvasX,
    interaction.startCanvasY,
    interaction.currentCanvasX,
    interaction.currentCanvasY,
  );

  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill="rgba(59, 130, 246, 0.1)"
      stroke="#3B82F6"
      strokeWidth={1}
      strokeDasharray="4 2"
      style={{ pointerEvents: 'none' }}
    />
  );
}

/** Resize handles for selected node */
const ResizeHandlesOverlay = memo(function ResizeHandlesOverlay({
  node,
  zoom,
}: {
  node: CanvasNode;
  zoom: number;
}) {
  const handles = getResizeHandlePositions(node);
  const size = 6 / zoom;

  return (
    <g className="resize-handles" style={{ pointerEvents: 'none' }}>
      {/* Selection border */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={1.5 / zoom}
        strokeDasharray={`${4 / zoom} ${2 / zoom}`}
        style={{ pointerEvents: 'none' }}
      />
      {/* Handle squares */}
      {handles.map(h => (
        <rect
          key={h.handle}
          x={h.x - size / 2}
          y={h.y - size / 2}
          width={size}
          height={size}
          fill="#3B82F6"
          stroke="white"
          strokeWidth={1 / zoom}
          rx={1 / zoom}
          style={{ pointerEvents: 'auto', cursor: getResizeCursor(h.handle) }}
        />
      ))}
    </g>
  );
});

/** Alignment guide lines overlay */
const AlignmentGuidesOverlay = memo(function AlignmentGuidesOverlay({
  guides,
  zoom,
}: {
  guides: AlignmentGuide[];
  zoom: number;
}) {
  return (
    <g className="alignment-guides" style={{ pointerEvents: 'none' }}>
      {guides.map((guide, i) => {
        if (guide.type === 'vertical') {
          return (
            <line
              key={`v-${i}`}
              x1={guide.position}
              y1={guide.from}
              x2={guide.position}
              y2={guide.to}
              stroke="#3B82F6"
              strokeWidth={1 / zoom}
              strokeDasharray={`${3 / zoom} ${2 / zoom}`}
              opacity={0.7}
            />
          );
        } else {
          return (
            <line
              key={`h-${i}`}
              x1={guide.from}
              y1={guide.position}
              x2={guide.to}
              y2={guide.position}
              stroke="#3B82F6"
              strokeWidth={1 / zoom}
              strokeDasharray={`${3 / zoom} ${2 / zoom}`}
              opacity={0.7}
            />
          );
        }
      })}
    </g>
  );
});

function getResizeCursor(handle: ResizeHandle): string {
  switch (handle) {
    case 'nw': case 'se': return 'nwse-resize';
    case 'ne': case 'sw': return 'nesw-resize';
    case 'n': case 's': return 'ns-resize';
    case 'e': case 'w': return 'ew-resize';
  }
}

// ─── Exported wrapper ───────────────────────────────────────

export function DiagramCanvasV2(props: DiagramCanvasV2Props) {
  return <DiagramCanvasV2Inner {...props} />;
}
