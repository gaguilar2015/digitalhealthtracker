export type ItemStatus = 'not_started' | 'in_progress' | 'complete' | 'delayed';

export type PermissionLevel = 'admin' | 'member' | 'viewer';

export type WorkstreamColor =
  | 'blue' | 'indigo' | 'violet' | 'purple'
  | 'pink' | 'rose' | 'orange' | 'amber'
  | 'emerald' | 'teal' | 'cyan' | 'sky';

export type DependencyItemType = 'activity' | 'task' | 'deliverable';

export type AttachmentParentType = 'workstream' | 'activity' | 'deliverable';

export type ResourceType = 'link' | 'file';

export const ITEM_STATUSES: ItemStatus[] = ['not_started', 'in_progress', 'complete', 'delayed'];
export const PERMISSION_LEVELS: PermissionLevel[] = ['admin', 'member', 'viewer'];
export const WORKSTREAM_COLORS: WorkstreamColor[] = [
  'blue', 'indigo', 'violet', 'purple', 'pink', 'rose',
  'orange', 'amber', 'emerald', 'teal', 'cyan', 'sky',
];

export type SheetColumnType = 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox';
export const SHEET_COLUMN_TYPES: SheetColumnType[] = ['text', 'number', 'date', 'datetime', 'select', 'multiselect', 'checkbox'];

export type ChartType = 'bar' | 'horizontal_bar' | 'stacked_bar' | 'line' | 'area' | 'pie' | 'donut' | 'kpi';
export const CHART_TYPES: ChartType[] = ['bar', 'horizontal_bar', 'stacked_bar', 'line', 'area', 'pie', 'donut', 'kpi'];

export type AggFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';
export const AGG_FUNCTIONS: AggFunction[] = ['count', 'sum', 'avg', 'min', 'max'];

export type DateBucket = 'day' | 'week' | 'month' | 'quarter';
export const DATE_BUCKETS: DateBucket[] = ['day', 'week', 'month', 'quarter'];

export type SourceType = 'single_sheet' | 'sheet_group';
export const SOURCE_TYPES: SourceType[] = ['single_sheet', 'sheet_group'];

export type SortBy = 'category_asc' | 'value_desc' | 'value_asc';
export const SORT_BY_OPTIONS: SortBy[] = ['category_asc', 'value_desc', 'value_asc'];

export type DiagramNodeType = 'system' | 'database' | 'form' | 'group' | 'process' | 'decision' | 'document' | 'cloud' | 'person' | 'queue' | 'note' | 'terminal';
export const DIAGRAM_NODE_TYPES: DiagramNodeType[] = ['system', 'database', 'form', 'group', 'process', 'decision', 'document', 'cloud', 'person', 'queue', 'note', 'terminal'];

export type VisibilityMode = 'all' | 'my-team' | 'my-work';
