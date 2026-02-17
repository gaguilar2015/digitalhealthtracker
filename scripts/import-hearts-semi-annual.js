#!/usr/bin/env node
/**
 * Import "HEARTS Semi-Annual Fields" sheet from NCD Indicator Catalog
 * into the existing "NCD Indicators" tracker group in Supabase.
 *
 * Usage:
 *   node scripts/import-hearts-semi-annual.js > /tmp/import-hearts-semi-annual.sql
 *
 * Reads: .../infolead/domains/ncds/analytics/NCD_Indicator_Catalog.xlsx
 * Outputs: SQL INSERT statements to stdout
 */

import XLSX from 'xlsx';
import crypto from 'crypto';

const EXCEL_PATH = '/Users/gianaguilar/Documents/GitHub/digitalhealthtracker/files/NCD_Indicator_Catalog2.xlsx';
const SHEET_NAME = 'HEARTS Semi-Annual Fields';

// ── Color palettes ──────────────────────────────────────────────────────────
const SELECT_OPTION_COLORS = [
  { bg: '#DBEAFE', text: '#1E40AF' },  // blue
  { bg: '#D1FAE5', text: '#065F46' },  // green
  { bg: '#FEF3C7', text: '#92400E' },  // amber
  { bg: '#FEE2E2', text: '#991B1B' },  // red
  { bg: '#EDE9FE', text: '#5B21B6' },  // violet
  { bg: '#FCE7F3', text: '#9D174D' },  // pink
  { bg: '#E0E7FF', text: '#3730A3' },  // indigo
  { bg: '#F3F4F6', text: '#374151' },  // gray
  { bg: '#CCFBF1', text: '#115E59' },  // teal
  { bg: '#FED7AA', text: '#9A3412' },  // orange
];

