-- Restore deleted HEARTS Core Indicator rows (H-4, H-5)
-- These rows were accidentally deleted from the "HEARTS - Core Indicators" tracker.
-- Data sourced from the original NCD_Indicator_Catalog.xlsx.
--
-- Usage: Paste into Supabase SQL Editor and execute.

BEGIN;

DO $$
DECLARE
  hearts_id       UUID;
  hearts_cols     JSONB;
  hearts_creator  UUID;
  col_id          TEXT;  -- "ID" column
  col_name        TEXT;  -- "Indicator Name" column
  col_cat         TEXT;  -- "Category" column
  col_level       TEXT;  -- "Monitoring Level" column
  col_def         TEXT;  -- "Definition" column
  col_num         TEXT;  -- "Numerator / Method" column
  col_denom       TEXT;  -- "Denominator" column
  col_source      TEXT;  -- "Data Source" column
  col_freq        TEXT;  -- "Frequency" column
  col_bhis        TEXT;  -- "BHIS Feasibility" column
  col_notes       TEXT;  -- "Belize Notes" column
  max_sort        INT;
BEGIN
  -- 1. Look up tracker
  SELECT id, columns, created_by
  INTO hearts_id, hearts_cols, hearts_creator
  FROM trackers
  WHERE name = 'HEARTS - Core Indicators'
  LIMIT 1;

  IF hearts_id IS NULL THEN
    RAISE EXCEPTION 'Tracker "HEARTS - Core Indicators" not found';
  END IF;

  -- 2. Extract all 11 column UUIDs by name
  SELECT elem->>'id' INTO col_id     FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'ID';
  SELECT elem->>'id' INTO col_name   FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Indicator Name';
  SELECT elem->>'id' INTO col_cat    FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Category';
  SELECT elem->>'id' INTO col_level  FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Monitoring Level';
  SELECT elem->>'id' INTO col_def    FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Definition';
  SELECT elem->>'id' INTO col_num    FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Numerator / Method';
  SELECT elem->>'id' INTO col_denom  FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Denominator';
  SELECT elem->>'id' INTO col_source FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Data Source';
  SELECT elem->>'id' INTO col_freq   FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Frequency';
  SELECT elem->>'id' INTO col_bhis   FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'BHIS Relevance';
  SELECT elem->>'id' INTO col_notes  FROM jsonb_array_elements(hearts_cols) AS elem WHERE elem->>'name' = 'Belize Notes';

  -- 3. Get current max sort_order to append after existing rows
  SELECT COALESCE(MAX(sort_order), -1) INTO max_sort
  FROM tracker_rows
  WHERE tracker_id = hearts_id;

  -- 4. Insert H-4 (only if not already present)
  IF NOT EXISTS (
    SELECT 1 FROM tracker_rows
    WHERE tracker_id = hearts_id AND cells->>col_id = 'H-4'
  ) THEN
    INSERT INTO tracker_rows (tracker_id, cells, sort_order, created_by)
    VALUES (
      hearts_id,
      jsonb_build_object(
        col_id,     'H-4',
        col_name,   'Hypertension control in the population',
        col_cat,    'Core Indicator',
        col_level,  'Population',
        col_def,    'Proportion of all hypertensive people with controlled BP in the population.',
        col_num,    'A = Survey respondents with SBP <140 and DBP <90 who are treated or diagnosed',
        col_denom,  'B = Respondents with SBP >=140 or DBP >=90 OR currently treated for hypertension',
        col_source, 'Population-based sample survey (STEPS)',
        col_freq,   'Every 3-5 years',
        col_bhis,   'None',
        col_notes,  'Survey-dependent; STEPS currency unclear for Belize'
      ),
      max_sort + 1,
      hearts_creator
    );
    max_sort := max_sort + 1;
    RAISE NOTICE 'Restored row H-4';
  ELSE
    RAISE NOTICE 'Row H-4 already exists — skipped';
  END IF;

  -- 5. Insert H-5 (only if not already present)
  IF NOT EXISTS (
    SELECT 1 FROM tracker_rows
    WHERE tracker_id = hearts_id AND cells->>col_id = 'H-5'
  ) THEN
    INSERT INTO tracker_rows (tracker_id, cells, sort_order, created_by)
    VALUES (
      hearts_id,
      jsonb_build_object(
        col_id,     'H-5',
        col_name,   'Proportion of eligible persons receiving drug therapy and counselling (incl. glycaemic control)',
        col_cat,    'Core Indicator',
        col_level,  'Population',
        col_def,    'Percentage of eligible persons (aged >=40, 10-year CVD risk >=30% or existing CVD) receiving drug therapy and counselling.',
        col_num,    'A = Eligible survey participants receiving drug therapy and counselling',
        col_denom,  'B = Total eligible participants (aged >=40, CVD risk >=30% or existing CVD)',
        col_source, 'Population-based sample survey (STEPS)',
        col_freq,   'Every 5 years',
        col_bhis,   'None',
        col_notes,  'Survey-dependent; target 5% increase per year'
      ),
      max_sort + 1,
      hearts_creator
    );
    RAISE NOTICE 'Restored row H-5';
  ELSE
    RAISE NOTICE 'Row H-5 already exists — skipped';
  END IF;

  -- 6. Renumber sort_order (0-based, ordered by current sort_order)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 AS new_sort
    FROM tracker_rows
    WHERE tracker_id = hearts_id
  )
  UPDATE tracker_rows
  SET sort_order = ranked.new_sort
  FROM ranked
  WHERE tracker_rows.id = ranked.id;

  RAISE NOTICE 'HEARTS - Core Indicators now has % rows',
    (SELECT COUNT(*) FROM tracker_rows WHERE tracker_id = hearts_id);
END $$;

COMMIT;
