/**
 * Custom Diagram Engine - SVG Edge Renderers
 *
 * Renders edges as SVG path elements with optional labels.
 * Labels use SVG <text> for display and an HTML overlay for editing.
 */

import { memo } from 'react';
import type { CanvasEdge, CanvasNode, PortSide } from './types';
import { getSmoothStepPath, getStraightPath, getBezierPath, ARROW_MARKER_ID } from './edgePaths';
import { getPortPosition } from './math';
import { getAutoPortSide } from './edgePaths';

interface SvgEdgeProps {
  edge: CanvasEdge;
  sourceNode: CanvasNode;
  targetNode: CanvasNode;
  obstacles?: Array<{ x: number; y: number; width: number; height: number }>;
}

function computeEdgePath(
  edge: CanvasEdge,
  sourceNode: CanvasNode,
  targetNode: CanvasNode,
  obstacles?: Array<{ x: number; y: number; width: number; height: number }>,
) {
  // Determine source and target port positions
  // Handles can be null (meaning "auto-determine best port side")
  const validSides: PortSide[] = ['top', 'bottom', 'left', 'right'];
  let sourceSide: PortSide = validSides.includes(edge.sourceHandle as PortSide)
    ? (edge.sourceHandle as PortSide) : 'bottom';
  let targetSide: PortSide = validSides.includes(edge.targetHandle as PortSide)
    ? (edge.targetHandle as PortSide) : 'top';

  // If handles were null/invalid, auto-determine based on node positions
  if (!edge.sourceHandle || !validSides.includes(edge.sourceHandle as PortSide) ||
      !edge.targetHandle || !validSides.includes(edge.targetHandle as PortSide)) {
    const auto = getAutoPortSide(sourceNode, targetNode);
    if (!edge.sourceHandle || !validSides.includes(edge.sourceHandle as PortSide)) sourceSide = auto.sourceSide;
    if (!edge.targetHandle || !validSides.includes(edge.targetHandle as PortSide)) targetSide = auto.targetSide;
  }

  const sourcePos = getPortPosition(sourceNode, sourceSide);
  const targetPos = getPortPosition(targetNode, targetSide);

  switch (edge.type) {
    case 'straight':
      return getStraightPath(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y, edge.waypoints);
    case 'bezier':
      return getBezierPath(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y, sourceSide, targetSide, edge.waypoints);
    case 'labeled':
    default:
      return getSmoothStepPath(
        sourcePos.x, sourcePos.y, targetPos.x, targetPos.y,
        sourceSide, targetSide, edge.waypoints, 8,
        obstacles,
      );
  }
}

/** Resolve source/target port positions for an edge (exported for endpoint handles) */
export function resolveEdgeEndpoints(edge: CanvasEdge, sourceNode: CanvasNode, targetNode: CanvasNode) {
  const validSides: PortSide[] = ['top', 'bottom', 'left', 'right'];
  let sourceSide: PortSide = validSides.includes(edge.sourceHandle as PortSide)
    ? (edge.sourceHandle as PortSide) : 'bottom';
  let targetSide: PortSide = validSides.includes(edge.targetHandle as PortSide)
    ? (edge.targetHandle as PortSide) : 'top';
  if (!edge.sourceHandle || !validSides.includes(edge.sourceHandle as PortSide) ||
      !edge.targetHandle || !validSides.includes(edge.targetHandle as PortSide)) {
    const auto = getAutoPortSide(sourceNode, targetNode);
    if (!edge.sourceHandle || !validSides.includes(edge.sourceHandle as PortSide)) sourceSide = auto.sourceSide;
    if (!edge.targetHandle || !validSides.includes(edge.targetHandle as PortSide)) targetSide = auto.targetSide;
  }
  return {
    sourcePos: getPortPosition(sourceNode, sourceSide),
    targetPos: getPortPosition(targetNode, targetSide),
    sourceSide,
    targetSide,
  };
}

