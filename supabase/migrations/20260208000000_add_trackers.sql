-- ============================================================================
-- Trackers Feature - Database Migration
-- Custom ad-hoc tracking tables (to-do lists, inventories, issue logs, etc.)
-- ============================================================================

-- ===========================================
-- 1. Tables
-- ===========================================

-- 1.1 Trackers (definitions)
CREATE TABLE trackers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Tracker Members (access control join table)
CREATE TABLE tracker_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracker_id UUID NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tracker_members_unique UNIQUE (tracker_id, team_member_id)
);

-- 1.3 Tracker Rows (data)
CREATE TABLE tracker_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracker_id UUID NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
    cells JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- 2. Helper Functions (SECURITY DEFINER)
-- ===========================================

CREATE OR REPLACE FUNCTION is_tracker_member(p_tracker_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM tracker_members tm
        JOIN team_members tmem ON tmem.id = tm.team_member_id
        WHERE tm.tracker_id = p_tracker_id
          AND tm.team_member_id = (
              SELECT id FROM team_members WHERE id = auth.uid()
          )
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_tracker_creator(p_tracker_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM trackers
        WHERE id = p_tracker_id
          AND created_by = auth.uid()
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===========================================
-- 3. Triggers
-- ===========================================

-- Auto-update updated_at (reuses existing function)
CREATE TRIGGER set_updated_at_trackers
    BEFORE UPDATE ON trackers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_tracker_rows
    BEFORE UPDATE ON tracker_rows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-add creator as member
CREATE OR REPLACE FUNCTION add_tracker_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tracker_members (tracker_id, team_member_id)
    VALUES (NEW.id, NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracker_auto_add_creator
    AFTER INSERT ON trackers
    FOR EACH ROW EXECUTE FUNCTION add_tracker_creator_as_member();

-- ===========================================
-- 4. RLS disabled for tracker tables
-- ===========================================
-- Auth is enforced via Supabase JWT (anon key + authenticated role).
-- Application-level permission checks handle member/admin/viewer access.

-- ===========================================
-- 6. Indexes
-- ===========================================
CREATE INDEX idx_trackers_created_by ON trackers(created_by);
CREATE INDEX idx_tracker_members_tracker_member ON tracker_members(tracker_id, team_member_id);
CREATE INDEX idx_tracker_members_member ON tracker_members(team_member_id);
CREATE INDEX idx_tracker_rows_tracker_sort ON tracker_rows(tracker_id, sort_order);
CREATE INDEX idx_tracker_rows_created_by ON tracker_rows(created_by);

-- ===========================================
-- 7. Enable Realtime
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE trackers;
ALTER PUBLICATION supabase_realtime ADD TABLE tracker_members;
ALTER PUBLICATION supabase_realtime ADD TABLE tracker_rows;
