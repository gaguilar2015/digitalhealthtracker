/**
 * Custom Diagram Engine - MiniMap Component
 *
 * Small overview panel showing simplified node shapes.
 * Click/drag to navigate. Shows viewport rectangle.
 */

import { memo, useCallback, useRef } from 'react';
import type { CanvasNode, ViewportState } from './types';

interface MiniMapV2Props {
  nodes: CanvasNode[];
  viewport: ViewportState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onViewportChange: (viewport: ViewportState) => void;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PADDING = 20;

function MiniMapV2Component({ nodes, viewport, containerRef, onViewportChange }: MiniMapV2Props) {
  const minimapRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  // Compute the bounding box of all nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  if (nodes.length === 0) {
    minX = 0; minY = 0; maxX = 100; maxY = 100;
  }

  // Add padding
  minX -= MINIMAP_PADDING;
  minY -= MINIMAP_PADDING;
  maxX += MINIMAP_PADDING;
  maxY += MINIMAP_PADDING;

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  // Scale to fit minimap
  const scale = Math.min(MINIMAP_WIDTH / contentWidth, MINIMAP_HEIGHT / contentHeight);

  // Viewport rectangle in content coordinates
  const container = containerRef.current;
  const containerWidth = container?.clientWidth ?? 800;
  const containerHeight = container?.clientHeight ?? 600;

  // The visible canvas area in canvas coordinates
  const visibleLeft = -viewport.x / viewport.zoom;
  const visibleTop = -viewport.y / viewport.zoom;
  const visibleWidth = containerWidth / viewport.zoom;
  const visibleHeight = containerHeight / viewport.zoom;

  // Transform to minimap coordinates
  const vpRectX = (visibleLeft - minX) * scale;
  const vpRectY = (visibleTop - minY) * scale;
  const vpRectW = visibleWidth * scale;
  const vpRectH = visibleHeight * scale;

  // Navigate on click/drag
  const navigateTo = useCallback(
    (clientX: number, clientY: number) => {
      const svg = minimapRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      // Position in minimap space
      const mmX = clientX - rect.left;
      const mmY = clientY - rect.top;

      // Convert to canvas coordinates
      const canvasX = mmX / scale + minX;
      const canvasY = mmY / scale + minY;

      // Center viewport on this point
      const newVp: ViewportState = {
        x: -(canvasX - containerWidth / viewport.zoom / 2) * viewport.zoom,
        y: -(canvasY - containerHeight / viewport.zoom / 2) * viewport.zoom,
        zoom: viewport.zoom,
      };

      onViewportChange(newVp);
    },
    [scale, minX, minY, containerWidth, containerHeight, viewport.zoom, onViewportChange],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isDragging.current = true;
      navigateTo(e.clientX, e.clientY);
    },
    [navigateTo],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      navigateTo(e.clientX, e.clientY);
    },
    [navigateTo],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Node fill colors by type
  const getNodeColor = (node: CanvasNode): string => {
    if (node.data.color) return node.data.color;
    const defaults: Record<string, string> = {
      system: '#BFDBFE',
      process: '#BAE6FD',
      database: '#BBF7D0',
      form: '#FED7AA',
      decision: '#FDE68A',
      document: '#FECDD3',
      cloud: '#C7D2FE',
      person: '#DDD6FE',
      queue: '#A7F3D0',
      note: '#FEF08A',
      terminal: '#CBD5E1',
      group: '#E5E7EB',
    };
    return defaults[node.type] ?? '#BFDBFE';
  };

  return (
    <div data-diagram-minimap className="absolute bottom-3 right-3 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <svg
        ref={minimapRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <rect x={0} y={0} width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} fill="#FAFAFA" />

        {/* Nodes */}
        {nodes.map(node => (
          <rect
            key={node.id}
            x={(node.x - minX) * scale}
            y={(node.y - minY) * scale}
            width={Math.max(node.width * scale, 2)}
            height={Math.max(node.height * scale, 2)}
            fill={getNodeColor(node)}
            stroke="#9CA3AF"
            strokeWidth={0.5}
            rx={1}
          />
        ))}

        {/* Viewport rectangle */}
        <rect
          x={vpRectX}
          y={vpRectY}
          width={vpRectW}
          height={vpRectH}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3B82F6"
          strokeWidth={1.5}
          rx={1}
        />
      </svg>
    </div>
  );
}

export const MiniMapV2 = memo(MiniMapV2Component);
