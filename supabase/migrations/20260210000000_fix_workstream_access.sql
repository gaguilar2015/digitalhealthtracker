-- Fix Workstream Access: Revert RLS to permissive, clean data, add auto-assign trigger
-- This migration reverts the restrictive RLS policies from 20260209100000_workstream_access.sql
-- and moves access control to the application level.

-- ============================================================
-- 1a. Revert RLS SELECT policies to USING (true)
-- ============================================================

DROP POLICY IF EXISTS "workstreams_select" ON workstreams;
CREATE POLICY "workstreams_select" ON workstreams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "activity_groups_select" ON activity_groups;
CREATE POLICY "activity_groups_select" ON activity_groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "activities_select" ON activities;
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "deliverables_select" ON deliverables;
CREATE POLICY "deliverables_select" ON deliverables FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 1b. Revert INSERT policies to original (permission-level-only)
-- ============================================================

DROP POLICY IF EXISTS "activities_insert" ON activities;
CREATE POLICY "activities_insert" ON activities FOR INSERT TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

DROP POLICY IF EXISTS "activity_groups_insert" ON activity_groups;
CREATE POLICY "activity_groups_insert" ON activity_groups FOR INSERT TO authenticated
    WITH CHECK (get_my_permission_level() = 'admin');

DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

DROP POLICY IF EXISTS "deliverables_insert" ON deliverables;
CREATE POLICY "deliverables_insert" ON deliverables FOR INSERT TO authenticated
    WITH CHECK (get_my_permission_level() IN ('admin', 'member'));

-- ============================================================
-- 1c. Disable RLS on workstream_members (application-level access)
-- ============================================================

ALTER TABLE workstream_members DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1d. Clean up workstream_members data
-- Remove universal memberships, keep only owners + assigned users
-- ============================================================

DELETE FROM workstream_members wm
WHERE NOT EXISTS (
    SELECT 1 FROM workstreams w
    WHERE w.id = wm.workstream_id AND w.owner_id = wm.team_member_id
)
AND NOT EXISTS (
    SELECT 1 FROM activities a
    WHERE a.workstream_id = wm.workstream_id AND a.assigned_to = wm.team_member_id
)
AND NOT EXISTS (
    SELECT 1 FROM tasks t
    JOIN activities a ON a.id = t.activity_id
    WHERE a.workstream_id = wm.workstream_id AND t.assigned_to = wm.team_member_id
)
AND NOT EXISTS (
    SELECT 1 FROM deliverables d
    WHERE d.workstream_id = wm.workstream_id AND d.assigned_to = wm.team_member_id
);

-- ============================================================
-- 1e. Auto-add trigger: assignment -> workstream membership
-- ============================================================

CREATE OR REPLACE FUNCTION auto_add_assigned_to_workstream()
RETURNS TRIGGER AS $$
DECLARE
    v_workstream_id UUID;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        IF TG_TABLE_NAME = 'tasks' THEN
            SELECT a.workstream_id INTO v_workstream_id
            FROM activities a WHERE a.id = NEW.activity_id;
        ELSE
            v_workstream_id := NEW.workstream_id;
        END IF;

        IF v_workstream_id IS NOT NULL THEN
            INSERT INTO workstream_members (workstream_id, team_member_id)
            VALUES (v_workstream_id, NEW.assigned_to)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_add_activity_assignee ON activities;
CREATE TRIGGER auto_add_activity_assignee
    AFTER INSERT OR UPDATE OF assigned_to ON activities
    FOR EACH ROW EXECUTE FUNCTION auto_add_assigned_to_workstream();

DROP TRIGGER IF EXISTS auto_add_task_assignee ON tasks;
CREATE TRIGGER auto_add_task_assignee
    AFTER INSERT OR UPDATE OF assigned_to ON tasks
    FOR EACH ROW EXECUTE FUNCTION auto_add_assigned_to_workstream();

DROP TRIGGER IF EXISTS auto_add_deliverable_assignee ON deliverables;
CREATE TRIGGER auto_add_deliverable_assignee
    AFTER INSERT OR UPDATE OF assigned_to ON deliverables
    FOR EACH ROW EXECUTE FUNCTION auto_add_assigned_to_workstream();
