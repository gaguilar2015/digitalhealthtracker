-- Migration: Rename "trackers" to "sheets" across all tables, functions, triggers, indexes, policies, and constraints.

-- ============================================================
-- 1. RENAME TABLES
-- ============================================================
ALTER TABLE trackers RENAME TO sheets;
ALTER TABLE tracker_members RENAME TO sheet_members;
ALTER TABLE tracker_rows RENAME TO sheet_rows;
ALTER TABLE tracker_groups RENAME TO sheet_groups;
ALTER TABLE tracker_group_members RENAME TO sheet_group_members;
ALTER TABLE tracker_row_comments RENAME TO sheet_row_comments;

-- ============================================================
-- 2. RENAME COLUMNS (foreign key columns that reference tracker)
-- ============================================================
ALTER TABLE sheet_members RENAME COLUMN tracker_id TO sheet_id;
ALTER TABLE sheet_rows RENAME COLUMN tracker_id TO sheet_id;
ALTER TABLE sheet_row_comments RENAME COLUMN tracker_id TO sheet_id;
ALTER TABLE sheet_row_comments RENAME COLUMN tracker_row_id TO sheet_row_id;
ALTER TABLE sheet_group_members RENAME COLUMN tracker_group_id TO sheet_group_id;

-- ============================================================
-- 3. RENAME INDEXES
-- ============================================================
ALTER INDEX idx_trackers_created_by RENAME TO idx_sheets_created_by;
ALTER INDEX idx_trackers_sort_order RENAME TO idx_sheets_sort_order;
ALTER INDEX idx_trackers_group_id RENAME TO idx_sheets_group_id;
ALTER INDEX idx_tracker_members_tracker_member RENAME TO idx_sheet_members_sheet_member;
ALTER INDEX idx_tracker_members_member RENAME TO idx_sheet_members_member;
ALTER INDEX idx_tracker_rows_tracker_sort RENAME TO idx_sheet_rows_sheet_sort;
ALTER INDEX idx_tracker_rows_created_by RENAME TO idx_sheet_rows_created_by;
ALTER INDEX idx_tracker_rows_group RENAME TO idx_sheet_rows_group;
ALTER INDEX idx_tracker_groups_created_by RENAME TO idx_sheet_groups_created_by;
ALTER INDEX idx_tracker_groups_sort_order RENAME TO idx_sheet_groups_sort_order;
ALTER INDEX idx_tracker_group_members_group_member RENAME TO idx_sheet_group_members_group_member;
ALTER INDEX idx_tracker_group_members_member RENAME TO idx_sheet_group_members_member;
ALTER INDEX idx_tracker_row_comments_tracker RENAME TO idx_sheet_row_comments_sheet;
ALTER INDEX idx_tracker_row_comments_row RENAME TO idx_sheet_row_comments_row;

-- ============================================================
-- 4. RENAME CONSTRAINTS
-- ============================================================
ALTER TABLE sheet_members RENAME CONSTRAINT tracker_members_unique TO sheet_members_unique;
ALTER TABLE sheet_group_members RENAME CONSTRAINT tracker_group_members_unique TO sheet_group_members_unique;

-- ============================================================
-- 5. DROP OLD TRIGGERS, FUNCTIONS, AND DEPENDENT POLICIES
-- ============================================================

-- 5a. Drop old triggers that depend on old functions
DROP TRIGGER IF EXISTS tracker_auto_add_creator ON sheets;
DROP TRIGGER IF EXISTS tracker_group_auto_add_creator ON sheet_groups;

-- 5b. Drop old functions with CASCADE to auto-remove all dependent RLS policies.
-- The policies were created via Supabase dashboard with names like trackers_select,
-- tracker_rows_insert, etc. CASCADE handles them regardless of naming.
DROP FUNCTION IF EXISTS is_tracker_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_tracker_creator(UUID) CASCADE;
DROP FUNCTION IF EXISTS add_tracker_creator_as_member() CASCADE;
DROP FUNCTION IF EXISTS add_tracker_group_creator_as_member() CASCADE;

