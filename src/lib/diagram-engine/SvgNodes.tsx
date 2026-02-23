/**
 * Custom Diagram Engine - SVG Node Renderers
 *
 * All 12 node types rendered as pure SVG <g> groups.
 * No foreignObject, no CSS positioning hacks, no !important overrides.
 */

import { memo } from 'react';
import type { CanvasNode } from './types';
import type { DiagramNodeData } from '@/types';

interface SvgNodeProps {
  node: CanvasNode;
}

// ─── Text helpers ───────────────────────────────────────────

/** Truncate text to fit within a width (approximate) */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + '\u2026';
}

/** Estimate max characters that fit in a given pixel width at a font size */
function maxCharsForWidth(width: number, fontSize: number, padding = 16): number {
  const avgCharWidth = fontSize * 0.55;
  return Math.max(3, Math.floor((width - padding) / avgCharWidth));
}

// ─── Shared label rendering ─────────────────────────────────

function NodeLabel({ data, cx, cy, maxWidth, fontSize: fontSizeProp = 12 }: {
  data: DiagramNodeData;
  cx: number;
  cy: number;
  maxWidth: number;
  fontSize?: number;
}) {
  const fontSize = data.fontSize ?? fontSizeProp;
  const maxChars = maxCharsForWidth(maxWidth, fontSize);
  const label = truncateText(data.label, maxChars);
  const hasDesc = !!data.description;
  const descMaxChars = maxCharsForWidth(maxWidth, fontSize - 2);
  const desc = data.description ? truncateText(data.description, descMaxChars) : '';

  const labelY = hasDesc ? cy - fontSize * 0.4 : cy;
  const descY = labelY + fontSize + 2;

  return (
    <>
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={500}
        fill="#111827"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
      {hasDesc && (
        <text
          x={cx}
          y={descY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize - 2}
          fill="#6B7280"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {desc}
        </text>
      )}
    </>
  );
}

// ─── SystemNode (Rectangle) ─────────────────────────────────

function SystemNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#EFF6FF';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#93C5FD');

  return (
    <>
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={8} ry={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      <NodeLabel data={d} cx={width / 2} cy={height / 2} maxWidth={width} />
    </>
  );
}

// ─── ProcessNode (Rounded Rectangle) ────────────────────────

function ProcessNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#F0F9FF';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#7DD3FC');

  return (
    <>
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={16} ry={16}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      <NodeLabel data={d} cx={width / 2} cy={height / 2} maxWidth={width} />
    </>
  );
}

// ─── DatabaseNode (Cylinder) ────────────────────────────────

function DatabaseNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#F0FDF4';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#86EFAC');

  const ellipseRy = Math.min(height * 0.2, 14);
  const bodyTop = ellipseRy;
  const bodyBottom = height - ellipseRy;

  return (
    <>
      {/* Cylinder body */}
      <path
        d={`M 0 ${bodyTop} L 0 ${bodyBottom} Q 0 ${height} ${width / 2} ${height} Q ${width} ${height} ${width} ${bodyBottom} L ${width} ${bodyTop}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      {/* Bottom ellipse */}
      <ellipse
        cx={width / 2} cy={bodyBottom}
        rx={width / 2} ry={ellipseRy}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      {/* Top ellipse */}
      <ellipse
        cx={width / 2} cy={bodyTop}
        rx={width / 2} ry={ellipseRy}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      <NodeLabel data={d} cx={width / 2} cy={height / 2 + ellipseRy * 0.3} maxWidth={width} fontSize={11} />
    </>
  );
}

// ─── FormNode (Parallelogram) ───────────────────────────────

function FormNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#FFF7ED';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#FDBA74');

  const skew = Math.min(width * 0.14, 20);
  const points = `${skew},0 ${width},0 ${width - skew},${height} 0,${height}`;

  return (
    <>
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      <NodeLabel data={d} cx={width / 2} cy={height / 2} maxWidth={width - skew * 2} fontSize={11} />
    </>
  );
}

// ─── DecisionNode (Diamond) ─────────────────────────────────

function DecisionNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#FFFBEB';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#FCD34D');

  const hw = width / 2;
  const hh = height / 2;
  const points = `${hw},2 ${width - 2},${hh} ${hw},${height - 2} 2,${hh}`;

  return (
    <>
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      <NodeLabel data={d} cx={hw} cy={hh} maxWidth={width * 0.6} fontSize={11} />
    </>
  );
}

// ─── DocumentNode (Wavy bottom) ─────────────────────────────

function DocumentNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#FFF1F2';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#FDA4AF');

  const waveHeight = Math.min(height * 0.15, 12);
  const waveY = height - waveHeight;

  const path = `M 0 0 L ${width} 0 L ${width} ${waveY} Q ${width * 0.75} ${waveY - waveHeight} ${width * 0.5} ${waveY + waveHeight * 0.5} Q ${width * 0.25} ${waveY + waveHeight * 2} 0 ${waveY} Z`;

  return (
    <>
      <path d={path} fill={fill} stroke={stroke} strokeWidth={2} />
      <NodeLabel data={d} cx={width / 2} cy={height / 2 - waveHeight * 0.3} maxWidth={width} fontSize={11} />
    </>
  );
}

// ─── CloudNode ──────────────────────────────────────────────

function CloudNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#EEF2FF';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#A5B4FC');

  // Scale the cloud path to fit the node dimensions
  const sx = width / 160;
  const sy = height / 90;

  const path = `M ${30 * sx} ${70 * sy} Q ${5 * sx} ${70 * sy} ${5 * sx} ${55 * sy} Q ${5 * sx} ${42 * sy} ${18 * sx} ${38 * sy} Q ${14 * sx} ${22 * sy} ${30 * sx} ${15 * sy} Q ${46 * sx} ${8 * sy} ${58 * sx} ${18 * sy} Q ${65 * sx} ${5 * sy} ${82 * sx} ${5 * sy} Q ${100 * sx} ${5 * sy} ${108 * sx} ${18 * sy} Q ${118 * sx} ${10 * sy} ${130 * sx} ${15 * sy} Q ${145 * sx} ${22 * sy} ${142 * sx} ${38 * sy} Q ${155 * sx} ${42 * sy} ${155 * sx} ${55 * sy} Q ${155 * sx} ${70 * sy} ${130 * sx} ${70 * sy} Z`;

  return (
    <>
      <path d={path} fill={fill} stroke={stroke} strokeWidth={2} />
      <NodeLabel data={d} cx={width / 2} cy={height / 2 + 2} maxWidth={width * 0.7} fontSize={11} />
    </>
  );
}

// ─── PersonNode (Figure) ────────────────────────────────────

function PersonNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#F5F3FF';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#C4B5FD');

  const cx = width / 2;
  // Person figure takes about 60% of height, label below
  const figHeight = height * 0.65;
  const headR = figHeight * 0.22;
  const headCy = headR + 2;
  const bodyTop = headCy + headR + 4;
  const bodyBottom = figHeight;
  const bodyHalfW = Math.min(width * 0.4, figHeight * 0.35);

  const labelY = figHeight + (height - figHeight) / 2;

  return (
    <>
      {/* Head */}
      <circle cx={cx} cy={headCy} r={headR} fill={fill} stroke={stroke} strokeWidth={2} />
      {/* Body */}
      <path
        d={`M ${cx - bodyHalfW} ${bodyBottom} Q ${cx - bodyHalfW} ${bodyTop} ${cx} ${bodyTop - 2} Q ${cx + bodyHalfW} ${bodyTop} ${cx + bodyHalfW} ${bodyBottom} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      <NodeLabel data={d} cx={cx} cy={labelY} maxWidth={width} fontSize={11} />
    </>
  );
}

// ─── QueueNode (Horizontal Cylinder) ────────────────────────

function QueueNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#ECFDF5';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#6EE7B7');

  const ellipseRx = Math.min(width * 0.08, 12);
  const bodyLeft = ellipseRx;
  const bodyRight = width - ellipseRx;
  const hy = height / 2;

  return (
    <>
      {/* Horizontal cylinder body */}
      <path
        d={`M ${bodyLeft} 0 L ${bodyRight} 0 Q ${width} 0 ${width} ${hy} Q ${width} ${height} ${bodyRight} ${height} L ${bodyLeft} ${height} Q 0 ${height} 0 ${hy} Q 0 0 ${bodyLeft} 0`}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      {/* Left ellipse divider */}
      <ellipse
        cx={bodyLeft} cy={hy}
        rx={ellipseRx * 0.7} ry={hy * 0.9}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        opacity={0.5}
      />
      <NodeLabel data={d} cx={width / 2} cy={hy} maxWidth={width - ellipseRx * 4} fontSize={11} />
    </>
  );
}

