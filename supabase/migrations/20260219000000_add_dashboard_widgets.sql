-- Dashboard Widgets table for Sheets visualization
CREATE TABLE dashboard_widgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  chart_type TEXT NOT NULL CHECK (chart_type IN (
    'bar','horizontal_bar','stacked_bar','line','area','pie','donut','kpi'
  )),
  source_type TEXT NOT NULL DEFAULT 'single_sheet' CHECK (source_type IN ('single_sheet','sheet_group')),
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
  sheet_group_id UUID REFERENCES sheet_groups(id) ON DELETE CASCADE,
  selected_sheet_ids UUID[] DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  color_palette TEXT NOT NULL DEFAULT 'auto',
  grid_span INT NOT NULL DEFAULT 1 CHECK (grid_span IN (1, 2)),
  show_legend BOOLEAN NOT NULL DEFAULT true,
  show_values BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_dashboard_widgets_created_by ON dashboard_widgets(created_by);
CREATE INDEX idx_dashboard_widgets_sheet_id ON dashboard_widgets(sheet_id);
CREATE INDEX idx_dashboard_widgets_sheet_group_id ON dashboard_widgets(sheet_group_id);

-- Updated_at trigger
CREATE TRIGGER update_dashboard_widgets_timestamp
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can create dashboard widgets"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_permission_level() IN ('admin', 'member')
  );

CREATE POLICY "Creator and admins can update dashboard widgets"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT id FROM team_members WHERE email = auth.jwt()->>'email')
    OR get_my_permission_level() = 'admin'
  );

CREATE POLICY "Creator and admins can delete dashboard widgets"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT id FROM team_members WHERE email = auth.jwt()->>'email')
    OR get_my_permission_level() = 'admin'
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_widgets;
