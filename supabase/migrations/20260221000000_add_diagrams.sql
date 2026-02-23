-- ============================================================
-- Diagrams: interactive data flow diagram definitions + access
-- ============================================================

-- diagrams: stores diagram metadata + React Flow state as JSONB
CREATE TABLE IF NOT EXISTS diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  flow_data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1}}'::jsonb,
  legend JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES team_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- diagram_members: access control join table
CREATE TABLE IF NOT EXISTS diagram_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (diagram_id, team_member_id)
);

-- updated_at trigger for diagrams
CREATE TRIGGER set_diagrams_updated_at
  BEFORE UPDATE ON diagrams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-add creator as member on diagram creation
CREATE OR REPLACE FUNCTION auto_add_diagram_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO diagram_members (diagram_id, team_member_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_add_diagram_creator
  AFTER INSERT ON diagrams
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_diagram_creator();

-- RLS helper: check if current user is a diagram member
CREATE OR REPLACE FUNCTION is_diagram_member(did UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM diagram_members dm
    JOIN team_members tm ON tm.id = dm.team_member_id
    WHERE dm.diagram_id = did
      AND tm.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS helper: check if current user is diagram creator
CREATE OR REPLACE FUNCTION is_diagram_creator(did UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM diagrams d
    WHERE d.id = did
      AND d.created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for diagrams
CREATE POLICY "diagrams_select" ON diagrams FOR SELECT USING (
  get_my_permission_level() = 'admin' OR is_diagram_member(id)
);
CREATE POLICY "diagrams_insert" ON diagrams FOR INSERT WITH CHECK (
  get_my_permission_level() IN ('admin', 'member')
);
CREATE POLICY "diagrams_update" ON diagrams FOR UPDATE USING (
  get_my_permission_level() = 'admin' OR is_diagram_creator(id) OR is_diagram_member(id)
);
CREATE POLICY "diagrams_delete" ON diagrams FOR DELETE USING (
  get_my_permission_level() = 'admin' OR is_diagram_creator(id)
);

-- RLS policies for diagram_members
CREATE POLICY "diagram_members_select" ON diagram_members FOR SELECT USING (
  get_my_permission_level() = 'admin' OR is_diagram_member(diagram_id)
);
CREATE POLICY "diagram_members_insert" ON diagram_members FOR INSERT WITH CHECK (
  get_my_permission_level() = 'admin' OR is_diagram_creator(diagram_id)
);
CREATE POLICY "diagram_members_delete" ON diagram_members FOR DELETE USING (
  get_my_permission_level() = 'admin' OR is_diagram_creator(diagram_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diagrams_created_by ON diagrams(created_by);
CREATE INDEX IF NOT EXISTS idx_diagrams_sort_order ON diagrams(sort_order);
CREATE INDEX IF NOT EXISTS idx_diagram_members_diagram_id ON diagram_members(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_members_team_member_id ON diagram_members(team_member_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE diagrams;
ALTER PUBLICATION supabase_realtime ADD TABLE diagram_members;