// ─── NoteNode (Folded corner) ───────────────────────────────

function NoteNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#FEFCE8';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#FDE047');

  const foldSize = Math.min(width * 0.14, height * 0.28, 20);

  return (
    <>
      <path
        d={`M 0 0 L ${width - foldSize} 0 L ${width} ${foldSize} L ${width} ${height} L 0 ${height} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      {/* Fold triangle */}
      <path
        d={`M ${width - foldSize} 0 L ${width - foldSize} ${foldSize} L ${width} ${foldSize}`}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
      />
      <NodeLabel data={d} cx={width / 2} cy={height / 2 + foldSize * 0.15} maxWidth={width} fontSize={11} />
    </>
  );
}

// ─── TerminalNode (Pill/Oval) ───────────────────────────────

function TerminalNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const fill = d.color ?? '#F1F5F9';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#94A3B8');

  const rx = Math.min(height / 2, width / 2);

  return (
    <>
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={rx} ry={rx}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
      <NodeLabel data={d} cx={width / 2} cy={height / 2} maxWidth={width - rx} fontSize={11} />
    </>
  );
}

// ─── GroupNode (Dashed container) ───────────────────────────

function GroupNodeSvg({ node }: SvgNodeProps) {
  const { width, height, data, selected } = node;
  const d = data;
  const bgColor = d.color ? `${d.color}15` : 'rgba(0,0,0,0)';
  const stroke = selected ? '#3B82F6' : (d.borderColor ?? '#D1D5DB');

  return (
    <>
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={12} ry={12}
        fill={bgColor}
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray="8 4"
      />
      {/* Label at top-left */}
      <text
        x={12}
        y={20}
        fontSize={d.fontSize ?? 11}
        fontWeight={600}
        fill="#4B5563"
        letterSpacing={0.5}
        style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase' }}
      >
        {d.label}
      </text>
      {d.description && (
        <text
          x={12}
          y={20 + (d.fontSize ?? 11) + 3}
          fontSize={(d.fontSize ?? 11) - 1}
          fill="#9CA3AF"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {d.description}
        </text>
      )}
    </>
  );
}

// ─── Node type registry ─────────────────────────────────────

const SVG_NODE_COMPONENTS: Record<string, React.FC<SvgNodeProps>> = {
  system: SystemNodeSvg,
  process: ProcessNodeSvg,
  database: DatabaseNodeSvg,
  form: FormNodeSvg,
  decision: DecisionNodeSvg,
  document: DocumentNodeSvg,
  cloud: CloudNodeSvg,
  person: PersonNodeSvg,
  queue: QueueNodeSvg,
  note: NoteNodeSvg,
  terminal: TerminalNodeSvg,
  group: GroupNodeSvg,
};

// ─── Notes badge (shown when node has details or detailFields) ──

function NotesBadge({ width, data }: { width: number; data: DiagramNodeData }) {
  const hasNotes = !!data.details || (data.detailFields && data.detailFields.length > 0);
  if (!hasNotes) return null;

  const cx = width - 4;
  const cy = -4;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={cx} cy={cy} r={7} fill="#F59E0B" stroke="white" strokeWidth={1.5} />
      <line x1={cx} y1={cy - 1} x2={cx} y2={cy + 3} stroke="white" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy - 3.5} r={0.75} fill="white" />
    </g>
  );
}

// ─── Exported renderer ──────────────────────────────────────

function SvgNodeRendererComponent({ node }: SvgNodeProps) {
  const Component = SVG_NODE_COMPONENTS[node.type] ?? SystemNodeSvg;
  return (
    <>
      <Component node={node} />
      <NotesBadge width={node.width} data={node.data} />
    </>
  );
}

export const SvgNodeRenderer = memo(SvgNodeRendererComponent);
