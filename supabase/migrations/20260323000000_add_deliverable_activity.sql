-- Optional activity association for deliverables
ALTER TABLE deliverables
  ADD COLUMN activity_id UUID REFERENCES activities(id) ON DELETE SET NULL;

CREATE INDEX idx_deliverables_activity ON deliverables(activity_id);