const BHIS_OPTION_STYLES = {
  'High':   { backgroundColor: '#D1FAE5', textColor: '#065F46' },
  'Medium': { backgroundColor: '#FEF3C7', textColor: '#92400E' },
  'Low':    { backgroundColor: '#FEE2E2', textColor: '#991B1B' },
  'None':   { backgroundColor: '#F3F4F6', textColor: '#374151' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID();
}

function escapeSql(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim();
  if (!s) return null;
  return s.replace(/'/g, "''");
}

function makeSelectColumn(id, name, width, options, optionStyles) {
  return { id, name, type: 'select', width, options, optionStyles };
}

function rotateOptionStyles(options) {
  const styles = {};
  options.forEach((opt, i) => {
    const color = SELECT_OPTION_COLORS[i % SELECT_OPTION_COLORS.length];
    styles[opt] = { backgroundColor: color.bg, textColor: color.text };
  });
  return styles;
}

function fixedOptionStyles(options, styleMap) {
  const styles = {};
  for (const opt of options) {
    if (styleMap[opt]) {
      styles[opt] = styleMap[opt];
    }
  }
  return styles;
}

// ── Column definitions ──────────────────────────────────────────────────────

function heartsSemiAnnualColumns() {
  const cols = [];

  // 1. ID
  cols.push({ id: uuid(), name: 'ID', type: 'text', width: 80,
    defaultStyle: { textAlign: 'center', bold: true } });

  // 2. Field Name
  cols.push({ id: uuid(), name: 'Field Name', type: 'text', width: 320,
    defaultStyle: { overflow: 'wrap' } });

  // 3. Section (11 options)
  const sectionOptions = [
    'Education & Training', 'Health Center Characteristics', 'Team-Based Care',
    'Clinical Pathway', 'Coverage', 'Health Team', 'Control',
    'Blood Pressure Devices', 'M&E System', 'Other', 'Quality'
  ];
  cols.push(makeSelectColumn(uuid(), 'Section', 180, sectionOptions,
    rotateOptionStyles(sectionOptions)));

  // 4. Sub-Section (22 options)
  const subSectionOptions = [
    'BP Certification', 'QI Certification', 'Staffing', 'Follow-up',
    'BP Measurement', 'Treatment Protocol', 'BP Control', 'Demographics',
    'Identification', 'Registration', 'Equipment', 'Epidemiology',
    'Location', 'Assessment', 'Data Quality', 'Estimation',
    'Infrastructure', 'Performance', 'Pharmacy', 'Population',
    'Programme', 'Treatment Intensification'
  ];
  cols.push(makeSelectColumn(uuid(), 'Sub-Section', 160, subSectionOptions,
    rotateOptionStyles(subSectionOptions)));

  // 5. Data Type (11 options) — note: en-dash in "Score (0–21)" matches Excel data
  const dataTypeOptions = [
    'Integer', 'Dropdown list (Yes/No)', 'Dropdown list',
    'Percentage (calculated)', 'Automatic calculation', 'Text',
    'Date (dd/mm/yyyy)', 'Percentage', 'Score (0\u201321)',
    'Text (non-editable)', 'Text / alphanumeric'
  ];
  cols.push(makeSelectColumn(uuid(), 'Data Type', 180, dataTypeOptions,
    rotateOptionStyles(dataTypeOptions)));

  // 6. Description
  cols.push({ id: uuid(), name: 'Description', type: 'text', width: 300,
    defaultStyle: { overflow: 'wrap' } });

  // 7. Valid Values / Dropdown Options
  cols.push({ id: uuid(), name: 'Valid Values / Dropdown Options', type: 'text', width: 250,
    defaultStyle: { overflow: 'wrap' } });

  // 8. Auto-Calculated (2 options)
  const autoCalcOptions = ['Yes', 'No'];
  const autoCalcStyles = {
    'Yes': { backgroundColor: '#D1FAE5', textColor: '#065F46' },
    'No':  { backgroundColor: '#F3F4F6', textColor: '#374151' },
  };
  cols.push(makeSelectColumn(uuid(), 'Auto-Calculated', 120, autoCalcOptions, autoCalcStyles));

  // 9. BHIS Feasibility (4 options — same palette as other NCD trackers)
  const bhisOptions = ['High', 'Medium', 'Low', 'None'];
  cols.push(makeSelectColumn(uuid(), 'BHIS Feasibility', 130, bhisOptions,
    fixedOptionStyles(bhisOptions, BHIS_OPTION_STYLES)));

  // 10. Belize Notes
  cols.push({ id: uuid(), name: 'Belize Notes', type: 'text', width: 200,
    defaultStyle: { overflow: 'wrap' } });

  return cols;
}

// ── Header mapping (Excel column order → column names) ──────────────────────
const HEADER_NAMES = [
  'ID', 'Field Name', 'Section', 'Sub-Section', 'Data Type',
  'Description', 'Valid Values / Dropdown Options', 'Auto-Calculated',
  'BHIS Feasibility', 'Belize Notes'
];

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    console.error(`Sheet "${SHEET_NAME}" not found. Available sheets:`, wb.SheetNames);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const dataRows = rows.slice(1); // skip header

  const columns = heartsSemiAnnualColumns();

  // Build column name → column id mapping
  const colNameToId = {};
  for (const col of columns) {
    colNameToId[col.name] = col.id;
  }

  // Clean columns for JSONB (remove undefined values)
  const cleanColumns = columns.map(c => {
    const clean = { id: c.id, name: c.name, type: c.type };
    if (c.width) clean.width = c.width;
    if (c.options) clean.options = c.options;
    if (c.defaultStyle) clean.defaultStyle = c.defaultStyle;
    if (c.optionStyles && Object.keys(c.optionStyles).length > 0) clean.optionStyles = c.optionStyles;
    return clean;
  });

  const sql = [];

  sql.push('-- HEARTS Semi-Annual Fields Import');
  sql.push('-- Generated: ' + new Date().toISOString());
  sql.push('BEGIN;');
  sql.push('');
  sql.push("DO $$");
  sql.push("DECLARE");
  sql.push("  admin_id UUID;");
  sql.push("  group_id UUID;");
  sql.push("  tracker_id UUID;");
  sql.push("BEGIN");

  // Look up admin user
  sql.push("  SELECT id INTO admin_id FROM team_members WHERE permission_level = 'admin' LIMIT 1;");
  sql.push("  IF admin_id IS NULL THEN");
  sql.push("    RAISE EXCEPTION 'No admin user found in team_members';");
  sql.push("  END IF;");
  sql.push('');

  // Look up existing NCD Indicators group
  sql.push("  -- Look up existing NCD Indicators group");
  sql.push("  SELECT id INTO group_id FROM tracker_groups WHERE name = 'NCD Indicators' LIMIT 1;");
  sql.push("  IF group_id IS NULL THEN");
  sql.push("    RAISE EXCEPTION 'NCD Indicators tracker group not found — run import-ncd-trackers.js first';");
  sql.push("  END IF;");
  sql.push('');

  // Insert tracker
  sql.push("  -- Tracker: HEARTS Semi-Annual Fields");
  sql.push("  INSERT INTO trackers (id, name, description, icon, columns, sort_order, group_id, created_by)");
  sql.push("  VALUES (");
  sql.push("    gen_random_uuid(),");
  sql.push("    'HEARTS Semi-Annual Fields',");
  sql.push("    '58 field definitions for the WHO HEARTS semi-annual health center reporting form',");
  sql.push("    'HeartPulse',");
  sql.push(`    '${JSON.stringify(cleanColumns).replace(/'/g, "''")}'::jsonb,`);
  sql.push("    4,");
  sql.push("    group_id,");
  sql.push("    admin_id");
  sql.push("  ) RETURNING id INTO tracker_id;");
  sql.push('');

  // Insert rows
  sql.push(`  -- HEARTS Semi-Annual Fields: ${dataRows.length} rows`);
  sql.push("  INSERT INTO tracker_rows (tracker_id, cells, sort_order, created_by) VALUES");

  const rowValues = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const cells = {};

    for (let j = 0; j < HEADER_NAMES.length; j++) {
      const headerName = HEADER_NAMES[j];
      const colId = colNameToId[headerName];
      if (!colId) continue;

      const val = row[j];
      if (val !== null && val !== undefined && val !== '') {
        cells[colId] = String(val).trim();
      }
    }

    const cellsJson = JSON.stringify(cells).replace(/'/g, "''");
    rowValues.push(`    (tracker_id, '${cellsJson}'::jsonb, ${i}, admin_id)`);
  }

  sql.push(rowValues.join(',\n') + ';');
  sql.push('');
  sql.push("END $$;");
  sql.push('');
  sql.push('COMMIT;');

  process.stdout.write(sql.join('\n') + '\n');
}

main();