-- 5c. Also drop any remaining policies on these tables that CASCADE didn't catch
-- (policies that don't reference the dropped functions, e.g. insert policies with inline checks)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('sheets', 'sheet_members', 'sheet_rows', 'sheet_groups', 'sheet_group_members', 'sheet_row_comments')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END;
$$;

-- 5d. Recreate functions with new names
CREATE OR REPLACE FUNCTION is_sheet_member(p_sheet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sheet_members
    WHERE sheet_id = p_sheet_id
      AND team_member_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE id = auth.uid()
      AND permission_level = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_sheet_creator(p_sheet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sheets
    WHERE id = p_sheet_id
      AND created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE id = auth.uid()
      AND permission_level = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION add_sheet_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO sheet_members (sheet_id, team_member_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION add_sheet_group_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO sheet_group_members (sheet_group_id, team_member_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. RENAME TRIGGERS (updated_at triggers) + RECREATE OTHERS
-- ============================================================
-- The set_updated_at triggers just need renaming
ALTER TRIGGER set_updated_at_trackers ON sheets RENAME TO set_updated_at_sheets;
ALTER TRIGGER set_updated_at_tracker_rows ON sheet_rows RENAME TO set_updated_at_sheet_rows;
ALTER TRIGGER set_updated_at_tracker_groups ON sheet_groups RENAME TO set_updated_at_sheet_groups;

-- Recreate the auto-add-creator triggers with new function names
CREATE TRIGGER sheet_auto_add_creator
  AFTER INSERT ON sheets
  FOR EACH ROW
  EXECUTE FUNCTION add_sheet_creator_as_member();

CREATE TRIGGER sheet_group_auto_add_creator
  AFTER INSERT ON sheet_groups
  FOR EACH ROW
  EXECUTE FUNCTION add_sheet_group_creator_as_member();

-- ============================================================
-- 7. ENSURE RLS IS ENABLED AND RECREATE POLICIES
-- ============================================================
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_row_comments ENABLE ROW LEVEL SECURITY;

-- sheets (was trackers)
CREATE POLICY "Members can view their sheets" ON sheets
  FOR SELECT USING (is_sheet_member(id));

CREATE POLICY "Admin and creator can update sheets" ON sheets
  FOR UPDATE USING (is_sheet_creator(id));

CREATE POLICY "Admin and creator can delete sheets" ON sheets
  FOR DELETE USING (is_sheet_creator(id));

CREATE POLICY "Members can create sheets" ON sheets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
        AND permission_level IN ('admin', 'member')
    )
  );

-- sheet_members (was tracker_members)
CREATE POLICY "Members can view sheet members" ON sheet_members
  FOR SELECT USING (is_sheet_member(sheet_id));

CREATE POLICY "Admin and creator can add sheet members" ON sheet_members
  FOR INSERT WITH CHECK (is_sheet_creator(sheet_id));

CREATE POLICY "Admin and creator can remove sheet members" ON sheet_members
  FOR DELETE USING (is_sheet_creator(sheet_id));

-- sheet_rows (was tracker_rows)
CREATE POLICY "Members can view sheet rows" ON sheet_rows
  FOR SELECT USING (is_sheet_member(sheet_id));

CREATE POLICY "Members can create sheet rows" ON sheet_rows
  FOR INSERT WITH CHECK (is_sheet_member(sheet_id));

CREATE POLICY "Members can update sheet rows" ON sheet_rows
  FOR UPDATE USING (is_sheet_member(sheet_id));

CREATE POLICY "Members can delete sheet rows" ON sheet_rows
  FOR DELETE USING (is_sheet_member(sheet_id));

-- sheet_groups (was tracker_groups)
CREATE POLICY "Members can view sheet groups" ON sheet_groups
  FOR SELECT USING (true);

CREATE POLICY "Admin can create sheet groups" ON sheet_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
        AND permission_level = 'admin'
    )
  );

CREATE POLICY "Admin can manage sheet groups" ON sheet_groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
        AND permission_level = 'admin'
    )
  );

CREATE POLICY "Admin can delete sheet groups" ON sheet_groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
        AND permission_level = 'admin'
    )
  );

-- sheet_group_members (was tracker_group_members)
CREATE POLICY "Members can view group members" ON sheet_group_members
  FOR SELECT USING (true);

CREATE POLICY "Admin can add group members" ON sheet_group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
        AND permission_level = 'admin'
    )
  );

CREATE POLICY "Admin can remove group members" ON sheet_group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
        AND permission_level = 'admin'
    )
  );

-- sheet_row_comments (was tracker_row_comments)
CREATE POLICY "Sheet members can view comments" ON sheet_row_comments
  FOR SELECT USING (is_sheet_member(sheet_id));

CREATE POLICY "Sheet members can create comments" ON sheet_row_comments
  FOR INSERT WITH CHECK (is_sheet_member(sheet_id));

CREATE POLICY "Comment owner or admin can delete" ON sheet_row_comments
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
        AND permission_level = 'admin'
    )
  );

-- ============================================================
-- 8. UPDATE REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime DROP TABLE sheets, sheet_members, sheet_rows, sheet_groups, sheet_group_members, sheet_row_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE sheets, sheet_members, sheet_rows, sheet_groups, sheet_group_members, sheet_row_comments;
