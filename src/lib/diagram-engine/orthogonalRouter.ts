/**
 * Custom Diagram Engine - Orthogonal Edge Router with Obstacle Avoidance
 *
 * Uses A*-based pathfinding to route edges around node bounding boxes.
 * Produces Manhattan-style (horizontal/vertical only) paths.
 */

import type { Point, PortSide, CanvasNode, CanvasEdge } from './types';

const PADDING = 20;       // Minimum clearance from node edges
const GRID_CELL = 10;     // Resolution of the routing grid
const MAX_ITERATIONS = 2000; // Safety cap on A* iterations

interface GridPoint {
  gx: number;  // grid X index
  gy: number;  // grid Y index
}

interface AStarNode {
  gx: number;
  gy: number;
  g: number;   // cost from start
  h: number;   // heuristic to end
  f: number;   // g + h
  parent: AStarNode | null;
  // Penalize direction changes
  dirX: number;
  dirY: number;
}

/**
 * Route an edge around obstacles using A* pathfinding.
 * Returns an array of waypoints (in canvas coordinates) that the edge should pass through.
 * If routing fails, returns an empty array (fall back to simple routing).
 */
export function routeAroundObstacles(
  sourcePos: Point,
  sourceSide: PortSide,
  targetPos: Point,
  targetSide: PortSide,
  obstacles: Array<{ x: number; y: number; width: number; height: number }>,
): Point[] {
  // Extend source/target out from the port by PADDING
  const sourceExt = extendFromPort(sourcePos, sourceSide, PADDING);
  const targetExt = extendFromPort(targetPos, targetSide, PADDING);

  // Compute the bounding box for the routing grid
  const allPoints = [sourcePos, sourceExt, targetPos, targetExt];
  for (const obs of obstacles) {
    allPoints.push({ x: obs.x - PADDING, y: obs.y - PADDING });
    allPoints.push({ x: obs.x + obs.width + PADDING, y: obs.y + obs.height + PADDING });
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of allPoints) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  // Add extra margin
  minX -= PADDING * 2;
  minY -= PADDING * 2;
  maxX += PADDING * 2;
  maxY += PADDING * 2;

  const gridWidth = Math.ceil((maxX - minX) / GRID_CELL);
  const gridHeight = Math.ceil((maxY - minY) / GRID_CELL);

  // Safety: if grid is too large, fall back
  if (gridWidth * gridHeight > 50000) {
    return [];
  }

  // Build obstacle grid (true = blocked)
  const blocked = new Uint8Array(gridWidth * gridHeight);
  for (const obs of obstacles) {
    const gx1 = Math.max(0, Math.floor((obs.x - PADDING - minX) / GRID_CELL));
    const gy1 = Math.max(0, Math.floor((obs.y - PADDING - minY) / GRID_CELL));
    const gx2 = Math.min(gridWidth - 1, Math.ceil((obs.x + obs.width + PADDING - minX) / GRID_CELL));
    const gy2 = Math.min(gridHeight - 1, Math.ceil((obs.y + obs.height + PADDING - minY) / GRID_CELL));

    for (let gy = gy1; gy <= gy2; gy++) {
      for (let gx = gx1; gx <= gx2; gx++) {
        blocked[gy * gridWidth + gx] = 1;
      }
    }
  }

  // Convert source/target extension points to grid coordinates
  const startG = toGrid(sourceExt, minX, minY);
  const endG = toGrid(targetExt, minX, minY);

  // Clamp to grid bounds
  startG.gx = clamp(startG.gx, 0, gridWidth - 1);
  startG.gy = clamp(startG.gy, 0, gridHeight - 1);
  endG.gx = clamp(endG.gx, 0, gridWidth - 1);
  endG.gy = clamp(endG.gy, 0, gridHeight - 1);

  // Ensure start and end are not blocked
  blocked[startG.gy * gridWidth + startG.gx] = 0;
  blocked[endG.gy * gridWidth + endG.gx] = 0;

  // Run A* with orthogonal movement only
  const path = astar(startG, endG, blocked, gridWidth, gridHeight, sourceSide, targetSide);

  if (!path) return [];

  // Convert grid path back to canvas coordinates
  const canvasPath = path.map(gp => fromGrid(gp, minX, minY));

  // Simplify: remove collinear points (keep only corners)
  const simplified = simplifyOrthogonal(canvasPath);

  // Build final waypoints: sourcePos → sourceExt → ...simplified... → targetExt → targetPos
  // But we skip sourceExt/targetExt if they're collinear with the first/last simplified point
  const result: Point[] = [];

  // Add the simplified A* path points (these are the corners)
  for (const p of simplified) {
    result.push(p);
  }

  return result;
}

