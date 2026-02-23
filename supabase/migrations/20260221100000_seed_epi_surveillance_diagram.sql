-- ============================================================
-- Seed: EPI Surveillance Data Flow Diagram
-- Populates a diagram matching the Belize communicable disease
-- surveillance workflow (Point of Care → Central Analysis).
-- Uses the first admin team member as creator.
-- ============================================================

DO $$
DECLARE
  v_creator_id UUID;
  v_diagram_id UUID;
BEGIN
  -- Pick the first active admin as diagram creator
  SELECT id INTO v_creator_id
  FROM team_members
  WHERE permission_level = 'admin' AND is_active = true
  ORDER BY created_at
  LIMIT 1;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'No active admin team member found — cannot seed diagram';
  END IF;

  v_diagram_id := gen_random_uuid();

  INSERT INTO diagrams (id, name, description, icon, sort_order, created_by, flow_data, legend)
  VALUES (
    v_diagram_id,
    'EPI Surveillance Data Flow',
    'End-to-end data flow for communicable disease surveillance — from point of care (public and private facilities) through data entry, staging, cross-referencing, and weekly reporting by the Epi Unit.',
    'Activity',
    0,
    v_creator_id,
    '{
      "viewport": { "x": 80, "y": 30, "zoom": 0.75 },
      "nodes": [

        {
          "id": "poc-group",
          "type": "group",
          "position": { "x": 0, "y": 0 },
          "style": { "width": 1020, "height": 140 },
          "data": {
            "label": "Point of Care",
            "nodeType": "group",
            "color": "#FFFBEB"
          }
        },
        {
          "id": "public-facilities",
          "type": "system",
          "position": { "x": 80, "y": 40 },
          "style": { "width": 200 },
          "data": {
            "label": "Public Facilities",
            "description": "(Hospitals, Clinics)",
            "nodeType": "system",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },
        {
          "id": "private-facilities",
          "type": "system",
          "position": { "x": 700, "y": 40 },
          "style": { "width": 200 },
          "data": {
            "label": "Private Facilities",
            "description": "(Clinics, Labs)",
            "nodeType": "system",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },

        {
          "id": "bhis-group",
          "type": "group",
          "position": { "x": -20, "y": 180 },
          "style": { "width": 460, "height": 280 },
          "data": {
            "label": "BHIS",
            "nodeType": "group",
            "color": "#F5F3FF"
          }
        },
        {
          "id": "bhis-diagnoses",
          "type": "system",
          "position": { "x": 30, "y": 240 },
          "style": { "width": 180 },
          "data": {
            "label": "BHIS Diagnoses Module",
            "nodeType": "system",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },
        {
          "id": "bhis-lab",
          "type": "system",
          "position": { "x": 260, "y": 240 },
          "style": { "width": 150 },
          "data": {
            "label": "BHIS Lab Module",
            "nodeType": "system",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },
        {
          "id": "disease-alert",
          "type": "system",
          "position": { "x": 30, "y": 360 },
          "style": { "width": 180 },
          "data": {
            "label": "Disease Alert System",
            "description": "(Down)",
            "nodeType": "system",
            "color": "#FEF3C7",
            "borderColor": "#F59E0B"
          }
        },
        {
          "id": "patient-ehr",
          "type": "system",
          "position": { "x": 260, "y": 360 },
          "style": { "width": 150 },
          "data": {
            "label": "Patient EHR",
            "nodeType": "system",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },

        {
          "id": "electronic-cd-form",
          "type": "form",
          "position": { "x": 560, "y": 220 },
          "style": { "width": 180 },
          "data": {
            "label": "Electronic CD Form",
            "description": "(Microsoft Form)",
            "nodeType": "form",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },
        {
          "id": "paper-forms",
          "type": "document",
          "position": { "x": 830, "y": 220 },
          "style": { "width": 160 },
          "data": {
            "label": "Paper Forms/Books",
            "nodeType": "document",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },
        {
          "id": "google-sheets",
          "type": "system",
          "position": { "x": 580, "y": 380 },
          "style": { "width": 170 },
          "data": {
            "label": "Google Sheets",
            "description": "(Myra''s Drive)",
            "nodeType": "system",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },

        {
          "id": "non-bhis-tool",
          "type": "system",
          "position": { "x": 680, "y": 540 },
          "style": { "width": 200 },
          "data": {
            "label": "Non-BHIS Tool",
            "description": "(Mr. Chun)",
            "nodeType": "system",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },

        {
          "id": "epi-staging-db",
          "type": "database",
          "position": { "x": 100, "y": 560 },
          "style": { "width": 140, "height": 90 },
          "data": {
            "label": "EPI Staging DB",
            "nodeType": "database",
            "color": "#F0FDF4",
            "borderColor": "#86EFAC"
          }
        },

        {
          "id": "central-analysis-group",
          "type": "group",
          "position": { "x": 250, "y": 720 },
          "style": { "width": 440, "height": 380 },
          "data": {
            "label": "Central Analysis (Epi Unit)",
            "nodeType": "group",
            "color": "#FFFBEB"
          }
        },
        {
          "id": "manual-cross-ref",
          "type": "process",
          "position": { "x": 330, "y": 790 },
          "style": { "width": 240 },
          "data": {
            "label": "Manual Cross-Reference\nBHIS + Non-BHIS",
            "nodeType": "process",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },
        {
          "id": "endemic-channel",
          "type": "process",
          "position": { "x": 360, "y": 900 },
          "style": { "width": 190 },
          "data": {
            "label": "Endemic Channel\nProduction",
            "nodeType": "process",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        },
        {
          "id": "weekly-report",
          "type": "document",
          "position": { "x": 340, "y": 1010 },
          "style": { "width": 220 },
          "data": {
            "label": "Weekly Surveillance\nReport",
            "nodeType": "document",
            "color": "#DBEAFE",
            "borderColor": "#93C5FD"
          }
        }
      ],
      "edges": [
        {
          "id": "e-pub-diag",
          "source": "public-facilities",
          "target": "bhis-diagnoses",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "Clinical Encounter" }
        },
        {
          "id": "e-pub-lab",
          "source": "public-facilities",
          "target": "bhis-lab",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "Lab Encounter" }
        },
        {
          "id": "e-diag-alert",
          "source": "bhis-diagnoses",
          "target": "disease-alert",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "" }
        },
        {
          "id": "e-lab-ehr",
          "source": "bhis-lab",
          "target": "patient-ehr",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "" }
        },
        {
          "id": "e-priv-cd",
          "source": "private-facilities",
          "target": "electronic-cd-form",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "Manual Entry" }
        },
        {
          "id": "e-priv-paper",
          "source": "private-facilities",
          "target": "paper-forms",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "Manual Entry" }
        },
        {
          "id": "e-cd-gsheets",
          "source": "electronic-cd-form",
          "target": "google-sheets",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "Automated Entry" }
        },
        {
          "id": "e-gsheets-nonbhis",
          "source": "google-sheets",
          "target": "non-bhis-tool",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "Manual Entry (Automated in Czl)" }
        },
        {
          "id": "e-paper-nonbhis",
          "source": "paper-forms",
          "target": "non-bhis-tool",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "Manual Entry" }
        },
        {
          "id": "e-bhis-staging",
          "source": "bhis-diagnoses",
          "target": "epi-staging-db",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "EPI ETL Process" }
        },
        {
          "id": "e-staging-crossref",
          "source": "epi-staging-db",
          "target": "manual-cross-ref",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "" }
        },
        {
          "id": "e-nonbhis-crossref",
          "source": "non-bhis-tool",
          "target": "manual-cross-ref",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "" }
        },
        {
          "id": "e-crossref-endemic",
          "source": "manual-cross-ref",
          "target": "endemic-channel",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "" }
        },
        {
          "id": "e-endemic-report",
          "source": "endemic-channel",
          "target": "weekly-report",
          "type": "labeled",
          "markerEnd": { "type": "arrowclosed", "width": 16, "height": 16 },
          "data": { "label": "" }
        }
      ]
    }'::jsonb,
    '[
      { "id": "leg-bhis", "label": "BHIS System", "color": "#93C5FD", "description": "Government health information system modules" },
      { "id": "leg-nonbhis", "label": "Non-BHIS / External", "color": "#DBEAFE", "description": "Tools and forms outside BHIS" },
      { "id": "leg-down", "label": "Down / Inactive", "color": "#F59E0B", "description": "System currently unavailable" },
      { "id": "leg-output", "label": "Analysis / Output", "color": "#86EFAC", "description": "Staging databases and final reports" }
    ]'::jsonb
  );

END $$;
