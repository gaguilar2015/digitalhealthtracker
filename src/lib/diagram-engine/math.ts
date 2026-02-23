/**
 * Custom Diagram Engine - Geometry & Coordinate Math
 */

import type { Point, Rect, ViewportState, CanvasNode, PortSide, PortPosition } from './types';

// ─── Coordinate transforms ──────────────────────────────────

/** Convert screen pixel coordinates to canvas coordinates */
export function screenToCanvas(screenX: number, screenY: number, viewport: ViewportState, containerRect: DOMRect): Point {
  return {
    x: (screenX - containerRect.left - viewport.x) / viewport.zoom,
    y: (screenY - containerRect.top - viewport.y) / viewport.zoom,
  };
}

/** Convert canvas coordinates to screen pixel coordinates */
export function canvasToScreen(canvasX: number, canvasY: number, viewport: ViewportState, containerRect: DOMRect): Point {
  return {
    x: canvasX * viewport.zoom + viewport.x + containerRect.left,
    y: canvasY * viewport.zoom + viewport.y + containerRect.top,
  };
}

/** Convert canvas coordinates to SVG viewport coordinates (relative to container) */
export function canvasToViewport(canvasX: number, canvasY: number, viewport: ViewportState): Point {
  return {
    x: canvasX * viewport.zoom + viewport.x,
    y: canvasY * viewport.zoom + viewport.y,
  };
}

// ─── Viewport operations ────────────────────────────────────

/** Zoom toward a point (screen coordinates), maintaining that point's position */
export function zoomAtPoint(
  viewport: ViewportState,
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  deltaZoom: number,
  minZoom = 0.1,
  maxZoom = 4,
): ViewportState {
  const newZoom = Math.max(minZoom, Math.min(maxZoom, viewport.zoom + deltaZoom));
  if (newZoom === viewport.zoom) return viewport;

  // The point in canvas space that should stay fixed
  const canvasX = (screenX - containerRect.left - viewport.x) / viewport.zoom;
  const canvasY = (screenY - containerRect.top - viewport.y) / viewport.zoom;

  return {
    x: screenX - containerRect.left - canvasX * newZoom,
    y: screenY - containerRect.top - canvasY * newZoom,
    zoom: newZoom,
  };
}

/** Calculate viewport to fit all nodes with padding */
export function fitView(
  nodes: CanvasNode[],
  containerWidth: number,
  containerHeight: number,
  padding = 0.2,
): ViewportState {
  if (nodes.length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  if (contentWidth === 0 || contentHeight === 0) {
    return {
      x: containerWidth / 2 - minX,
      y: containerHeight / 2 - minY,
      zoom: 1,
    };
  }

  const paddedWidth = contentWidth * (1 + padding * 2);
  const paddedHeight = contentHeight * (1 + padding * 2);

  const zoom = Math.min(
    containerWidth / paddedWidth,
    containerHeight / paddedHeight,
    2, // max zoom when fitting
  );

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    x: containerWidth / 2 - cx * zoom,
    y: containerHeight / 2 - cy * zoom,
    zoom,
  };
}

// ─── Port position calculation ──────────────────────────────

/** Get the canvas-space position of a port on a node */
export function getPortPosition(node: CanvasNode, side: PortSide, offset = 0.5): PortPosition {
  const { x, y, width, height } = node;

  switch (side) {
    case 'top':
      return { x: x + width * offset, y, side };
    case 'bottom':
      return { x: x + width * offset, y: y + height, side };
    case 'left':
      return { x, y: y + height * offset, side };
    case 'right':
      return { x: x + width, y: y + height * offset, side };
  }
}

/** Get the closest port on a node to a given point */
export function getClosestPort(node: CanvasNode, point: Point): { side: PortSide; position: PortPosition } {
  let closest: { side: PortSide; position: PortPosition; dist: number } | null = null;

  for (const port of node.ports) {
    const pos = getPortPosition(node, port.side);
    const dist = distance(pos, point);
    if (!closest || dist < closest.dist) {
      closest = { side: port.side, position: pos, dist };
    }
  }

  // Fallback to top port
  if (!closest) {
    const pos = getPortPosition(node, 'top');
    return { side: 'top', position: pos };
  }

  return { side: closest.side, position: closest.position };
}

// ─── Hit testing ────────────────────────────────────────────

/** Check if point is inside a rectangle */
export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Check if two rectangles overlap */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/** Check if point is inside a diamond (decision node) */
export function pointInDiamond(point: Point, cx: number, cy: number, hw: number, hh: number): boolean {
  // Diamond: |dx/hw| + |dy/hh| <= 1
  const dx = Math.abs(point.x - cx);
  const dy = Math.abs(point.y - cy);
  return (dx / hw) + (dy / hh) <= 1;
}

