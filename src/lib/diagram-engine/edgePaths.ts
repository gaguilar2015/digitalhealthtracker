/**
 * Custom Diagram Engine - Edge Path Calculation
 *
 * Computes SVG path strings for the three edge types:
 * - smooth step (orthogonal with rounded corners)
 * - straight
 * - bezier
 *
 * Also supports waypoints for manual edge bending.
 */

import type { Point, PortSide } from './types';
import { routeAroundObstacles, getObstaclesForEdge } from './orthogonalRouter';

export interface EdgePathResult {
  path: string;
  labelX: number;
  labelY: number;
}

// ─── Arrow marker ID ────────────────────────────────────────

export const ARROW_MARKER_ID = 'diagram-engine-arrow';

export function getArrowMarkerDef(): string {
  return `<marker id="${ARROW_MARKER_ID}" viewBox="0 0 16 16" refX="14" refY="8" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 16 8 L 0 16 Z" fill="#9CA3AF" /></marker>`;
}

// ─── Straight edge ──────────────────────────────────────────

export function getStraightPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  waypoints: Point[] = [],
): EdgePathResult {
  const points = [
    { x: sourceX, y: sourceY },
    ...waypoints,
    { x: targetX, y: targetY },
  ];

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }

  // Label at midpoint
  const mid = Math.floor(points.length / 2);
  const labelX = (points[mid - 1].x + points[mid].x) / 2;
  const labelY = (points[mid - 1].y + points[mid].y) / 2;

  return { path: d, labelX, labelY };
}

// ─── Bezier edge ────────────────────────────────────────────

export function getBezierPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceSide: PortSide,
  targetSide: PortSide,
  waypoints: Point[] = [],
): EdgePathResult {
  if (waypoints.length > 0) {
    // With waypoints, use straight lines through waypoints
    return getStraightPath(sourceX, sourceY, targetX, targetY, waypoints);
  }

  const curvature = 0.25;
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);
  const dist = Math.max(dx, dy, 50);
  const offset = dist * curvature;

  const sourceOffset = getDirectionOffset(sourceSide, offset);
  const targetOffset = getDirectionOffset(targetSide, offset);

  const cx1 = sourceX + sourceOffset.x;
  const cy1 = sourceY + sourceOffset.y;
  const cx2 = targetX + targetOffset.x;
  const cy2 = targetY + targetOffset.y;

  const path = `M ${sourceX} ${sourceY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetX} ${targetY}`;

  // Label at the midpoint of the bezier curve (t=0.5)
  const labelX = 0.125 * sourceX + 0.375 * cx1 + 0.375 * cx2 + 0.125 * targetX;
  const labelY = 0.125 * sourceY + 0.375 * cy1 + 0.375 * cy2 + 0.125 * targetY;

  return { path, labelX, labelY };
}

// ─── Smooth step (orthogonal with rounded corners) ──────────

export function getSmoothStepPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceSide: PortSide,
  targetSide: PortSide,
  waypoints: Point[] = [],
  borderRadius = 8,
  obstacles?: Array<{ x: number; y: number; width: number; height: number }>,
): EdgePathResult {
  if (waypoints.length > 0) {
    return getSmoothPolylinePath(
      [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }],
      borderRadius,
    );
  }

  // Try A* obstacle-avoiding routing if obstacles are provided
  if (obstacles && obstacles.length > 0) {
    const routedWaypoints = routeAroundObstacles(
      { x: sourceX, y: sourceY },
      sourceSide,
      { x: targetX, y: targetY },
      targetSide,
      obstacles,
    );

    if (routedWaypoints.length > 0) {
      return getSmoothPolylinePath(
        [{ x: sourceX, y: sourceY }, ...routedWaypoints, { x: targetX, y: targetY }],
        borderRadius,
      );
    }
  }

  // Fallback: simple orthogonal routing
  const points = computeOrthogonalPoints(
    sourceX, sourceY, sourceSide,
    targetX, targetY, targetSide,
  );

  return getSmoothPolylinePath(points, borderRadius);
}

/** Get obstacles for a specific edge (convenience wrapper) */
export { getObstaclesForEdge };

