-- Split HEARTS Tracker: Move CQI rows into new "HEARTS Evaluation" tracker
-- Moves 5 rows (H-CQI-1 through H-CQI-5) from the existing HEARTS tracker
-- into a new tracker with the same column structure.
--
-- Usage: Paste into Supabase SQL Editor and execute.
-- Generated: 2026-02-16

BEGIN;

DO $$
DECLARE
  hearts_id       UUID;
  hearts_cols     JSONB;
  hearts_group    UUID;
  hearts_creator  UUID;
  hearts_sort     INT;
  id_col_uuid     TEXT;
  new_tracker_id  UUID;
  moved_count     INT;
BEGIN
  -- 1. Look up existing HEARTS tracker
  SELECT id, columns, group_id, created_by, sort_order
  INTO hearts_id, hearts_cols, hearts_group, hearts_creator, hearts_sort
  FROM trackers
  WHERE name = 'HEARTS - Core Indicators'
  LIMIT 1;

  IF hearts_id IS NULL THEN
    RAISE EXCEPTION 'HEARTS tracker not found — expected a tracker named "HEARTS - Core Indicators"';
  END IF;

  -- 2. Extract the "ID" column UUID from the columns JSONB array
  SELECT elem->>'id' INTO id_col_uuid
  FROM jsonb_array_elements(hearts_cols) AS elem
  WHERE elem->>'name' = 'ID';

  IF id_col_uuid IS NULL THEN
    RAISE EXCEPTION 'ID column not found in HEARTS tracker columns JSONB';
  END IF;

  -- 3. Bump sort_order for sibling trackers in same group that come after HEARTS
  UPDATE trackers
  SET sort_order = sort_order + 1
  WHERE group_id = hearts_group
    AND sort_order > hearts_sort;

  -- 4. Create new "HEARTS Evaluation" tracker
  --    Copies the same 11-column structure; sits right after HEARTS in sidebar order.
  --    The tracker_auto_add_creator trigger will auto-add hearts_creator as a member.
  INSERT INTO trackers (id, name, description, icon, columns, sort_order, group_id, created_by)
  VALUES (
    gen_random_uuid(),
    'HEARTS Evaluation',
    '5 CQI evaluation indicators for HEARTS hypertension programme quality improvement',
    'ClipboardCheck',
    hearts_cols,
    hearts_sort + 1,
    hearts_group,
    hearts_creator
  ) RETURNING id INTO new_tracker_id;

  -- 5. Move CQI rows from HEARTS → HEARTS Evaluation
  UPDATE tracker_rows
  SET tracker_id = new_tracker_id
  WHERE tracker_id = hearts_id
    AND cells->>id_col_uuid LIKE 'H-CQI-%';

  GET DIAGNOSTICS moved_count = ROW_COUNT;

  IF moved_count = 0 THEN
    RAISE EXCEPTION 'No H-CQI-* rows found in HEARTS tracker — check that the data was imported';
  END IF;

  -- 6. Renumber sort_order on old HEARTS tracker (0-based, preserve existing order)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 AS new_sort
    FROM tracker_rows
    WHERE tracker_id = hearts_id
  )
  UPDATE tracker_rows
  SET sort_order = ranked.new_sort
  FROM ranked
  WHERE tracker_rows.id = ranked.id;

  -- 7. Renumber sort_order on new HEARTS Evaluation tracker (0-based, preserve existing order)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 AS new_sort
    FROM tracker_rows
    WHERE tracker_id = new_tracker_id
  )
  UPDATE tracker_rows
  SET sort_order = ranked.new_sort
  FROM ranked
  WHERE tracker_rows.id = ranked.id;

  -- 8. Copy tracker_members from HEARTS to HEARTS Evaluation
  --    ON CONFLICT handles the creator already auto-added by trigger in step 4.
  INSERT INTO tracker_members (tracker_id, team_member_id)
  SELECT new_tracker_id, team_member_id
  FROM tracker_members
  WHERE tracker_id = hearts_id
  ON CONFLICT ON CONSTRAINT tracker_members_unique DO NOTHING;

  -- Summary
  RAISE NOTICE 'Created "HEARTS Evaluation" tracker (id: %)', new_tracker_id;
  RAISE NOTICE 'Moved % rows (H-CQI-*) from HEARTS → HEARTS Evaluation', moved_count;
  RAISE NOTICE 'Remaining rows in HEARTS: %',
    (SELECT COUNT(*) FROM tracker_rows WHERE tracker_id = hearts_id);
END $$;

COMMIT;
