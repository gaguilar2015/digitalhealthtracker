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

export type TrackerColumnType = 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox';
export const TRACKER_COLUMN_TYPES: TrackerColumnType[] = ['text', 'number', 'date', 'datetime', 'select', 'multiselect', 'checkbox'];
