ALTER TABLE trackers ADD COLUMN auto_group_order JSONB NOT NULL DEFAULT '[]'::jsonb;
