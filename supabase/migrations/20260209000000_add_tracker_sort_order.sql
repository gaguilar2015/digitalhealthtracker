-- Add sort_order column to trackers for drag-to-reorder in sidebar
ALTER TABLE trackers ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Backfill sequentially by created_at (oldest=0)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn FROM trackers
)
UPDATE trackers SET sort_order = ranked.rn FROM ranked WHERE trackers.id = ranked.id;

CREATE INDEX idx_trackers_sort_order ON trackers(sort_order);
