-- ============================================================================
-- Seed Script: DQA Workplan for "Data Quality Assessment & Improvement" Workstream
-- Source: files/DQA_WorkPlan_BHIS_v2.xlsx
-- Project Period: January 19 - December 27, 2026
--
-- Run via: supabase db execute --linked < supabase/seed_dqa_workplan.sql
--   or paste into Supabase SQL Editor (runs as db owner, bypasses RLS)
-- ============================================================================

DO $$
DECLARE
    ws_id UUID;
    -- Activity IDs (numbered groups from the workplan)
    a_1_1 UUID;
    a_1_3 UUID;
    a_1_4 UUID;
    a_1_5 UUID;
    a_2_1 UUID;
    a_2_2 UUID;
    a_2_4 UUID;
    a_2_5 UUID;
    a_3_1 UUID;
    a_3_2 UUID;
    a_3_3 UUID;
    a_3_4 UUID;
    a_4_1 UUID;
    a_4_2 UUID;
    a_4_3 UUID;
    a_4_4 UUID;
    a_4_5 UUID;
    a_5_1 UUID;
    a_5_2 UUID;
    a_5_3 UUID;
    a_5_5 UUID;
BEGIN
    -- ========================================
    -- Look up existing workstream
    -- ========================================
    SELECT id INTO ws_id
    FROM workstreams
    WHERE name ILIKE '%Data Quality Assessment%'
    LIMIT 1;

    IF ws_id IS NULL THEN
        RAISE EXCEPTION 'Workstream "Data Quality Assessment & Improvement" not found. Please create it first.';
    END IF;

    RAISE NOTICE 'Found workstream ID: %', ws_id;

    -- ========================================
    -- ACTIVITIES (numbered groups: 1.1, 1.3, 1.4, etc.)
    -- No activity groups used — activities sit directly under the workstream
    -- ========================================

    -- Phase 1: Preparation and Scoping (Jan 19 - Feb 22)

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('1.1', 'Scoping and Methodology Development', ws_id, '2026-01-19', '2026-02-22', 'not_started',
            'Responsible: IL (Infostructure Lead). Phase 1: Preparation and Scoping.', 1)
    RETURNING id INTO a_1_1;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('1.3', 'Data Requirements and Access', ws_id, '2026-02-09', '2026-02-22', 'not_started',
            'Responsible: IL + DA. Phase 1: Preparation and Scoping.', 2)
    RETURNING id INTO a_1_3;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('1.4', 'IS4H Situation Analysis', ws_id, '2026-01-19', '2026-02-01', 'not_started',
            'Responsible: IL + DA. Phase 1: Preparation and Scoping.', 3)
    RETURNING id INTO a_1_4;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('1.5', 'Information Needs Assessment - Initial Scoping', ws_id, '2026-01-26', '2026-02-08', 'not_started',
            'Responsible: IL + DA. Phase 1: Preparation and Scoping.', 4)
    RETURNING id INTO a_1_5;

    -- Phase 2: Desk Review (Feb 23 - Mar 29)

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('2.1', 'Data Extraction and Preparation', ws_id, '2026-02-23', '2026-02-28', 'not_started',
            'Responsible: BHIS IT + IL + DA. Phase 2: Desk Review. Duration: 1 week.', 5)
    RETURNING id INTO a_2_1;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('2.2', 'Data Quality Four-Dimensions Desk Review', ws_id, '2026-03-01', '2026-03-14', 'not_started',
            'Responsible: IL + DA. Phase 2: Desk Review. Duration: 2 weeks.', 6)
    RETURNING id INTO a_2_2;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('2.4', 'Health Data Workflow Mapping', ws_id, '2026-02-23', '2026-02-28', 'not_started',
            'Responsible: IL + DA + IT. Phase 2: Desk Review. Duration: 1 week.', 7)
    RETURNING id INTO a_2_4;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('2.5', 'Reporting and Validation', ws_id, '2026-03-15', '2026-03-29', 'not_started',
            'Responsible: IL + DA + DL. Phase 2: Desk Review. Duration: 2 weeks.', 8)
    RETURNING id INTO a_2_5;

    -- Phase 3: Site Assessment (Mar 30 - Jun 14)

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('3.1', 'Tool Development', ws_id, '2026-03-30', '2026-04-12', 'not_started',
            'Responsible: IL. Phase 3: Site Assessment. Duration: 2 weeks.', 9)
    RETURNING id INTO a_3_1;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('3.2', 'Data Verification', ws_id, '2026-04-13', '2026-05-10', 'not_started',
            'Responsible: IL + DA + MOHW. Phase 3: Site Assessment. Duration: 4 weeks.', 10)
    RETURNING id INTO a_3_2;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('3.3', 'System Assessment', ws_id, '2026-05-11', '2026-06-07', 'not_started',
            'Responsible: IL. Phase 3: Site Assessment. Duration: 4 weeks.', 11)
    RETURNING id INTO a_3_3;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('3.4', 'Information Needs Report Compilation', ws_id, '2026-06-01', '2026-06-14', 'not_started',
            'Responsible: IL. Phase 3: Site Assessment.', 12)
    RETURNING id INTO a_3_4;

    -- Phase 4: Analysis and Planning (Jun 15 - Oct 4)

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('4.1', 'Comprehensive Data Analysis', ws_id, '2026-06-15', '2026-07-12', 'not_started',
            'Responsible: IL + DA. Phase 4: Analysis and Planning. Duration: 4 weeks.', 13)
    RETURNING id INTO a_4_1;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('4.2', 'DQA Report Development', ws_id, '2026-07-13', '2026-08-09', 'not_started',
            'Responsible: IL. Phase 4: Analysis and Planning. Duration: 4 weeks.', 14)
    RETURNING id INTO a_4_2;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('4.3', 'DQIP Development', ws_id, '2026-08-10', '2026-09-06', 'not_started',
            'Responsible: IL + DA. Phase 4: Analysis and Planning. Duration: 4 weeks.', 15)
    RETURNING id INTO a_4_3;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('4.4', 'Stakeholder Consultations and Validation', ws_id, '2026-09-07', '2026-09-27', 'not_started',
            'Responsible: IL + DA + DL + MOHW + IDB. Phase 4: Analysis and Planning. Duration: 3 weeks.', 16)
    RETURNING id INTO a_4_4;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('4.5', 'Report Finalization', ws_id, '2026-09-28', '2026-10-04', 'not_started',
            'Responsible: IL. Phase 4: Analysis and Planning. Duration: 1 week.', 17)
    RETURNING id INTO a_4_5;

    -- Phase 5: Implementation Support (Oct 5 - Dec 27)

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('5.1', 'Standard Operating Procedures Development', ws_id, '2026-10-05', '2026-11-01', 'not_started',
            'Responsible: IL. Phase 5: Implementation Support. Duration: 4 weeks.', 18)
    RETURNING id INTO a_5_1;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('5.2', 'Monitoring and Evaluation Framework', ws_id, '2026-11-02', '2026-11-22', 'not_started',
            'Responsible: IL + DA. Phase 5: Implementation Support. Duration: 3 weeks.', 19)
    RETURNING id INTO a_5_2;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('5.3', 'Data Quality Dashboard and Reporting Specifications', ws_id, '2026-11-23', '2026-12-13', 'not_started',
            'Responsible: IL + DA + IT. Phase 5: Implementation Support. Duration: 3 weeks.', 20)
    RETURNING id INTO a_5_3;

    INSERT INTO activities (code, name, workstream_id, start_date, end_date, status, notes, sort_order)
    VALUES ('5.5', 'Data Quality Training Plan', ws_id, '2026-12-14', '2026-12-27', 'not_started',
            'Responsible: IL + DA. Phase 5: Implementation Support. Duration: 2 weeks.', 21)
    RETURNING id INTO a_5_5;

    RAISE NOTICE 'Inserted 21 activities';

    -- ========================================
    -- TASKS (individual items: 1.1.1, 1.1.2, etc.)
    -- ========================================

    -- Tasks under Activity 1.1 (Scoping and Methodology Development)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('1.1.1', 'Identify and map all relevant stakeholders', a_1_1, '2026-01-19', '2026-01-25', 'not_started', 1),
    ('1.1.2', 'Review and adapt WHO DQR methodology for Belize context', a_1_1, '2026-01-26', '2026-02-08', 'not_started', 2),
    ('1.1.3', 'Draft core indicators and priority health data areas', a_1_1, '2026-02-02', '2026-02-08', 'not_started', 3),
    ('1.1.4', 'Alignment Sessions with key stakeholders (IDB, MOHW)', a_1_1, '2026-02-02', '2026-02-08', 'not_started', 4),
    ('1.1.5', 'Confirm facility list for site assessment (8-10 facilities)', a_1_1, '2026-02-02', '2026-02-08', 'not_started', 5),
    ('1.1.6', 'Develop DQ Assessment Plan', a_1_1, '2026-02-09', '2026-02-22', 'not_started', 6),
    ('1.1.7', 'Validation Session of DQA Methodology and Plan', a_1_1, '2026-02-15', '2026-02-22', 'not_started', 7);

    -- Tasks under Activity 1.3 (Data Requirements and Access)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('1.3.1', 'Document data extraction requirements from BHIS', a_1_3, '2026-02-09', '2026-02-22', 'not_started', 1),
    ('1.3.2', 'Establish data access protocols and confidentiality agreements', a_1_3, '2026-02-15', '2026-02-22', 'not_started', 2);

    -- Tasks under Activity 1.4 (IS4H Situation Analysis)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('1.4.1', 'Develop inventory of existing information products', a_1_4, '2026-01-19', '2026-02-01', 'not_started', 1),
    ('1.4.2', 'Develop inventory of data tools and applications', a_1_4, '2026-01-19', '2026-02-01', 'not_started', 2),
    ('1.4.4', 'Map the IT entity/unit (location, functions, reporting lines)', a_1_4, '2026-01-19', '2026-02-01', 'not_started', 3);

    -- Tasks under Activity 1.5 (Information Needs Assessment - Initial Scoping)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('1.5.1', 'Develop Information Needs Assessment questionnaire/interview guide', a_1_5, '2026-01-26', '2026-02-08', 'not_started', 1),
    ('1.5.2', 'Identify key informants for information needs interviews', a_1_5, '2026-02-02', '2026-02-08', 'not_started', 2);

    -- Tasks under Activity 2.1 (Data Extraction and Preparation)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('2.1.1', 'Extract core indicator data from BHIS for selected time period', a_2_1, '2026-02-23', '2026-02-28', 'not_started', 1),
    ('2.1.2', 'Prepare and adapt WHO desk review tool', a_2_1, '2026-02-23', '2026-02-28', 'not_started', 2);

    -- Tasks under Activity 2.2 (Data Quality Four-Dimensions Desk Review)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('2.2.1', 'Analyze data reporting completeness and data element completeness', a_2_2, '2026-03-01', '2026-03-07', 'not_started', 1),
    ('2.2.2', 'Assess timeliness of reporting at various levels', a_2_2, '2026-03-01', '2026-03-07', 'not_started', 2),
    ('2.2.3', 'Assess internal (logical, outliers) and temporal consistency', a_2_2, '2026-03-08', '2026-03-14', 'not_started', 3),
    ('2.2.4', 'Assess external consistency by comparing with data sources', a_2_2, '2026-03-08', '2026-03-14', 'not_started', 4);

    -- Tasks under Activity 2.4 (Health Data Workflow Mapping)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('2.4.4', 'Document current standards adoption status (ICD-10, HL7)', a_2_4, '2026-02-23', '2026-02-28', 'not_started', 1),
    ('2.4.5', 'Assess CDEP readiness and document BHIS-CDEP data exchange requirements', a_2_4, '2026-02-23', '2026-02-28', 'not_started', 2);

    -- Tasks under Activity 2.5 (Reporting and Validation)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('2.5.1', 'Compile Desk Review Report with baseline data quality scorecard', a_2_5, '2026-03-15', '2026-03-22', 'not_started', 1),
    ('2.5.3', 'Present preliminary findings to MOHW stakeholders', a_2_5, '2026-03-22', '2026-03-29', 'not_started', 2),
    ('2.5.4', 'Finalize IS4H Situation Analysis Report', a_2_5, '2026-03-22', '2026-03-29', 'not_started', 3);

    -- Tasks under Activity 3.1 (Tool Development)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('3.1.1', 'Develop data verification forms for priority indicators', a_3_1, '2026-03-30', '2026-04-05', 'not_started', 1),
    ('3.1.2', 'Create system assessment questionnaire', a_3_1, '2026-04-06', '2026-04-10', 'not_started', 2),
    ('3.1.3', 'Pilot test tools and finalize', a_3_1, '2026-04-10', '2026-04-12', 'not_started', 3);

    -- Tasks under Activity 3.2 (Data Verification)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('3.2.1', 'Notify selected facilities and coordinate visit logistics', a_3_2, '2026-04-13', '2026-04-19', 'not_started', 1),
    ('3.2.2', 'Conduct site visits to Selected Facilities (incl. info needs interviews)', a_3_2, '2026-04-20', '2026-05-03', 'not_started', 2),
    ('3.2.3', 'Calculate verification factors and compile data verification findings', a_3_2, '2026-05-04', '2026-05-10', 'not_started', 3);

    -- Tasks under Activity 3.3 (System Assessment)
    INSERT INTO tasks (code, name, activity_id, start_date, end_date, status, sort_order) VALUES
    ('3.3.1', 'Analyze system assessment data from facility visits', a_3_3, '2026-05-11', '2026-05-24', 'not_started', 1),
    ('3.3.2', 'Conduct follow-up interviews with facility data managers', a_3_3, '2026-05-25', '2026-05-31', 'not_started', 2),
    ('3.3.4', 'Compile System Assessment Report', a_3_3, '2026-06-01', '2026-06-07', 'not_started', 3);

    -- No tasks under Activity 3.4 (Information Needs Report Compilation) — it's a standalone activity
    -- No tasks under Phase 4 activities (4.1-4.5) — they are standalone activities without sub-items
    -- No tasks under Phase 5 activities (5.1-5.5) — they are standalone activities without sub-items

    RAISE NOTICE 'Inserted 34 tasks';

    -- ========================================
    -- DELIVERABLES (from Deliverables Tracker sheet)
    -- ========================================

    INSERT INTO deliverables (name, description, workstream_id, due_date, status, sort_order) VALUES
    -- Phase 1 deliverables
    ('Data Quality Assessment Protocol',
     'Format: Document (Word). Phase 1: Preparation and Scoping. Comprehensive protocol for the DQA methodology and assessment plan.',
     ws_id, '2026-02-20', 'not_started', 1),

    ('Data Quality Indicator Selection Matrix',
     'Format: Spreadsheet (Excel). Phase 1: Preparation and Scoping. Matrix of core indicators and priority health data areas.',
     ws_id, '2026-02-08', 'not_started', 2),

    ('Data Access Requirements',
     'Format: Document (Word). Phase 1: Preparation and Scoping. Data extraction requirements and access protocols for BHIS.',
     ws_id, '2026-02-08', 'not_started', 3),

    ('IS4H Situation Analysis Report (Draft)',
     'Format: Report (Word). Phase 1: Preparation and Scoping. Draft analysis of information systems for health landscape.',
     ws_id, '2026-02-15', 'not_started', 4),

    ('Information Needs Assessment Tool',
     'Format: Questionnaire (Word). Phase 1: Preparation and Scoping. Questionnaire/interview guide for information needs assessment.',
     ws_id, '2026-02-08', 'not_started', 5),

    -- Phase 2 deliverables
    ('Desk Review Report',
     'Format: Report (Word + Excel). Phase 2: Desk Review. Comprehensive desk review findings with baseline data quality scorecard.',
     ws_id, '2026-03-29', 'not_started', 6),

    ('Data Quality Scorecard (Baseline)',
     'Format: Spreadsheet (Excel). Phase 2: Desk Review. Baseline scorecard measuring data quality across four dimensions.',
     ws_id, '2026-03-29', 'not_started', 7),

    ('IS4H Situation Analysis Report (Final)',
     'Format: Report (Word + Diagrams). Phase 2: Desk Review. Finalized IS4H situation analysis with workflow diagrams.',
     ws_id, '2026-03-29', 'not_started', 8),

    -- Phase 3 deliverables
    ('Site Assessment Tools',
     'Format: Forms (Word/CSPro). Phase 3: Site Assessment. Data verification forms and system assessment questionnaire.',
     ws_id, '2026-04-12', 'not_started', 9),

    ('Data Verification Report',
     'Format: Report (Word + Excel). Phase 3: Site Assessment. Verification factors and findings from facility site visits.',
     ws_id, '2026-05-10', 'not_started', 10),

    ('System Assessment Report',
     'Format: Report (Word). Phase 3: Site Assessment. Assessment of BHIS system capabilities at facility level.',
     ws_id, '2026-06-07', 'not_started', 11),

    ('Information Needs Assessment Report (Draft)',
     'Format: Report (Word). Phase 3: Site Assessment. Draft report on information needs from stakeholder interviews.',
     ws_id, '2026-06-07', 'not_started', 12),

    -- Phase 4 deliverables
    ('Comprehensive DQA Report',
     'Format: Report (Word + Annexes). Phase 4: Analysis and Planning. Full data quality assessment report integrating all findings.',
     ws_id, '2026-10-04', 'not_started', 13),

    ('Root Cause Analysis',
     'Format: Document (Word). Phase 4: Analysis and Planning. Analysis of root causes for identified data quality issues.',
     ws_id, '2026-09-06', 'not_started', 14),

    ('Data Quality Improvement Plan (DQIP)',
     'Format: Plan (Word + Excel). Phase 4: Analysis and Planning. Actionable improvement plan with prioritized recommendations.',
     ws_id, '2026-10-04', 'not_started', 15),

    ('Information Needs Assessment Report (Final)',
     'Format: Report (Word). Phase 4: Analysis and Planning. Finalized information needs assessment report.',
     ws_id, '2026-10-04', 'not_started', 16),

    -- Phase 5 deliverables
    ('SOPs for Data Quality Assurance',
     'Format: SOPs (Word). Phase 5: Implementation Support. Standard operating procedures for ongoing data quality assurance.',
     ws_id, '2026-11-01', 'not_started', 17),

    ('Training Materials Package',
     'Format: Package (PPT + Word). Phase 5: Implementation Support. Training materials for data quality capacity building.',
     ws_id, '2026-12-13', 'not_started', 18),

    ('M&E Framework for Data Quality',
     'Format: Framework (Word). Phase 5: Implementation Support. Monitoring and evaluation framework for data quality.',
     ws_id, '2026-11-22', 'not_started', 19),

    ('Dashboard Specifications',
     'Format: Specifications (Word). Phase 5: Implementation Support. Technical specifications for data quality dashboard.',
     ws_id, '2026-12-13', 'not_started', 20),

    ('Project Closeout Report',
     'Format: Report (Word). Phase 5: Implementation Support. Final project closeout report summarizing all DQA activities and outcomes.',
     ws_id, '2026-12-27', 'not_started', 21);

    RAISE NOTICE 'Inserted 21 deliverables';
    RAISE NOTICE 'DQA Workplan seed complete: 21 activities, 34 tasks, 21 deliverables';
END $$;