/** Check if point is inside an ellipse */
export function pointInEllipse(point: Point, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = point.x - cx;
  const dy = point.y - cy;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

/** Check if point is near a port position (within radius) */
export function pointNearPort(point: Point, portPos: PortPosition, radius = 8): boolean {
  return distance(point, portPos) <= radius;
}

/** Check if a point is near a line segment (for edge hit testing) */
export function pointNearSegment(point: Point, a: Point, b: Point, threshold = 6): boolean {
  const lenSq = distanceSq(a, b);
  if (lenSq === 0) return distance(point, a) <= threshold;

  let t = ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projection = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return distance(point, projection) <= threshold;
}

/** Hit-test a node based on its shape */
export function hitTestNode(point: Point, node: CanvasNode): boolean {
  const { x, y, width, height, type } = node;

  switch (type) {
    case 'decision': {
      const cx = x + width / 2;
      const cy = y + height / 2;
      return pointInDiamond(point, cx, cy, width / 2, height / 2);
    }
    case 'terminal': {
      // Pill shape: two semicircles + rectangle
      const r = Math.min(height / 2, width / 2);
      const cy = y + height / 2;
      // Check center rectangle
      if (point.x >= x + r && point.x <= x + width - r && point.y >= y && point.y <= y + height) {
        return true;
      }
      // Check left semicircle
      if (pointInEllipse(point, x + r, cy, r, height / 2)) return true;
      // Check right semicircle
      if (pointInEllipse(point, x + width - r, cy, r, height / 2)) return true;
      return false;
    }
    case 'cloud': {
      // Approximate cloud as an ellipse
      return pointInEllipse(point, x + width / 2, y + height / 2, width / 2 * 0.9, height / 2 * 0.85);
    }
    case 'person': {
      // Person is a complex shape - use bounding box for simplicity
      return pointInRect(point, { x, y, width, height });
    }
    default:
      // Rectangle-based shapes (system, process, database, form, document, queue, note, group)
      return pointInRect(point, { x, y, width, height });
  }
}

/** Find the node at a canvas point (topmost = last in array) */
export function findNodeAtPoint(nodes: CanvasNode[], point: Point): CanvasNode | null {
  // Iterate in reverse for z-order (last = top)
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (hitTestNode(point, nodes[i])) {
      return nodes[i];
    }
  }
  return null;
}

/** Find port at a canvas point */
export function findPortAtPoint(
  nodes: CanvasNode[],
  point: Point,
  radius = 10,
): { nodeId: string; side: PortSide; position: PortPosition } | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    for (const port of node.ports) {
      const pos = getPortPosition(node, port.side);
      if (distance(point, pos) <= radius) {
        return { nodeId: node.id, side: port.side, position: pos };
      }
    }
  }
  return null;
}

// ─── Resize handle positions ────────────────────────────────

import type { ResizeHandle } from './types';

export function getResizeHandlePositions(node: CanvasNode): Array<{ handle: ResizeHandle; x: number; y: number }> {
  const { x, y, width, height } = node;
  return [
    { handle: 'nw', x, y },
    { handle: 'ne', x: x + width, y },
    { handle: 'sw', x, y: y + height },
    { handle: 'se', x: x + width, y: y + height },
    { handle: 'n', x: x + width / 2, y },
    { handle: 's', x: x + width / 2, y: y + height },
    { handle: 'w', x, y: y + height / 2 },
    { handle: 'e', x: x + width, y: y + height / 2 },
  ];
}

export function findResizeHandleAtPoint(
  node: CanvasNode,
  point: Point,
  radius = 6,
): ResizeHandle | null {
  const handles = getResizeHandlePositions(node);
  for (const h of handles) {
    if (distance(point, { x: h.x, y: h.y }) <= radius) {
      return h.handle;
    }
  }
  return null;
}

/** Apply resize handle drag to node bounds */
export function applyResize(
  startBounds: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  minWidth: number,
  minHeight: number,
): Rect {
  let { x, y, width, height } = startBounds;

  switch (handle) {
    case 'nw':
      x += dx; y += dy; width -= dx; height -= dy;
      break;
    case 'ne':
      y += dy; width += dx; height -= dy;
      break;
    case 'sw':
      x += dx; width -= dx; height += dy;
      break;
    case 'se':
      width += dx; height += dy;
      break;
    case 'n':
      y += dy; height -= dy;
      break;
    case 's':
      height += dy;
      break;
    case 'w':
      x += dx; width -= dx;
      break;
    case 'e':
      width += dx;
      break;
  }

  // Enforce minimum size
  if (width < minWidth) {
    if (handle === 'nw' || handle === 'w' || handle === 'sw') {
      x = startBounds.x + startBounds.width - minWidth;
    }
    width = minWidth;
  }
  if (height < minHeight) {
    if (handle === 'nw' || handle === 'n' || handle === 'ne') {
      y = startBounds.y + startBounds.height - minHeight;
    }
    height = minHeight;
  }

  return { x, y, width, height };
}

// ─── Snap to grid ───────────────────────────────────────────

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPointToGrid(point: Point, gridSize: number): Point {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

// ─── Selection rectangle ────────────────────────────────────

/** Normalize a selection rect (handle negative width/height from drag direction) */
export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

// ─── Utilities ──────────────────────────────────────────────

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function distanceSq(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Get the midpoint of two points */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
