/**
 * Custom Diagram Engine - Undo/Redo Hook
 *
 * Adapted from the existing useUndoRedo hook but works with
 * the engine's own types instead of React Flow types.
 */

import { useCallback, useRef } from 'react';
import type { CanvasNode, CanvasEdge } from './types';

interface HistoryEntry {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const MAX_HISTORY = 50;

export function useUndoRedoV2() {
  const past = useRef<HistoryEntry[]>([]);
  const future = useRef<HistoryEntry[]>([]);

  const takeSnapshot = useCallback((nodes: CanvasNode[], edges: CanvasEdge[]) => {
    past.current = [
      ...past.current.slice(-(MAX_HISTORY - 1)),
      { nodes: structuredClone(nodes), edges: structuredClone(edges) },
    ];
    future.current = [];
  }, []);

  const undo = useCallback(
    (
      currentNodes: CanvasNode[],
      currentEdges: CanvasEdge[],
    ): HistoryEntry | null => {
      const prev = past.current.pop();
      if (!prev) return null;
      future.current.push({
        nodes: structuredClone(currentNodes),
        edges: structuredClone(currentEdges),
      });
      return prev;
    },
    [],
  );

  const redo = useCallback(
    (
      currentNodes: CanvasNode[],
      currentEdges: CanvasEdge[],
    ): HistoryEntry | null => {
      const next = future.current.pop();
      if (!next) return null;
      past.current.push({
        nodes: structuredClone(currentNodes),
        edges: structuredClone(currentEdges),
      });
      return next;
    },
    [],
  );

  const canUndo = useCallback(() => past.current.length > 0, []);
  const canRedo = useCallback(() => future.current.length > 0, []);

  return { takeSnapshot, undo, redo, canUndo, canRedo };
}
