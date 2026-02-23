-- ============================================================
-- Diagram Groups + Diagram Group Members
-- Mirrors the sheet_groups / sheet_group_members pattern
-- ============================================================

-- diagram_groups table
CREATE TABLE diagram_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- diagram_group_members join table
CREATE TABLE diagram_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_group_id UUID NOT NULL REFERENCES diagram_groups(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT diagram_group_members_unique UNIQUE (diagram_group_id, team_member_id)
);

-- Add group_id FK to diagrams (nullable, SET NULL on group delete)
ALTER TABLE diagrams ADD COLUMN group_id UUID REFERENCES diagram_groups(id) ON DELETE SET NULL;

-- updated_at trigger for diagram_groups
CREATE TRIGGER set_diagram_groups_updated_at
    BEFORE UPDATE ON diagram_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_diagram_groups_created_by ON diagram_groups(created_by);
CREATE INDEX idx_diagram_groups_sort_order ON diagram_groups(sort_order);
CREATE INDEX idx_diagrams_group_id ON diagrams(group_id);
CREATE INDEX idx_diagram_group_members_group_id ON diagram_group_members(diagram_group_id);
CREATE INDEX idx_diagram_group_members_member_id ON diagram_group_members(team_member_id);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE diagram_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE diagram_group_members;
