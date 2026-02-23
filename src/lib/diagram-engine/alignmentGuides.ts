/**
 * Custom Diagram Engine - Smart Alignment Guides
 *
 * Detects alignment between dragged nodes and other nodes on the canvas.
 * Returns guide lines to render and optional snap adjustments.
 */

import type { CanvasNode, AlignmentGuide } from './types';

const SNAP_THRESHOLD = 5; // pixels in canvas space

interface AlignmentResult {
  guides: AlignmentGuide[];
  snapDx: number;
  snapDy: number;
}

/**
 * Compute alignment guides for dragging nodes.
 * Compares the bounding box of the dragged nodes against all other nodes.
 */
export function computeAlignmentGuides(
  draggedNodeIds: string[],
  allNodes: CanvasNode[],
  snapThreshold = SNAP_THRESHOLD,
): AlignmentResult {
  const draggedSet = new Set(draggedNodeIds);

  // Compute bounding box of all dragged nodes
  let dMinX = Infinity, dMinY = Infinity, dMaxX = -Infinity, dMaxY = -Infinity;
  for (const node of allNodes) {
    if (!draggedSet.has(node.id)) continue;
    dMinX = Math.min(dMinX, node.x);
    dMinY = Math.min(dMinY, node.y);
    dMaxX = Math.max(dMaxX, node.x + node.width);
    dMaxY = Math.max(dMaxY, node.y + node.height);
  }

  if (dMinX === Infinity) return { guides: [], snapDx: 0, snapDy: 0 };

  const dCenterX = (dMinX + dMaxX) / 2;
  const dCenterY = (dMinY + dMaxY) / 2;

  // Reference edges of the dragged group
  const dragEdges = {
    left: dMinX,
    right: dMaxX,
    top: dMinY,
    bottom: dMaxY,
    centerX: dCenterX,
    centerY: dCenterY,
  };

  const guides: AlignmentGuide[] = [];
  let bestSnapDx = Infinity;
  let bestSnapDy = Infinity;

  // Check each non-dragged node
  for (const node of allNodes) {
    if (draggedSet.has(node.id)) continue;

    const nLeft = node.x;
    const nRight = node.x + node.width;
    const nTop = node.y;
    const nBottom = node.y + node.height;
    const nCenterX = node.x + node.width / 2;
    const nCenterY = node.y + node.height / 2;

    // Vertical alignment checks (X-axis matching → vertical guide line)
    const vChecks: Array<{ dragVal: number; refVal: number }> = [
      { dragVal: dragEdges.left, refVal: nLeft },
      { dragVal: dragEdges.left, refVal: nRight },
      { dragVal: dragEdges.right, refVal: nLeft },
      { dragVal: dragEdges.right, refVal: nRight },
      { dragVal: dragEdges.centerX, refVal: nCenterX },
      { dragVal: dragEdges.left, refVal: nCenterX },
      { dragVal: dragEdges.right, refVal: nCenterX },
      { dragVal: dragEdges.centerX, refVal: nLeft },
      { dragVal: dragEdges.centerX, refVal: nRight },
    ];

    for (const { dragVal, refVal } of vChecks) {
      const diff = refVal - dragVal;
      if (Math.abs(diff) <= snapThreshold) {
        // Vertical guide line at refVal X
        const from = Math.min(dMinY, nTop) - 10;
        const to = Math.max(dMaxY, nBottom) + 10;
        guides.push({ type: 'vertical', position: refVal, from, to });
        if (Math.abs(diff) < Math.abs(bestSnapDx)) {
          bestSnapDx = diff;
        }
      }
    }

    // Horizontal alignment checks (Y-axis matching → horizontal guide line)
    const hChecks: Array<{ dragVal: number; refVal: number }> = [
      { dragVal: dragEdges.top, refVal: nTop },
      { dragVal: dragEdges.top, refVal: nBottom },
      { dragVal: dragEdges.bottom, refVal: nTop },
      { dragVal: dragEdges.bottom, refVal: nBottom },
      { dragVal: dragEdges.centerY, refVal: nCenterY },
      { dragVal: dragEdges.top, refVal: nCenterY },
      { dragVal: dragEdges.bottom, refVal: nCenterY },
      { dragVal: dragEdges.centerY, refVal: nTop },
      { dragVal: dragEdges.centerY, refVal: nBottom },
    ];

    for (const { dragVal, refVal } of hChecks) {
      const diff = refVal - dragVal;
      if (Math.abs(diff) <= snapThreshold) {
        const from = Math.min(dMinX, nLeft) - 10;
        const to = Math.max(dMaxX, nRight) + 10;
        guides.push({ type: 'horizontal', position: refVal, from, to });
        if (Math.abs(diff) < Math.abs(bestSnapDy)) {
          bestSnapDy = diff;
        }
      }
    }
  }

  // Deduplicate guides by position (keep unique lines)
  const uniqueGuides = deduplicateGuides(guides);

  return {
    guides: uniqueGuides,
    snapDx: Math.abs(bestSnapDx) <= snapThreshold ? bestSnapDx : 0,
    snapDy: Math.abs(bestSnapDy) <= snapThreshold ? bestSnapDy : 0,
  };
}

function deduplicateGuides(guides: AlignmentGuide[]): AlignmentGuide[] {
  const seen = new Map<string, AlignmentGuide>();

  for (const g of guides) {
    // Round position to avoid floating point duplicates
    const key = `${g.type}:${Math.round(g.position * 10) / 10}`;
    const existing = seen.get(key);
    if (existing) {
      // Extend the guide line extent
      existing.from = Math.min(existing.from, g.from);
      existing.to = Math.max(existing.to, g.to);
    } else {
      seen.set(key, { ...g });
    }
  }

  return Array.from(seen.values());
}