function SvgEdgeComponent({ edge, sourceNode, targetNode, obstacles }: SvgEdgeProps) {
  const { path, labelX, labelY } = computeEdgePath(edge, sourceNode, targetNode, obstacles);

  const strokeColor = edge.selected ? '#3B82F6' : '#9CA3AF';
  const strokeWidth = edge.selected ? 2.5 : 1.5;
  const label = edge.data.label;

  // Compute endpoint positions for draggable handles
  const endpoints = edge.selected ? resolveEdgeEndpoints(edge, sourceNode, targetNode) : null;

  return (
    <g className="edge" data-edge-id={edge.id}>
      {/* Invisible wider path for easier click targeting */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        data-edge-hit={edge.id}
        style={{ cursor: 'pointer' }}
      />
      {/* Visible edge path */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        markerEnd={`url(#${ARROW_MARKER_ID})`}
        style={{ pointerEvents: 'none' }}
      />
      {/* Edge label */}
      {label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-measureTextWidth(label, 10) / 2 - 6}
            y={-9}
            width={measureTextWidth(label, 10) + 12}
            height={18}
            rx={4}
            fill="white"
            stroke={edge.selected ? '#3B82F6' : '#E5E7EB'}
            strokeWidth={1}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight={500}
            fill="#4B5563"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {label}
          </text>
        </g>
      )}
      {/* "Double-click to label" placeholder for selected edges without labels */}
      {!label && edge.selected && (
        <g transform={`translate(${labelX}, ${labelY})`} data-edge-label-placeholder={edge.id}>
          <rect
            x={-52}
            y={-9}
            width={104}
            height={18}
            rx={4}
            fill="rgba(255,255,255,0.8)"
            stroke="#D1D5DB"
            strokeWidth={1}
            strokeDasharray="3 2"
            data-edge-hit={edge.id}
            style={{ cursor: 'pointer' }}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontStyle="italic"
            fill="#9CA3AF"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            Double-click to label
          </text>
        </g>
      )}
      {/* Waypoint handles for manual bending */}
      {edge.selected && edge.waypoints.map((wp, i) => (
        <g key={i}>
          {/* Invisible larger hit area for easier grabbing */}
          <circle
            cx={wp.x}
            cy={wp.y}
            r={12}
            fill="transparent"
            data-waypoint-index={i}
            data-edge-id={edge.id}
            style={{ cursor: 'grab' }}
          />
          {/* Visible handle */}
          <circle
            cx={wp.x}
            cy={wp.y}
            r={5}
            fill="white"
            stroke="#3B82F6"
            strokeWidth={2}
            data-waypoint-index={i}
            data-edge-id={edge.id}
            style={{ cursor: 'grab', pointerEvents: 'none' }}
          />
        </g>
      ))}
      {/* Endpoint handles for reconnecting (source and target) */}
      {edge.selected && endpoints && (
        <>
          {/* Source endpoint */}
          <circle
            cx={endpoints.sourcePos.x}
            cy={endpoints.sourcePos.y}
            r={12}
            fill="transparent"
            data-edge-endpoint="source"
            data-edge-id={edge.id}
            style={{ cursor: 'crosshair' }}
          />
          <circle
            cx={endpoints.sourcePos.x}
            cy={endpoints.sourcePos.y}
            r={5}
            fill="#3B82F6"
            stroke="white"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
          {/* Target endpoint (arrowhead end) */}
          <circle
            cx={endpoints.targetPos.x}
            cy={endpoints.targetPos.y}
            r={12}
            fill="transparent"
            data-edge-endpoint="target"
            data-edge-id={edge.id}
            style={{ cursor: 'crosshair' }}
          />
          <circle
            cx={endpoints.targetPos.x}
            cy={endpoints.targetPos.y}
            r={5}
            fill="#3B82F6"
            stroke="white"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}
    </g>
  );
}

/** Approximate text width for SVG label background sizing */
function measureTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55;
}

export const SvgEdge = memo(SvgEdgeComponent);

// ─── Connection preview edge ────────────────────────────────

interface ConnectionPreviewProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export function ConnectionPreview({ sourceX, sourceY, targetX, targetY }: ConnectionPreviewProps) {
  return (
    <path
      d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
      fill="none"
      stroke="#3B82F6"
      strokeWidth={2}
      strokeDasharray="6 3"
      markerEnd={`url(#${ARROW_MARKER_ID})`}
      style={{ pointerEvents: 'none' }}
    />
  );
}

// Export the path computation for external use
export { computeEdgePath };
