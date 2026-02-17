-- ============================================================================
-- Tracker Groups (Folders) - Database Migration
-- Organizational grouping for trackers (purely visual, no access control)
-- ============================================================================

-- ===========================================
-- 1. New Table: tracker_groups
-- ===========================================
CREATE TABLE tracker_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,  -- hex color for visual accent
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- 2. Alter trackers: add group_id FK
-- ===========================================
ALTER TABLE trackers ADD COLUMN group_id UUID REFERENCES tracker_groups(id) ON DELETE SET NULL;

-- ===========================================
-- 3. Trigger: auto-update updated_at
-- ===========================================
CREATE TRIGGER set_updated_at_tracker_groups
    BEFORE UPDATE ON tracker_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 4. Indexes
-- ===========================================
CREATE INDEX idx_tracker_groups_created_by ON tracker_groups(created_by);
CREATE INDEX idx_tracker_groups_sort_order ON tracker_groups(sort_order);
CREATE INDEX idx_trackers_group_id ON trackers(group_id);

-- ===========================================
-- 5. Enable Realtime
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE tracker_groups;
