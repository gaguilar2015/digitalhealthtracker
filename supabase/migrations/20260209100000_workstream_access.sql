-- Migration: Workstream-level access control
-- Adds workstream_members table, auto-add owner trigger, RLS helpers, and updated policies

-- ============================================================
-- 1. Create workstream_members table
-- ============================================================

CREATE TABLE workstream_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workstream_id UUID NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT workstream_members_unique UNIQUE (workstream_id, team_member_id)
);

CREATE INDEX idx_workstream_members_workstream ON workstream_members(workstream_id);
CREATE INDEX idx_workstream_members_member ON workstream_members(team_member_id);

-- ============================================================
-- 2. Auto-add owner trigger (mirrors tracker_auto_add_creator)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_add_workstream_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NOT NULL THEN
        INSERT INTO workstream_members (workstream_id, team_member_id)
        VALUES (NEW.id, NEW.owner_id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER workstream_auto_add_owner
    AFTER INSERT ON workstreams
    FOR EACH ROW EXECUTE FUNCTION auto_add_workstream_owner();

-- ============================================================
-- 3. RLS helper function
-- ============================================================

CREATE OR REPLACE FUNCTION is_workstream_member(p_workstream_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM workstream_members
        WHERE workstream_id = p_workstream_id
          AND team_member_id = auth.uid()
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 4. Updated RLS policies — SELECT
-- ============================================================

-- Workstreams
DROP POLICY IF EXISTS "workstreams_select" ON workstreams;
CREATE POLICY "workstreams_select" ON workstreams FOR SELECT TO authenticated
    USING (get_my_permission_level() = 'admin' OR is_workstream_member(id));

-- Activity Groups
DROP POLICY IF EXISTS "activity_groups_select" ON activity_groups;
CREATE POLICY "activity_groups_select" ON activity_groups FOR SELECT TO authenticated
    USING (get_my_permission_level() = 'admin' OR is_workstream_member(workstream_id));

-- Activities
DROP POLICY IF EXISTS "activities_select" ON activities;
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated
    USING (get_my_permission_level() = 'admin' OR is_workstream_member(workstream_id));

-- Tasks (joins through activity to get workstream_id)
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = tasks.activity_id
              AND is_workstream_member(a.workstream_id)
        )
    );

-- Deliverables
DROP POLICY IF EXISTS "deliverables_select" ON deliverables;
CREATE POLICY "deliverables_select" ON deliverables FOR SELECT TO authenticated
    USING (get_my_permission_level() = 'admin' OR is_workstream_member(workstream_id));

-- ============================================================
-- 5. Updated RLS policies — INSERT (membership check)
-- ============================================================

DROP POLICY IF EXISTS "activities_insert" ON activities;
CREATE POLICY "activities_insert" ON activities FOR INSERT TO authenticated
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR (get_my_permission_level() = 'member' AND is_workstream_member(workstream_id))
    );

DROP POLICY IF EXISTS "activity_groups_insert" ON activity_groups;
CREATE POLICY "activity_groups_insert" ON activity_groups FOR INSERT TO authenticated
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR (get_my_permission_level() = 'member' AND is_workstream_member(workstream_id))
    );

DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR (
            get_my_permission_level() = 'member'
            AND EXISTS (
                SELECT 1 FROM activities a
                WHERE a.id = activity_id
                  AND is_workstream_member(a.workstream_id)
            )
        )
    );

DROP POLICY IF EXISTS "deliverables_insert" ON deliverables;
CREATE POLICY "deliverables_insert" ON deliverables FOR INSERT TO authenticated
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR (get_my_permission_level() = 'member' AND is_workstream_member(workstream_id))
    );

-- ============================================================
-- 6. workstream_members RLS
-- ============================================================

ALTER TABLE workstream_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wm_select" ON workstream_members FOR SELECT TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR team_member_id = auth.uid()
        OR is_workstream_member(workstream_id)
    );

CREATE POLICY "wm_insert" ON workstream_members FOR INSERT TO authenticated
    WITH CHECK (
        get_my_permission_level() = 'admin'
        OR EXISTS (SELECT 1 FROM workstreams WHERE id = workstream_id AND owner_id = auth.uid())
    );

CREATE POLICY "wm_delete" ON workstream_members FOR DELETE TO authenticated
    USING (
        get_my_permission_level() = 'admin'
        OR EXISTS (SELECT 1 FROM workstreams WHERE id = workstream_id AND owner_id = auth.uid())
    );

-- ============================================================
-- 7. Data migration — add all active members to all existing workstreams
-- ============================================================

INSERT INTO workstream_members (workstream_id, team_member_id)
SELECT w.id, tm.id
FROM workstreams w
CROSS JOIN team_members tm
WHERE tm.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE workstream_members;