/** Convert canvas coordinate to grid coordinate */
function toGrid(p: Point, minX: number, minY: number): GridPoint {
  return {
    gx: Math.round((p.x - minX) / GRID_CELL),
    gy: Math.round((p.y - minY) / GRID_CELL),
  };
}

/** Convert grid coordinate back to canvas coordinate */
function fromGrid(gp: GridPoint, minX: number, minY: number): Point {
  return {
    x: gp.gx * GRID_CELL + minX,
    y: gp.gy * GRID_CELL + minY,
  };
}

/** Extend a point outward from a port */
function extendFromPort(pos: Point, side: PortSide, dist: number): Point {
  switch (side) {
    case 'top':    return { x: pos.x, y: pos.y - dist };
    case 'bottom': return { x: pos.x, y: pos.y + dist };
    case 'left':   return { x: pos.x - dist, y: pos.y };
    case 'right':  return { x: pos.x + dist, y: pos.y };
  }
}

/** A* pathfinding with orthogonal movement and direction change penalty */
function astar(
  start: GridPoint,
  end: GridPoint,
  blocked: Uint8Array,
  gridWidth: number,
  gridHeight: number,
  sourceSide: PortSide,
  _targetSide: PortSide,
): GridPoint[] | null {
  const key = (gx: number, gy: number) => gy * gridWidth + gx;

  // Manhattan distance heuristic
  const heuristic = (gx: number, gy: number) =>
    Math.abs(gx - end.gx) + Math.abs(gy - end.gy);

  // Direction from port side
  const initialDir = sideToDir(sourceSide);

  const startNode: AStarNode = {
    gx: start.gx,
    gy: start.gy,
    g: 0,
    h: heuristic(start.gx, start.gy),
    f: heuristic(start.gx, start.gy),
    parent: null,
    dirX: initialDir.dx,
    dirY: initialDir.dy,
  };

  // Open set as a simple sorted array (sufficient for our grid sizes)
  const open: AStarNode[] = [startNode];
  const closed = new Set<number>();
  const bestG = new Map<number, number>();
  bestG.set(key(start.gx, start.gy), 0);

  // 4-directional neighbors
  const dirs = [
    { dx: 0, dy: -1 },  // up
    { dx: 0, dy: 1 },   // down
    { dx: -1, dy: 0 },  // left
    { dx: 1, dy: 0 },   // right
  ];

  let iterations = 0;

  while (open.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    // Find the node with lowest f score
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open[bestIdx];
    open.splice(bestIdx, 1);

    // Reached goal?
    if (current.gx === end.gx && current.gy === end.gy) {
      return reconstructPath(current);
    }

    const ck = key(current.gx, current.gy);
    if (closed.has(ck)) continue;
    closed.add(ck);

    for (const dir of dirs) {
      const nx = current.gx + dir.dx;
      const ny = current.gy + dir.dy;

      if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      if (blocked[nk]) continue;

      // Cost: base 1 per step + penalty for direction change
      const dirChanged = (dir.dx !== current.dirX || dir.dy !== current.dirY);
      const turnPenalty = dirChanged ? 3 : 0; // penalize turns to prefer straighter paths
      const g = current.g + 1 + turnPenalty;

      const prevBest = bestG.get(nk);
      if (prevBest !== undefined && g >= prevBest) continue;
      bestG.set(nk, g);

      const h = heuristic(nx, ny);
      open.push({
        gx: nx,
        gy: ny,
        g,
        h,
        f: g + h,
        parent: current,
        dirX: dir.dx,
        dirY: dir.dy,
      });
    }
  }

  // No path found
  return null;
}

function reconstructPath(node: AStarNode): GridPoint[] {
  const path: GridPoint[] = [];
  let current: AStarNode | null = node;
  while (current) {
    path.unshift({ gx: current.gx, gy: current.gy });
    current = current.parent;
  }
  return path;
}

function sideToDir(side: PortSide): { dx: number; dy: number } {
  switch (side) {
    case 'top':    return { dx: 0, dy: -1 };
    case 'bottom': return { dx: 0, dy: 1 };
    case 'left':   return { dx: -1, dy: 0 };
    case 'right':  return { dx: 1, dy: 0 };
  }
}

/** Remove collinear points from an orthogonal path (keep only corners) */
function simplifyOrthogonal(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;

    if (!sameX && !sameY) {
      result.push(curr);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get obstacle rectangles for edge routing.
 * Excludes the source and target nodes of the edge being routed.
 */
export function getObstaclesForEdge(
  nodes: CanvasNode[],
  edge: CanvasEdge,
): Array<{ x: number; y: number; width: number; height: number }> {
  return nodes
    .filter(n => n.id !== edge.source && n.id !== edge.target && n.type !== 'group')
    .map(n => ({ x: n.x, y: n.y, width: n.width, height: n.height }));
}
