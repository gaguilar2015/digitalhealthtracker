import type {
  ItemStatus,
  PermissionLevel,
  WorkstreamColor,
  DependencyItemType,
  AttachmentParentType,
  ResourceType,
  TrackerColumnType,
} from './enums';
import type { CellStyle, SelectOptionStyle, ConditionalFormatRule, TrackerRowGroup } from './formatting';

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  title: string | null;
  location: string | null;
  phone: string | null;
  bio: string | null;
  permission_level: PermissionLevel;
  is_active: boolean;
  avatar_url: string | null;
  last_login_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateTeamMember = Omit<TeamMember, 'id' | 'created_at' | 'updated_at' | 'last_login_at'>;
export type UpdateTeamMember = Partial<Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>>;

export interface Workstream {
  id: string;
  code: string;
  name: string;
  short_name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color: WorkstreamColor;
  owner_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateWorkstream = Omit<Workstream, 'id' | 'created_at' | 'updated_at'>;
export type UpdateWorkstream = Partial<Omit<Workstream, 'id' | 'created_at' | 'updated_at'>>;

export interface ActivityGroup {
  id: string;
  code: string;
  name: string;
  workstream_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateActivityGroup = Omit<ActivityGroup, 'id' | 'created_at' | 'updated_at'>;
export type UpdateActivityGroup = Partial<Omit<ActivityGroup, 'id' | 'created_at' | 'updated_at'>>;

export interface Activity {
  id: string;
  code: string;
  name: string;
  output: string | null;
  workstream_id: string;
  activity_group_id: string | null;
  start_date: string;
  end_date: string;
  status: ItemStatus;
  assigned_to: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateActivity = Omit<Activity, 'id' | 'created_at' | 'updated_at'>;
export type UpdateActivity = Partial<Omit<Activity, 'id' | 'created_at' | 'updated_at'>>;

export interface Task {
  id: string;
  code: string | null;
  name: string;
  activity_id: string;
  start_date: string | null;
  end_date: string | null;
  status: ItemStatus;
  assigned_to: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTask = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;

export interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  workstream_id: string;
  due_date: string;
  status: ItemStatus;
  completion_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateDeliverable = Omit<Deliverable, 'id' | 'created_at' | 'updated_at' | 'completion_date'>;
export type UpdateDeliverable = Partial<Omit<Deliverable, 'id' | 'created_at' | 'updated_at'>>;

export interface Dependency {
  id: string;
  predecessor_type: DependencyItemType;
  predecessor_id: string;
  successor_type: DependencyItemType;
  successor_id: string;
  dependency_type: string;
  created_at: string;
}

export type CreateDependency = Omit<Dependency, 'id' | 'created_at'>;

export interface Attachment {
  id: string;
  parent_type: AttachmentParentType;
  parent_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export type CreateAttachment = Omit<Attachment, 'id' | 'created_at'>;

export interface Resource {
  id: string;
  label: string;
  description: string | null;
  type: ResourceType;
  url: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateResource = Omit<Resource, 'id' | 'created_at' | 'updated_at'>;
export type UpdateResource = Partial<Omit<Resource, 'id' | 'created_at' | 'updated_at'>>;

export interface TrackerGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateTrackerGroup = Omit<TrackerGroup, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTrackerGroup = Partial<Omit<TrackerGroup, 'id' | 'created_at' | 'updated_at'>>;

export interface TrackerColumn {
  id: string;
  name: string;
  type: TrackerColumnType;
  options?: string[];
  width?: number; // pixels, minimum 60
  defaultStyle?: CellStyle;
  optionStyles?: Record<string, SelectOptionStyle>;
  conditionalRules?: ConditionalFormatRule[];
}

export interface Tracker {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  columns: TrackerColumn[];
  row_groups?: TrackerRowGroup[] | null;
  group_by_column?: string | null;
  auto_group_order?: string[] | null;
  group_id: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateTracker = Omit<Tracker, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTracker = Partial<Omit<Tracker, 'id' | 'created_at' | 'updated_at'>>;

export interface TrackerMember {
  id: string;
  tracker_id: string;
  team_member_id: string;
  created_at: string;
}

export type CreateTrackerMember = Pick<TrackerMember, 'tracker_id' | 'team_member_id'>;

export interface TrackerGroupMember {
  id: string;
  tracker_group_id: string;
  team_member_id: string;
  created_at: string;
}

export type CreateTrackerGroupMember = Pick<TrackerGroupMember, 'tracker_group_id' | 'team_member_id'>;

export interface TrackerRow {
  id: string;
  tracker_id: string;
  cells: Record<string, unknown>;
  cell_formats?: Record<string, CellStyle> | null;
  group_id?: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateTrackerRow = Omit<TrackerRow, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTrackerRow = Partial<Omit<TrackerRow, 'id' | 'created_at' | 'updated_at'>>;

export interface WorkstreamMember {
  id: string;
  workstream_id: string;
  team_member_id: string;
  created_at: string;
}

export type CreateWorkstreamMember = Pick<WorkstreamMember, 'workstream_id' | 'team_member_id'>;

export interface TrackerRowComment {
  id: string;
  tracker_id: string;
  tracker_row_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export type CreateTrackerRowComment = Pick<TrackerRowComment, 'tracker_id' | 'tracker_row_id' | 'content' | 'created_by'>;
