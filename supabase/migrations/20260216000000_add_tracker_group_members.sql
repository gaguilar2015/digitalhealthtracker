-- ============================================================================
-- Tracker Group Members - Database Migration
-- Group-level sharing: members added to a group get access to all trackers
-- in that group (including future ones moved into it).
-- ============================================================================

-- ===========================================
-- 1. New Table: tracker_group_members
-- ===========================================
CREATE TABLE tracker_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracker_group_id UUID NOT NULL REFERENCES tracker_groups(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tracker_group_members_unique UNIQUE (tracker_group_id, team_member_id)
);

-- ===========================================
-- 2. Trigger: auto-update (none needed, no updated_at column)
-- ===========================================

-- Auto-add group creator as member
CREATE OR REPLACE FUNCTION add_tracker_group_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tracker_group_members (tracker_group_id, team_member_id)
    VALUES (NEW.id, NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracker_group_auto_add_creator
    AFTER INSERT ON tracker_groups
    FOR EACH ROW EXECUTE FUNCTION add_tracker_group_creator_as_member();

-- ===========================================
-- 3. Indexes
-- ===========================================
CREATE INDEX idx_tracker_group_members_group_member ON tracker_group_members(tracker_group_id, team_member_id);
CREATE INDEX idx_tracker_group_members_member ON tracker_group_members(team_member_id);

-- ===========================================
-- 4. Enable Realtime
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE tracker_group_members;
