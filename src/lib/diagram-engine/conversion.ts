/**
 * Custom Diagram Engine - Data Conversion
 *
 * Converts between the React Flow data format (DiagramFlowData, stored in Supabase)
 * and the engine's internal types (CanvasNode, CanvasEdge).
 */

import type { DiagramFlowData, DiagramNodeData } from '@/types';
import type { CanvasNode, CanvasEdge, CanvasEdgeType, ViewportState, Port } from './types';
import { NODE_DEFAULT_SIZES, getDefaultPorts, getGroupPorts } from './types';
import type { DiagramNodeType } from '@/types/enums';

// ─── React Flow Node → CanvasNode ───────────────────────────

interface RFNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
  selected?: boolean;
  style?: Record<string, unknown>;
}

function toCanvasNode(rfNode: RFNode): CanvasNode {
  const nodeType = (rfNode.type ?? rfNode.data?.nodeType ?? 'system') as DiagramNodeType;
  const defaults = NODE_DEFAULT_SIZES[nodeType] ?? NODE_DEFAULT_SIZES.system;

  // React Flow stores measured dimensions; use them if available
  const width = rfNode.width ?? rfNode.measured?.width ?? defaults.width;
  const height = rfNode.height ?? rfNode.measured?.height ?? defaults.height;

  const ports: Port[] = nodeType === 'group' ? getGroupPorts() : getDefaultPorts();

  return {
    id: rfNode.id,
    type: nodeType,
    x: rfNode.position.x,
    y: rfNode.position.y,
    width,
    height,
    data: rfNode.data as unknown as DiagramNodeData,
    selected: false,
    ports,
  };
}

// ─── CanvasNode → React Flow Node ───────────────────────────

function toRFNode(node: CanvasNode): RFNode {
  return {
    id: node.id,
    type: node.type,
    position: { x: node.x, y: node.y },
    data: node.data as unknown as Record<string, unknown>,
    width: node.width,
    height: node.height,
    measured: { width: node.width, height: node.height },
    selected: node.selected,
  };
}

// ─── React Flow Edge → CanvasEdge ───────────────────────────

interface RFEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  data?: Record<string, unknown>;
  selected?: boolean;
  markerEnd?: unknown;
}

function toCanvasEdge(rfEdge: RFEdge): CanvasEdge {
  // Preserve null/undefined handles as null — critical for V1 compatibility.
  // V1 React Flow edges often have no sourceHandle/targetHandle, which means
  // "connect to any handle". Converting null to explicit port sides breaks V1.
  const sourceHandle = rfEdge.sourceHandle ?? null;
  const targetHandle = rfEdge.targetHandle ?? null;

  const edgeType = (rfEdge.type ?? 'labeled') as CanvasEdgeType;

  return {
    id: rfEdge.id,
    source: rfEdge.source,
    target: rfEdge.target,
    sourceHandle,
    targetHandle,
    type: edgeType,
    data: { label: (rfEdge.data?.label as string) ?? '' },
    waypoints: [],
    selected: false,
    markerEnd: rfEdge.markerEnd as CanvasEdge['markerEnd'],
  };
}

// ─── CanvasEdge → React Flow Edge ───────────────────────────

function toRFEdge(edge: CanvasEdge): RFEdge {
  // Only include sourceHandle/targetHandle if they have explicit values.
  // V1 React Flow edges often omit these fields entirely, meaning "auto-connect".
  // Adding explicit values (even null) can break V1 handle matching.
  const result: RFEdge = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    data: { label: edge.data.label ?? '' },
    selected: edge.selected,
    markerEnd: edge.markerEnd ?? { type: 'arrowclosed', width: 16, height: 16 },
  };

  if (edge.sourceHandle !== null) {
    result.sourceHandle = edge.sourceHandle;
  }
  if (edge.targetHandle !== null) {
    result.targetHandle = edge.targetHandle;
  }

  return result;
}

// ─── Full conversion ────────────────────────────────────────

export function flowDataToCanvas(flowData: DiagramFlowData): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: ViewportState;
} {
  const rfNodes = (flowData.nodes ?? []) as RFNode[];
  const rfEdges = (flowData.edges ?? []) as RFEdge[];

  return {
    nodes: rfNodes.map(toCanvasNode),
    edges: rfEdges.map(toCanvasEdge),
    viewport: flowData.viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}

export function canvasToFlowData(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  viewport: ViewportState,
): DiagramFlowData {
  return {
    nodes: nodes.map(toRFNode) as unknown[],
    edges: edges.map(toRFEdge) as unknown[],
    viewport,
  };
}
