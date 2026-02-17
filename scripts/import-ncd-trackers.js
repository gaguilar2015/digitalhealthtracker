#!/usr/bin/env node
/**
 * Import NCD Indicator Catalog from Excel into Supabase tracker tables.
 *
 * Usage:
 *   node scripts/import-ncd-trackers.js > /tmp/import-ncd-trackers.sql
 *
 * Reads: /Users/gianaguilar/Documents/GitHub/infolead/domains/ncds/analytics/NCD_Indicator_Catalog.xlsx
 * Outputs: SQL INSERT statements to stdout
 */

import XLSX from 'xlsx';
import crypto from 'crypto';

const EXCEL_PATH = '/Users/gianaguilar/Documents/GitHub/infolead/domains/ncds/analytics/NCD_Indicator_Catalog.xlsx';

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

const TEAL_STYLE = { backgroundColor: '#CCFBF1', textColor: '#115E59' };

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

function toJsonSql(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

function makeSelectColumn(id, name, width, options, optionStyles) {
  return {
    id,
    name,
    type: 'select',
    width,
    options,
    optionStyles,
  };
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

function tealOptionStyles(options) {
  const styles = {};
  for (const opt of options) {
    styles[opt] = { ...TEAL_STYLE };
  }
  return styles;
}

// ── Column definitions per tracker ──────────────────────────────────────────

function whoColumns() {
  const cols = [];

  cols.push({ id: uuid(), name: 'ID', type: 'text', width: 70,
    defaultStyle: { textAlign: 'center', bold: true } });
  cols.push({ id: uuid(), name: 'Indicator Name', type: 'text', width: 320,
    defaultStyle: { overflow: 'wrap' } });

  const domainOptions = [
    'Alcohol Control', 'Clinical Guidelines', 'Health System Capacity',
    'Immunization', 'Mortality Surveillance', 'National Targets', 'Nutrition',
    'Physical Activity', 'Policy & Planning', 'Risk Factor Surveillance', 'Tobacco Control'
  ];
  cols.push(makeSelectColumn(uuid(), 'Domain', 180, domainOptions, rotateOptionStyles(domainOptions)));

  cols.push({ id: uuid(), name: 'Definition', type: 'text', width: 300,
    defaultStyle: { overflow: 'wrap' } });
  cols.push({ id: uuid(), name: 'Data Collection Tool', type: 'text', width: 200,
    defaultStyle: { overflow: 'wrap' } });

  const freqOptions = ['Annual', 'Every 2 years', 'Every 3-4 years', 'Yearly'];
  cols.push(makeSelectColumn(uuid(), 'Frequency', 130, freqOptions, tealOptionStyles(freqOptions)));

  const bhisOptions = ['None', 'Low', 'Medium'];
  cols.push(makeSelectColumn(uuid(), 'BHIS Relevance', 130, bhisOptions,
    fixedOptionStyles(bhisOptions, BHIS_OPTION_STYLES)));

  cols.push({ id: uuid(), name: 'Belize Notes', type: 'text', width: 200,
    defaultStyle: { overflow: 'wrap' } });

  return cols;
}

function heartsColumns() {
  const cols = [];

  cols.push({ id: uuid(), name: 'ID', type: 'text', width: 70,
    defaultStyle: { textAlign: 'center', bold: true } });
  cols.push({ id: uuid(), name: 'Indicator Name', type: 'text', width: 320,
    defaultStyle: { overflow: 'wrap' } });

  const catOptions = ['Core Indicator', 'Semi-Annual / Programmatic', 'CQI Evaluation'];
  const catStyles = {
    'Core Indicator': { backgroundColor: '#DBEAFE', textColor: '#1E40AF' },
    'Semi-Annual / Programmatic': { backgroundColor: '#D1FAE5', textColor: '#065F46' },
    'CQI Evaluation': { backgroundColor: '#FEF3C7', textColor: '#92400E' },
  };
  cols.push(makeSelectColumn(uuid(), 'Category', 180, catOptions, catStyles));

  const lvlOptions = ['Facility', 'Subnational', 'National', 'Population'];
  const lvlStyles = {
    'Facility': { backgroundColor: '#DBEAFE', textColor: '#1E40AF' },
    'Subnational': { backgroundColor: '#D1FAE5', textColor: '#065F46' },
    'National': { backgroundColor: '#FEF3C7', textColor: '#92400E' },
    'Population': { backgroundColor: '#EDE9FE', textColor: '#5B21B6' },
  };
  cols.push(makeSelectColumn(uuid(), 'Monitoring Level', 140, lvlOptions, lvlStyles));

  cols.push({ id: uuid(), name: 'Definition', type: 'text', width: 300,
    defaultStyle: { overflow: 'wrap' } });
  cols.push({ id: uuid(), name: 'Numerator / Method', type: 'text', width: 250,
    defaultStyle: { overflow: 'wrap' } });
  cols.push({ id: uuid(), name: 'Denominator', type: 'text', width: 200,
    defaultStyle: { overflow: 'wrap' } });
  cols.push({ id: uuid(), name: 'Data Source', type: 'text', width: 180,
    defaultStyle: { overflow: 'wrap' } });

  const freqOptions = ['Quarterly', 'Semi-annual', 'Annual', 'Every 3-5 years', 'Every 5 years'];
  cols.push(makeSelectColumn(uuid(), 'Frequency', 130, freqOptions, tealOptionStyles(freqOptions)));

  const bhisOptions = ['High', 'Medium', 'Low', 'None'];
  cols.push(makeSelectColumn(uuid(), 'BHIS Feasibility', 130, bhisOptions,
    fixedOptionStyles(bhisOptions, BHIS_OPTION_STYLES)));

  cols.push({ id: uuid(), name: 'Belize Notes', type: 'text', width: 200,
    defaultStyle: { overflow: 'wrap' } });

  return cols;
}

function diabetesColumns() {
  const cols = [];

  cols.push({ id: uuid(), name: 'ID', type: 'text', width: 80,
    defaultStyle: { textAlign: 'center', bold: true } });
  cols.push({ id: uuid(), name: 'Indicator Name', type: 'text', width: 320,
    defaultStyle: { overflow: 'wrap' } });

  const catOptions = ['Quality of Care', 'Performance', 'Training', 'Intersectoriality'];
  const catStyles = {
    'Quality of Care': { backgroundColor: '#DBEAFE', textColor: '#1E40AF' },
    'Performance': { backgroundColor: '#D1FAE5', textColor: '#065F46' },
    'Training': { backgroundColor: '#FEF3C7', textColor: '#92400E' },
    'Intersectoriality': { backgroundColor: '#EDE9FE', textColor: '#5B21B6' },
  };
  cols.push(makeSelectColumn(uuid(), 'Category', 150, catOptions, catStyles));

  cols.push({ id: uuid(), name: 'Code', type: 'text', width: 80,
    defaultStyle: { textAlign: 'center' } });
  cols.push({ id: uuid(), name: 'Definition', type: 'text', width: 300,
    defaultStyle: { overflow: 'wrap' } });
  cols.push({ id: uuid(), name: 'Target / Goal', type: 'text', width: 200,
    defaultStyle: { overflow: 'wrap' } });
  cols.push({ id: uuid(), name: 'Target Facilities', type: 'text', width: 150,
    defaultStyle: { overflow: 'wrap' } });

  const freqOptions = ['Semi-annual', 'Annual'];
  cols.push(makeSelectColumn(uuid(), 'Frequency', 130, freqOptions, tealOptionStyles(freqOptions)));

  const bhisOptions = ['High', 'Medium', 'Low', 'None'];
  cols.push(makeSelectColumn(uuid(), 'BHIS Feasibility', 130, bhisOptions,
    fixedOptionStyles(bhisOptions, BHIS_OPTION_STYLES)));

  cols.push({ id: uuid(), name: 'Belize Notes', type: 'text', width: 200,
    defaultStyle: { overflow: 'wrap' } });

  return cols;
}

function cnssColumns() {
  const cols = [];

  cols.push({ id: uuid(), name: 'ID', type: 'text', width: 110,
    defaultStyle: { textAlign: 'center', bold: true } });
  cols.push({ id: uuid(), name: 'Indicator Name', type: 'text', width: 320,
    defaultStyle: { overflow: 'wrap' } });

  const grpOptions = ['Mortality', 'Morbidity', 'Behavioural Risk Factors',
    'Health System Response', 'Food & Nutrition', 'Policy Response'];
  const grpStyles = {
    'Mortality': { backgroundColor: '#FEE2E2', textColor: '#991B1B' },
    'Morbidity': { backgroundColor: '#FEF3C7', textColor: '#92400E' },
    'Behavioural Risk Factors': { backgroundColor: '#EDE9FE', textColor: '#5B21B6' },
    'Health System Response': { backgroundColor: '#DBEAFE', textColor: '#1E40AF' },
    'Food & Nutrition': { backgroundColor: '#D1FAE5', textColor: '#065F46' },
    'Policy Response': { backgroundColor: '#FCE7F3', textColor: '#9D174D' },
  };
  cols.push(makeSelectColumn(uuid(), 'Grouping', 180, grpOptions, grpStyles));

  cols.push({ id: uuid(), name: 'Sub-Grouping', type: 'text', width: 160,
    defaultStyle: { overflow: 'wrap' } });

  const coreOptions = ['Core', 'Expanded'];
  const coreStyles = {
    'Core': { backgroundColor: '#DBEAFE', textColor: '#1E40AF' },
    'Expanded': { backgroundColor: '#EDE9FE', textColor: '#5B21B6' },
  };
  cols.push(makeSelectColumn(uuid(), 'Core/Expanded', 120, coreOptions, coreStyles));

  cols.push({ id: uuid(), name: 'Data Source', type: 'text', width: 180,
    defaultStyle: { overflow: 'wrap' } });

  const freqOptions = ['Annual', 'Every 2 years'];
  cols.push(makeSelectColumn(uuid(), 'Frequency', 130, freqOptions, tealOptionStyles(freqOptions)));

  const dhis2Options = [
    'Premature Mortality from NCDs', 'Morbidity',
    'Behavioural Risk Factors (Adults 18+)', 'Behavioural Risk Factors (Adolescents 13-17)',
    'Cancer', 'Cancer/Diabetes/Hypertension tabs', 'Hypertension', 'Diabetes',
    'Policy Response', 'Food & Nutrition'
  ];
  cols.push(makeSelectColumn(uuid(), 'DHIS2 Reporting Tab', 180, dhis2Options,
    rotateOptionStyles(dhis2Options)));

  const bhisOptions = ['Low', 'Medium', 'None'];
  cols.push(makeSelectColumn(uuid(), 'BHIS Feasibility', 130, bhisOptions,
    fixedOptionStyles(bhisOptions, BHIS_OPTION_STYLES)));

  cols.push({ id: uuid(), name: 'Belize Notes', type: 'text', width: 200,
    defaultStyle: { overflow: 'wrap' } });

  return cols;
}

// ── Excel header → column mapping ───────────────────────────────────────────

const HEADER_MAP = {
  'WHO NCD Progress': [
    'ID', 'Indicator Name', 'Domain', 'Definition', 'Data Collection Tool',
    'Frequency', 'BHIS Relevance', 'Belize Notes'
  ],
  'HEARTS': [
    'ID', 'Indicator Name', 'Category', 'Monitoring Level', 'Definition',
    'Numerator / Method', 'Denominator', 'Data Source', 'Frequency',
    'BHIS Feasibility', 'Belize Notes'
  ],
  'Diabetes Monitoring': [
    'ID', 'Indicator Name', 'Category', 'Code', 'Definition',
    'Target / Goal', 'Target Facilities', 'Frequency', 'BHIS Feasibility', 'Belize Notes'
  ],
  'CNSS': [
    'ID', 'Indicator Name', 'Grouping', 'Sub-Grouping', 'Core/Expanded',
    'Data Source', 'Frequency', 'DHIS2 Reporting Tab', 'BHIS Feasibility', 'Belize Notes'
  ],
};

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const sql = [];

  sql.push('-- NCD Indicator Catalog Import');
  sql.push('-- Generated: ' + new Date().toISOString());
  sql.push('BEGIN;');
  sql.push('');

  // Admin user ID CTE
  sql.push('-- Get admin user ID');
  sql.push("DO $$");
  sql.push("DECLARE");
  sql.push("  admin_id UUID;");
  sql.push("  group_id UUID;");
  sql.push("  tracker_who_id UUID;");
  sql.push("  tracker_hearts_id UUID;");
  sql.push("  tracker_diabetes_id UUID;");
  sql.push("  tracker_cnss_id UUID;");
  sql.push("BEGIN");
  sql.push("  SELECT id INTO admin_id FROM team_members WHERE permission_level = 'admin' LIMIT 1;");
  sql.push("  IF admin_id IS NULL THEN");
  sql.push("    RAISE EXCEPTION 'No admin user found in team_members';");
  sql.push("  END IF;");
  sql.push('');

  // Tracker group
  sql.push("  -- Create NCD Indicators group");
  sql.push("  INSERT INTO tracker_groups (id, name, description, color, sort_order, created_by)");
  sql.push("  VALUES (");
  sql.push("    gen_random_uuid(),");
  sql.push("    'NCD Indicators',");
  sql.push("    'WHO, HEARTS, Diabetes, and CNSS indicator frameworks for Belize NCD monitoring',");
  sql.push("    '#10B981',");
  sql.push("    0,");
  sql.push("    admin_id");
  sql.push("  ) RETURNING id INTO group_id;");
  sql.push('');

  // Define trackers
  const trackerDefs = [
    { sheet: 'WHO NCD Progress', name: 'WHO NCD Progress', varName: 'tracker_who_id',
      description: '22 WHO progress monitor indicators for national NCD capacity and response',
      icon: 'Globe', sortOrder: 0, columnsFn: whoColumns },
    { sheet: 'HEARTS', name: 'HEARTS', varName: 'tracker_hearts_id',
      description: '17 HEARTS technical package indicators for hypertension and CVD management',
      icon: 'Heart', sortOrder: 1, columnsFn: heartsColumns },
    { sheet: 'Diabetes Monitoring', name: 'Diabetes Monitoring', varName: 'tracker_diabetes_id',
      description: '17 diabetes programme monitoring indicators for quality of care and performance',
      icon: 'Activity', sortOrder: 2, columnsFn: diabetesColumns },
    { sheet: 'CNSS', name: 'CNSS', varName: 'tracker_cnss_id',
      description: '139 Caribbean NCD Surveillance System indicators across mortality, morbidity, risk factors, and health system response',
      icon: 'BarChart3', sortOrder: 3, columnsFn: cnssColumns },
  ];

  for (const def of trackerDefs) {
    const columns = def.columnsFn();
    const headerNames = HEADER_MAP[def.sheet];

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

    sql.push(`  -- Tracker: ${def.name}`);
    sql.push(`  INSERT INTO trackers (id, name, description, icon, columns, sort_order, group_id, created_by)`);
    sql.push(`  VALUES (`);
    sql.push(`    gen_random_uuid(),`);
    sql.push(`    '${escapeSql(def.name)}',`);
    sql.push(`    '${escapeSql(def.description)}',`);
    sql.push(`    '${def.icon}',`);
    sql.push(`    '${JSON.stringify(cleanColumns).replace(/'/g, "''")}'::jsonb,`);
    sql.push(`    ${def.sortOrder},`);
    sql.push(`    group_id,`);
    sql.push(`    admin_id`);
    sql.push(`  ) RETURNING id INTO ${def.varName};`);
    sql.push('');

    // Read sheet data
    const ws = wb.Sheets[def.sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const dataRows = rows.slice(1); // skip header

    sql.push(`  -- ${def.name}: ${dataRows.length} rows`);
    sql.push(`  INSERT INTO tracker_rows (tracker_id, cells, sort_order, created_by) VALUES`);

    const rowValues = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const cells = {};

      for (let j = 0; j < headerNames.length; j++) {
        const headerName = headerNames[j];
        const colId = colNameToId[headerName];
        if (!colId) continue;

        const val = row[j];
        if (val !== null && val !== undefined && val !== '') {
          cells[colId] = String(val).trim();
        }
      }

      const cellsJson = JSON.stringify(cells).replace(/'/g, "''");
      rowValues.push(`    (${def.varName}, '${cellsJson}'::jsonb, ${i}, admin_id)`);
    }

    sql.push(rowValues.join(',\n') + ';');
    sql.push('');
  }

  sql.push("END $$;");
  sql.push('');
  sql.push('COMMIT;');

  process.stdout.write(sql.join('\n') + '\n');
}

main();
