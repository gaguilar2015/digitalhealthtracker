-- Migration: Relax over-restrictive RLS policies for planning actions.
-- This is a team-planning tool, so members (not just admins) need to create
-- workstreams, manage activity groups, and manage sheet groups. Viewer
-- commenting is already allowed by the existing is_sheet_member() check.
--
-- See: planning doc user-ann-ingraham-health-gov-bz-is-repor-stateful-cocke.md

-- ============================================================
-- workstreams: members can INSERT; admins or the owner can DELETE
-- (UPDATE policy is already admin-OR-owner; no change needed.)
-- ============================================================

DROP POLICY IF EXISTS "workstreams_insert" ON workstreams;
CREATE POLICY "workstreams_insert"
    ON workstreams FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

DROP POLICY IF EXISTS "workstreams_delete" ON workstreams;
CREATE POLICY "workstreams_delete"
    ON workstreams FOR DELETE
    TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR owner_id = auth.uid()
    );

-- ============================================================
-- activity_groups: members can INSERT/UPDATE/DELETE
-- (Asymmetry fix: previously members could create but not modify.)
-- ============================================================

DROP POLICY IF EXISTS "activity_groups_insert" ON activity_groups;
CREATE POLICY "activity_groups_insert"
    ON activity_groups FOR INSERT
    TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

DROP POLICY IF EXISTS "activity_groups_update" ON activity_groups;
CREATE POLICY "activity_groups_update"
    ON activity_groups FOR UPDATE
    TO authenticated
    USING (get_my_permission_level() IN ('admin', 'member'))
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

DROP POLICY IF EXISTS "activity_groups_delete" ON activity_groups;
CREATE POLICY "activity_groups_delete"
    ON activity_groups FOR DELETE
    TO authenticated
    USING (get_my_permission_level() IN ('admin', 'member'));

-- ============================================================
-- sheet_groups: members can INSERT/UPDATE/DELETE.
-- Rename policies to the snake_case convention used elsewhere.
-- ============================================================

DROP POLICY IF EXISTS "Admin can create sheet groups" ON sheet_groups;
DROP POLICY IF EXISTS "sheet_groups_insert" ON sheet_groups;
CREATE POLICY "sheet_groups_insert"
    ON sheet_groups FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE id = auth.uid()
              AND permission_level IN ('admin', 'member')
        )
    );

DROP POLICY IF EXISTS "Admin can manage sheet groups" ON sheet_groups;
DROP POLICY IF EXISTS "sheet_groups_update" ON sheet_groups;
CREATE POLICY "sheet_groups_update"
    ON sheet_groups FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE id = auth.uid()
              AND permission_level IN ('admin', 'member')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE id = auth.uid()
              AND permission_level IN ('admin', 'member')
        )
    );

DROP POLICY IF EXISTS "Admin can delete sheet groups" ON sheet_groups;
DROP POLICY IF EXISTS "sheet_groups_delete" ON sheet_groups;
CREATE POLICY "sheet_groups_delete"
    ON sheet_groups FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE id = auth.uid()
              AND permission_level IN ('admin', 'member')
        )
    );

-- ============================================================
-- sheet_group_members: members can add/remove members on groups
-- ============================================================

DROP POLICY IF EXISTS "Admin can add group members" ON sheet_group_members;
DROP POLICY IF EXISTS "sheet_group_members_insert" ON sheet_group_members;
CREATE POLICY "sheet_group_members_insert"
    ON sheet_group_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE id = auth.uid()
              AND permission_level IN ('admin', 'member')
        )
    );

DROP POLICY IF EXISTS "Admin can remove group members" ON sheet_group_members;
DROP POLICY IF EXISTS "sheet_group_members_delete" ON sheet_group_members;
CREATE POLICY "sheet_group_members_delete"
    ON sheet_group_members FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE id = auth.uid()
              AND permission_level IN ('admin', 'member')
        )
    );
