/**
 * Custom Diagram Engine - Public API
 */

export { DiagramCanvasV2 } from './DiagramCanvasV2';
export type { DiagramCanvasApi } from './DiagramCanvasV2';

// Types
export type {
  CanvasNode,
  CanvasEdge,
  CanvasEdgeType,
  ViewportState,
  Port,
  PortSide,
  PortPosition,
  InteractionState,
  ResizeHandle,
  Point,
  Rect,
} from './types';

// Conversion
export { flowDataToCanvas, canvasToFlowData } from './conversion';

// Math utilities
export {
  screenToCanvas,
  canvasToScreen,
  fitView,
  getPortPosition,
  hitTestNode,
  findNodeAtPoint,
} from './math';
