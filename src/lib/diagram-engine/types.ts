/**
 * Custom Diagram Engine - Core Types
 *
 * These types define the internal representation used by the custom SVG-based
 * diagram canvas. They are converted to/from DiagramFlowData at the boundary
 * for Supabase persistence (same data model as the React Flow version).
 */

import type { DiagramNodeType, DiagramNodeData, DiagramEdgeData } from '@/types';

// ─── Geometry ────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  x: number;       // pan offset X (in screen pixels)
  y: number;       // pan offset Y (in screen pixels)
  zoom: number;    // scale factor (1 = 100%)
}

// ─── Ports ───────────────────────────────────────────────────

export type PortSide = 'top' | 'bottom' | 'left' | 'right';
export type PortDirection = 'in' | 'out' | 'both';

export interface Port {
  id: string;            // e.g. 'top', 'bottom', 'left', 'right' or custom
  side: PortSide;
  direction: PortDirection;
  offset?: number;       // 0-1 along the side (0.5 = center, default)
}

export interface PortPosition {
  x: number;   // canvas coordinate
  y: number;   // canvas coordinate
  side: PortSide;
}

// ─── Nodes ───────────────────────────────────────────────────

export interface CanvasNode {
  id: string;
  type: DiagramNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  data: DiagramNodeData;
  selected: boolean;
  ports: Port[];
  zIndex?: number;
}

// ─── Edges ───────────────────────────────────────────────────

export type CanvasEdgeType = 'labeled' | 'straight' | 'bezier';

export interface CanvasEdge {
  id: string;
  source: string;         // source node ID
  target: string;         // target node ID
  sourceHandle: string | null;   // port side or null (auto-determine)
  targetHandle: string | null;   // port side or null (auto-determine)
  type: CanvasEdgeType;
  data: DiagramEdgeData;
  waypoints: Point[];     // user-draggable bend points
  selected: boolean;
  markerEnd?: {
    type: string;
    width: number;
    height: number;
  };
}

// ─── Interaction States ──────────────────────────────────────

export type InteractionState =
  | { mode: 'idle' }
  | { mode: 'panning'; startScreenX: number; startScreenY: number; startViewport: ViewportState }
  | { mode: 'dragging'; nodeIds: string[]; startPositions: Map<string, Point>; startCanvasPos: Point }
  | { mode: 'connecting'; sourceNodeId: string; sourcePort: PortSide; previewEnd: Point }
  | { mode: 'selecting'; startCanvasX: number; startCanvasY: number; currentCanvasX: number; currentCanvasY: number }
  | { mode: 'resizing'; nodeId: string; handle: ResizeHandle; startBounds: Rect; startCanvasPos: Point }
  | { mode: 'bending-edge'; edgeId: string; waypointIndex: number; startCanvasPos: Point }
  | { mode: 'edge-bend-pending'; edgeId: string; startCanvasPos: Point; startScreenX: number; startScreenY: number }
  | { mode: 'parallel-shifting-edge'; edgeId: string; waypointIndexA: number; waypointIndexB: number; perpDirection: Point; startCanvasPos: Point; originalPosA: Point; originalPosB: Point }
  | { mode: 'reconnecting-edge'; edgeId: string; end: 'source' | 'target'; fixedNodeId: string; fixedPort: PortSide; previewEnd: Point };

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

// ─── Canvas State ────────────────────────────────────────────

/** Alignment guide line for smart snapping during drag */
export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;          // canvas coordinate (x for vertical, y for horizontal)
  from: number;              // start of guide line extent
  to: number;                // end of guide line extent
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: ViewportState;
  interaction: InteractionState;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  hoveredPortInfo: { nodeId: string; side: PortSide } | null;
  editingEdgeLabelId: string | null;
  alignmentGuides: AlignmentGuide[];
}

// ─── Actions ─────────────────────────────────────────────────

export type CanvasAction =
  | { type: 'SET_NODES'; nodes: CanvasNode[] }
  | { type: 'SET_EDGES'; edges: CanvasEdge[] }
  | { type: 'SET_VIEWPORT'; viewport: ViewportState }
  | { type: 'SET_INTERACTION'; interaction: InteractionState }
  | { type: 'SET_HOVERED_NODE'; nodeId: string | null }
  | { type: 'SET_HOVERED_EDGE'; edgeId: string | null }
  | { type: 'SET_HOVERED_PORT'; info: { nodeId: string; side: PortSide } | null }
  | { type: 'SET_EDITING_EDGE_LABEL'; edgeId: string | null }
  | { type: 'SET_ALIGNMENT_GUIDES'; guides: AlignmentGuide[] }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<CanvasNode> }
  | { type: 'UPDATE_NODE_DATA'; nodeId: string; data: Partial<DiagramNodeData> }
  | { type: 'UPDATE_EDGE'; edgeId: string; updates: Partial<CanvasEdge> }
  | { type: 'ADD_NODE'; node: CanvasNode }
  | { type: 'ADD_EDGE'; edge: CanvasEdge }
  | { type: 'DELETE_NODES'; nodeIds: string[] }
  | { type: 'DELETE_EDGES'; edgeIds: string[] }
  | { type: 'SELECT_NODE'; nodeId: string; additive: boolean }
  | { type: 'SELECT_EDGE'; edgeId: string; additive: boolean }
  | { type: 'SELECT_ALL' }
  | { type: 'DESELECT_ALL' }
  | { type: 'SELECT_IN_RECT'; rect: Rect }
  | { type: 'MOVE_NODES'; nodeIds: string[]; dx: number; dy: number }
  | { type: 'RESIZE_NODE'; nodeId: string; bounds: Rect }
  | { type: 'SET_EDGE_WAYPOINTS'; edgeId: string; waypoints: Point[] }
  | { type: 'BRING_TO_FRONT'; nodeId: string }
  | { type: 'SEND_TO_BACK'; nodeId: string }
  | { type: 'BATCH'; actions: CanvasAction[] };

// ─── Conversion helpers (React Flow ↔ Engine) ───────────────

/** Default sizes for each node type when no explicit size is stored */
export const NODE_DEFAULT_SIZES: Record<DiagramNodeType, { width: number; height: number; minWidth: number; minHeight: number }> = {
  system:   { width: 140, height: 56, minWidth: 100, minHeight: 40 },
  process:  { width: 140, height: 56, minWidth: 100, minHeight: 40 },
  database: { width: 120, height: 72, minWidth: 100, minHeight: 60 },
  form:     { width: 140, height: 52, minWidth: 100, minHeight: 40 },
  decision: { width: 140, height: 90, minWidth: 120, minHeight: 80 },
  document: { width: 140, height: 70, minWidth: 100, minHeight: 50 },
  cloud:    { width: 160, height: 80, minWidth: 120, minHeight: 60 },
  person:   { width: 100, height: 120, minWidth: 80, minHeight: 80 },
  queue:    { width: 140, height: 52, minWidth: 100, minHeight: 40 },
  note:     { width: 140, height: 64, minWidth: 100, minHeight: 50 },
  terminal: { width: 120, height: 44, minWidth: 100, minHeight: 36 },
  group:    { width: 240, height: 160, minWidth: 200, minHeight: 120 },
};

/** Default port definitions for nodes */
export function getDefaultPorts(): Port[] {
  return [
    { id: 'top', side: 'top', direction: 'in' },
    { id: 'left', side: 'left', direction: 'in' },
    { id: 'bottom', side: 'bottom', direction: 'out' },
    { id: 'right', side: 'right', direction: 'out' },
  ];
}

/** Group nodes don't have ports */
export function getGroupPorts(): Port[] {
  return [];
}
