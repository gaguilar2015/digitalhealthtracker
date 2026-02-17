-- Add cell formatting and row grouping support to trackers

-- Per-cell style overrides (keyed by column UUID)
ALTER TABLE tracker_rows ADD COLUMN cell_formats JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Manual group membership
ALTER TABLE tracker_rows ADD COLUMN group_id UUID;

-- Manual group definitions (array of {id, name, color, sort_order})
ALTER TABLE trackers ADD COLUMN row_groups JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Column ID for auto-grouping (null = no auto-group)
ALTER TABLE trackers ADD COLUMN group_by_column UUID;

-- Index for grouped queries
CREATE INDEX idx_tracker_rows_group ON tracker_rows(tracker_id, group_id);
