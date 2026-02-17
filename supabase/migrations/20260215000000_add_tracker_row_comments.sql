-- Add tracker row comments table
CREATE TABLE tracker_row_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracker_id UUID NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
    tracker_row_id UUID NOT NULL REFERENCES tracker_rows(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) > 0),
    created_by UUID NOT NULL REFERENCES team_members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tracker_row_comments_tracker ON tracker_row_comments(tracker_id);
CREATE INDEX idx_tracker_row_comments_row ON tracker_row_comments(tracker_row_id, created_at);

-- RLS
ALTER TABLE tracker_row_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: tracker members + admin
CREATE POLICY "Tracker members can view comments" ON tracker_row_comments
  FOR SELECT USING (is_tracker_member(tracker_id) OR get_my_permission_level() = 'admin');

-- INSERT: tracker members with non-viewer permission (created_by must match auth user)
CREATE POLICY "Tracker members can create comments" ON tracker_row_comments
  FOR INSERT WITH CHECK (
    (is_tracker_member(tracker_id) OR get_my_permission_level() = 'admin')
    AND created_by = auth.uid()
    AND get_my_permission_level() != 'viewer'
  );

-- DELETE: comment creator or admin
CREATE POLICY "Comment owner or admin can delete" ON tracker_row_comments
  FOR DELETE USING (
    created_by = auth.uid() OR get_my_permission_level() = 'admin'
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tracker_row_comments;
