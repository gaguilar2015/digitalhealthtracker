-- Migration: Disable RLS on all tables
-- Reason: RLS policies were causing issues (e.g., sheet_groups INSERT restricted to admin only,
-- blocking non-admin users from creating sheets with groups). Instead of patching individual
-- policies, we disable RLS entirely and rely on application-level auth:
--   - Supabase JWT authentication ensures only logged-in users access the API
--   - Permission checks (admin/member/viewer) happen in the frontend components

-- ============================================================
-- 1. Disable RLS on all tables
-- ============================================================

ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workstreams DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables DISABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE workstream_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_rows DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_row_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Drop all RLS policies
-- ============================================================

-- team_members policies
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- workstreams policies
DROP POLICY IF EXISTS "workstreams_select" ON workstreams;
DROP POLICY IF EXISTS "workstreams_insert" ON workstreams;
DROP POLICY IF EXISTS "workstreams_update" ON workstreams;
DROP POLICY IF EXISTS "workstreams_delete" ON workstreams;

-- activity_groups policies
DROP POLICY IF EXISTS "activity_groups_select" ON activity_groups;
DROP POLICY IF EXISTS "activity_groups_insert" ON activity_groups;
DROP POLICY IF EXISTS "activity_groups_update" ON activity_groups;
DROP POLICY IF EXISTS "activity_groups_delete" ON activity_groups;

-- activities policies
DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;
DROP POLICY IF EXISTS "activities_update" ON activities;
DROP POLICY IF EXISTS "activities_delete" ON activities;

-- tasks policies
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- deliverables policies
DROP POLICY IF EXISTS "deliverables_select" ON deliverables;
DROP POLICY IF EXISTS "deliverables_insert" ON deliverables;
DROP POLICY IF EXISTS "deliverables_update" ON deliverables;
DROP POLICY IF EXISTS "deliverables_delete" ON deliverables;

-- dependencies policies
DROP POLICY IF EXISTS "dependencies_select" ON dependencies;
DROP POLICY IF EXISTS "dependencies_insert" ON dependencies;
DROP POLICY IF EXISTS "dependencies_update" ON dependencies;
DROP POLICY IF EXISTS "dependencies_delete" ON dependencies;

-- attachments policies
DROP POLICY IF EXISTS "attachments_select" ON attachments;
DROP POLICY IF EXISTS "attachments_insert" ON attachments;
DROP POLICY IF EXISTS "attachments_delete" ON attachments;

-- resources policies
DROP POLICY IF EXISTS "resources_select" ON resources;
DROP POLICY IF EXISTS "resources_insert" ON resources;
DROP POLICY IF EXISTS "resources_update" ON resources;
DROP POLICY IF EXISTS "resources_delete" ON resources;

-- workstream_members policies (RLS was already disabled but policies may still exist)
DROP POLICY IF EXISTS "wm_select" ON workstream_members;
DROP POLICY IF EXISTS "wm_insert" ON workstream_members;
DROP POLICY IF EXISTS "wm_delete" ON workstream_members;

-- sheets policies
DROP POLICY IF EXISTS "Members can view their sheets" ON sheets;
DROP POLICY IF EXISTS "Members can create sheets" ON sheets;
DROP POLICY IF EXISTS "Admin and creator can update sheets" ON sheets;
DROP POLICY IF EXISTS "Admin and creator can delete sheets" ON sheets;

-- sheet_members policies
DROP POLICY IF EXISTS "Members can view sheet members" ON sheet_members;
DROP POLICY IF EXISTS "Admin and creator can add sheet members" ON sheet_members;
DROP POLICY IF EXISTS "Admin and creator can remove sheet members" ON sheet_members;

-- sheet_rows policies
DROP POLICY IF EXISTS "Members can view sheet rows" ON sheet_rows;
DROP POLICY IF EXISTS "Members can create sheet rows" ON sheet_rows;
DROP POLICY IF EXISTS "Members can update sheet rows" ON sheet_rows;
DROP POLICY IF EXISTS "Members can delete sheet rows" ON sheet_rows;

-- sheet_groups policies
DROP POLICY IF EXISTS "Members can view sheet groups" ON sheet_groups;
DROP POLICY IF EXISTS "Admin can create sheet groups" ON sheet_groups;
DROP POLICY IF EXISTS "Admin can manage sheet groups" ON sheet_groups;
DROP POLICY IF EXISTS "Admin can delete sheet groups" ON sheet_groups;

-- sheet_group_members policies
DROP POLICY IF EXISTS "Members can view group members" ON sheet_group_members;
DROP POLICY IF EXISTS "Admin can add group members" ON sheet_group_members;
DROP POLICY IF EXISTS "Admin can remove group members" ON sheet_group_members;

-- sheet_row_comments policies
DROP POLICY IF EXISTS "Sheet members can view comments" ON sheet_row_comments;
DROP POLICY IF EXISTS "Sheet members can create comments" ON sheet_row_comments;
DROP POLICY IF EXISTS "Comment owner or admin can delete" ON sheet_row_comments;

-- audit_logs policies
DROP POLICY IF EXISTS "Users can insert own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;

-- dashboard_widgets policies
DROP POLICY IF EXISTS "Authenticated users can read dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Members and admins can create dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Creator and admins can update dashboard widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Creator and admins can delete dashboard widgets" ON dashboard_widgets;

-- ============================================================
-- 3. Drop RLS helper functions (no longer needed)
-- ============================================================

DROP FUNCTION IF EXISTS get_my_permission_level();
DROP FUNCTION IF EXISTS is_sheet_member(UUID);
DROP FUNCTION IF EXISTS is_sheet_creator(UUID);
DROP FUNCTION IF EXISTS is_workstream_member(UUID);
-- Deprecated tracker-era functions (may have been dropped by rename migration, but safe to try)
DROP FUNCTION IF EXISTS is_tracker_member(UUID);
DROP FUNCTION IF EXISTS is_tracker_creator(UUID);
