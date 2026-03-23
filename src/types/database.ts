import type {
  ItemStatus,
  PermissionLevel,
  WorkstreamColor,
  DependencyItemType,
  AttachmentParentType,
  ResourceType,
  SheetColumnType,
  ChartType,
  AggFunction,
  DateBucket,
  SourceType,
  SortBy,
  DiagramNodeType,
} from './enums';
import type { CellStyle, SelectOptionStyle, ConditionalFormatRule, SheetRowGroup } from './formatting';

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
  supervisor_id: string | null;
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
  activity_id: string | null;
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

export interface SheetGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateSheetGroup = Omit<SheetGroup, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSheetGroup = Partial<Omit<SheetGroup, 'id' | 'created_at' | 'updated_at'>>;

export interface SheetColumn {
  id: string;
  name: string;
  type: SheetColumnType;
  options?: string[];
  width?: number; // pixels, minimum 60
  defaultStyle?: CellStyle;
  optionStyles?: Record<string, SelectOptionStyle>;
  conditionalRules?: ConditionalFormatRule[];
}

export interface Sheet {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  columns: SheetColumn[];
  row_groups?: SheetRowGroup[] | null;
  group_by_column?: string | null;
  auto_group_order?: string[] | null;
  group_id: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateSheet = Omit<Sheet, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSheet = Partial<Omit<Sheet, 'id' | 'created_at' | 'updated_at'>>;

export interface SheetMember {
  id: string;
  sheet_id: string;
  team_member_id: string;
  created_at: string;
}

export type CreateSheetMember = Pick<SheetMember, 'sheet_id' | 'team_member_id'>;

export interface SheetGroupMember {
  id: string;
  sheet_group_id: string;
  team_member_id: string;
  created_at: string;
}

export type CreateSheetGroupMember = Pick<SheetGroupMember, 'sheet_group_id' | 'team_member_id'>;

export interface SheetRow {
  id: string;
  sheet_id: string;
  cells: Record<string, unknown>;
  cell_formats?: Record<string, CellStyle> | null;
  group_id?: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateSheetRow = Omit<SheetRow, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSheetRow = Partial<Omit<SheetRow, 'id' | 'created_at' | 'updated_at'>>;

export interface WorkstreamMember {
  id: string;
  workstream_id: string;
  team_member_id: string;
  created_at: string;
}

export type CreateWorkstreamMember = Pick<WorkstreamMember, 'workstream_id' | 'team_member_id'>;

export interface SheetRowComment {
  id: string;
  sheet_id: string;
  sheet_row_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export type CreateSheetRowComment = Pick<SheetRowComment, 'sheet_id' | 'sheet_row_id' | 'content' | 'created_by'>;

// Dashboard Widgets
export interface WidgetConfig {
  xColumnId?: string;
  xColumnName?: string;
  yColumnId?: string;
  yColumnName?: string;
  aggFunction?: AggFunction;
  groupByColumnId?: string;
  groupByColumnName?: string;
  dateBucket?: DateBucket;
  sortBy?: SortBy;
}

export interface ChartDataPoint {
  category: string;
  value: number;
  [key: string]: string | number;
}

export interface DashboardWidget {
  id: string;
  title: string;
  chart_type: ChartType;
  source_type: SourceType;
  sheet_id: string | null;
  sheet_group_id: string | null;
  selected_sheet_ids: string[];
  config: WidgetConfig;
  color_palette: string;
  grid_span: number;
  show_legend: boolean;
  show_values: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateDashboardWidget = Omit<DashboardWidget, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDashboardWidget = Partial<Omit<DashboardWidget, 'id' | 'created_at' | 'updated_at'>>;

// Diagrams
export interface DiagramNodeData {
  label: string;
  description?: string;
  nodeType: DiagramNodeType;
  color?: string;
  borderColor?: string;
  details?: string;
  detailFields?: { label: string; value: string }[];
  fontSize?: number;
}

export interface DiagramEdgeData {
  label?: string;
}

export interface DiagramLegendItem {
  id: string;
  label: string;
  color: string;
  description?: string;
}

export interface DiagramFlowData {
  nodes: unknown[];
  edges: unknown[];
  viewport: { x: number; y: number; zoom: number };
}

export interface DiagramGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateDiagramGroup = Omit<DiagramGroup, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDiagramGroup = Partial<Omit<DiagramGroup, 'id' | 'created_at' | 'updated_at'>>;

export interface DiagramGroupMember {
  id: string;
  diagram_group_id: string;
  team_member_id: string;
  created_at: string;
}

export type CreateDiagramGroupMember = Pick<DiagramGroupMember, 'diagram_group_id' | 'team_member_id'>;

export interface Diagram {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  flow_data: DiagramFlowData;
  legend: DiagramLegendItem[];
  sort_order: number;
  group_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateDiagram = Omit<Diagram, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDiagram = Partial<Omit<Diagram, 'id' | 'created_at' | 'updated_at'>>;

export interface DiagramMember {
  id: string;
  diagram_id: string;
  team_member_id: string;
  created_at: string;
}

export type CreateDiagramMember = Pick<DiagramMember, 'diagram_id' | 'team_member_id'>;