/** Compute orthogonal routing points between source and target */
export function computeOrthogonalPoints(
  sx: number, sy: number, sSide: PortSide,
  tx: number, ty: number, tSide: PortSide,
): Point[] {
  const offset = 20; // spacing from port before first turn

  const sDir = getDirectionOffset(sSide, offset);
  const tDir = getDirectionOffset(tSide, offset);

  const s1 = { x: sx + sDir.x, y: sy + sDir.y };
  const t1 = { x: tx + tDir.x, y: ty + tDir.y };

  const points: Point[] = [{ x: sx, y: sy }];

  // Determine routing based on source and target directions
  const sHorizontal = sSide === 'left' || sSide === 'right';
  const tHorizontal = tSide === 'left' || tSide === 'right';

  if (sHorizontal && tHorizontal) {
    // Both horizontal: route via a shared X midpoint
    const midX = (s1.x + t1.x) / 2;
    points.push(s1);
    points.push({ x: midX, y: s1.y });
    points.push({ x: midX, y: t1.y });
    points.push(t1);
  } else if (!sHorizontal && !tHorizontal) {
    // Both vertical: route via a shared Y midpoint
    const midY = (s1.y + t1.y) / 2;
    points.push(s1);
    points.push({ x: s1.x, y: midY });
    points.push({ x: t1.x, y: midY });
    points.push(t1);
  } else if (sHorizontal && !tHorizontal) {
    // Source horizontal, target vertical
    points.push(s1);
    points.push({ x: t1.x, y: s1.y });
    points.push(t1);
  } else {
    // Source vertical, target horizontal
    points.push(s1);
    points.push({ x: s1.x, y: t1.y });
    points.push(t1);
  }

  points.push({ x: tx, y: ty });

  // Remove collinear points
  return removeCollinearPoints(points);
}

/** Render a polyline with rounded corners as SVG path */
function getSmoothPolylinePath(points: Point[], radius: number): EdgePathResult {
  if (points.length < 2) {
    return { path: '', labelX: 0, labelY: 0 };
  }

  if (points.length === 2) {
    const [a, b] = points;
    return {
      path: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
      labelX: (a.x + b.x) / 2,
      labelY: (a.y + b.y) / 2,
    };
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Distance to neighbors
    const d1 = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    const d2 = Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2);

    // Limit radius to half the shorter segment
    const r = Math.min(radius, d1 / 2, d2 / 2);

    if (r <= 0.5) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    // Point before the corner (on the incoming segment)
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const beforeX = curr.x - (dx1 / d1) * r;
    const beforeY = curr.y - (dy1 / d1) * r;

    // Point after the corner (on the outgoing segment)
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const afterX = curr.x + (dx2 / d2) * r;
    const afterY = curr.y + (dy2 / d2) * r;

    d += ` L ${beforeX} ${beforeY}`;
    d += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  // Label at middle segment midpoint
  const midIdx = Math.floor(points.length / 2);
  const labelX = (points[midIdx - 1].x + points[midIdx].x) / 2;
  const labelY = (points[midIdx - 1].y + points[midIdx].y) / 2;

  return { path: d, labelX, labelY };
}

// ─── Helpers ────────────────────────────────────────────────

export function getDirectionOffset(side: PortSide, distance: number): Point {
  switch (side) {
    case 'top':    return { x: 0, y: -distance };
    case 'bottom': return { x: 0, y: distance };
    case 'left':   return { x: -distance, y: 0 };
    case 'right':  return { x: distance, y: 0 };
  }
}

function removeCollinearPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Skip if collinear (all on same horizontal or vertical line)
    const isHorizontal = prev.y === curr.y && curr.y === next.y;
    const isVertical = prev.x === curr.x && curr.x === next.x;

    if (!isHorizontal && !isVertical) {
      result.push(curr);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/** Get the closest side to connect from, given source center to target center direction */
export function getAutoPortSide(
  sourceNode: { x: number; y: number; width: number; height: number },
  targetNode: { x: number; y: number; width: number; height: number },
): { sourceSide: PortSide; targetSide: PortSide } {
  const scx = sourceNode.x + sourceNode.width / 2;
  const scy = sourceNode.y + sourceNode.height / 2;
  const tcx = targetNode.x + targetNode.width / 2;
  const tcy = targetNode.y + targetNode.height / 2;

  const dx = tcx - scx;
  const dy = tcy - scy;

  let sourceSide: PortSide;
  let targetSide: PortSide;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Primarily horizontal
    sourceSide = dx > 0 ? 'right' : 'left';
    targetSide = dx > 0 ? 'left' : 'right';
  } else {
    // Primarily vertical
    sourceSide = dy > 0 ? 'bottom' : 'top';
    targetSide = dy > 0 ? 'top' : 'bottom';
  }

  return { sourceSide, targetSide };
}
