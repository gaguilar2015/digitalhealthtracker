import { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  ChartType, AggFunction, DateBucket, SortBy,
  Sheet, SheetGroup, SheetRow, DashboardWidget, WidgetConfig,
  CreateDashboardWidget,
} from '@/types';
import { autoDetectConfig } from '@/lib/utils/chartDefaults';
import { ChartTypePicker } from './ChartTypePicker';
import { AxisConfigurator } from './AxisConfigurator';
import { ChartPreview } from './ChartPreview';

interface AddWidgetDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateDashboardWidget) => Promise<void>;
  sheets: Sheet[];
  groups: SheetGroup[];
  rowsBySheet: Map<string, SheetRow[]>;
  userId: string;
  editingWidget?: DashboardWidget | null;
  nextSortOrder: number;
}

export function AddWidgetDialog({
  open,
  onClose,
  onSave,
  sheets,
  groups,
  rowsBySheet,
  userId,
  editingWidget,
  nextSortOrder,
}: AddWidgetDialogProps) {
  const [chartType, setChartType] = useState<ChartType | null>(null);
  const [sourceType, setSourceType] = useState<'single_sheet' | 'sheet_group'>('single_sheet');
  const [sheetId, setSheetId] = useState<string>('');
  const [sheetGroupId, setSheetGroupId] = useState<string>('');
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);

  const [xColumnId, setXColumnId] = useState<string | undefined>();
  const [xColumnName, setXColumnName] = useState<string | undefined>();
  const [yColumnId, setYColumnId] = useState<string | undefined>();
  const [yColumnName, setYColumnName] = useState<string | undefined>();
  const [aggFunction, setAggFunction] = useState<AggFunction>('count');
  const [groupByColumnId, setGroupByColumnId] = useState<string | undefined>();
  const [groupByColumnName, setGroupByColumnName] = useState<string | undefined>();
  const [dateBucket, setDateBucket] = useState<DateBucket>('month');
  const [sortBy, setSortBy] = useState<SortBy>('category_asc');

  const [title, setTitle] = useState('');
  const [gridSpan, setGridSpan] = useState(1);
  const [showLegend, setShowLegend] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const selectedSheet = sheets.find(s => s.id === sheetId);
  const rows = sheetId ? (rowsBySheet.get(sheetId) ?? []) : [];

  // Pre-fill when editing
  useEffect(() => {
    if (!open) return;
    if (editingWidget) {
      setChartType(editingWidget.chart_type);
      setSourceType(editingWidget.source_type);
      setSheetId(editingWidget.sheet_id ?? '');
      setSheetGroupId(editingWidget.sheet_group_id ?? '');
      setSelectedSheetIds(editingWidget.selected_sheet_ids ?? []);
      setXColumnId(editingWidget.config.xColumnId);
      setXColumnName(editingWidget.config.xColumnName);
      setYColumnId(editingWidget.config.yColumnId);
      setYColumnName(editingWidget.config.yColumnName);
      setAggFunction(editingWidget.config.aggFunction ?? 'count');
      setGroupByColumnId(editingWidget.config.groupByColumnId);
      setGroupByColumnName(editingWidget.config.groupByColumnName);
      setDateBucket(editingWidget.config.dateBucket ?? 'month');
      setSortBy(editingWidget.config.sortBy ?? 'category_asc');
      setTitle(editingWidget.title);
      setGridSpan(editingWidget.grid_span);
      setShowLegend(editingWidget.show_legend);
      setShowValues(editingWidget.show_values);
    } else {
      setChartType(null);
      setSourceType('single_sheet');
      setSheetId('');
      setSheetGroupId('');
      setSelectedSheetIds([]);
      setXColumnId(undefined);
      setXColumnName(undefined);
      setYColumnId(undefined);
      setYColumnName(undefined);
      setAggFunction('count');
      setGroupByColumnId(undefined);
      setGroupByColumnName(undefined);
      setDateBucket('month');
      setSortBy('category_asc');
      setTitle('');
      setGridSpan(1);
      setShowLegend(true);
      setShowValues(true);
      setAppearanceOpen(false);
    }
  }, [open, editingWidget]);

  // Auto-detect config when sheet changes
  useEffect(() => {
    if (editingWidget || !sheetId || !chartType) return;
    const sheet = sheets.find(s => s.id === sheetId);
    if (!sheet) return;
    const detected = autoDetectConfig(sheet.columns);
    if (!xColumnId) {
      setXColumnId(detected.config.xColumnId);
      setXColumnName(detected.config.xColumnName);
      setYColumnId(detected.config.yColumnId);
      setYColumnName(detected.config.yColumnName);
      setAggFunction(detected.config.aggFunction ?? 'count');
      if (detected.config.dateBucket) setDateBucket(detected.config.dateBucket);
      if (detected.config.sortBy) setSortBy(detected.config.sortBy);
      if (!title) setTitle(detected.title);
    }
  }, [sheetId, chartType]);

  // Auto-generate title
  useEffect(() => {
    if (editingWidget) return;
    if (!xColumnName && !yColumnName) return;
    const aggLabel = aggFunction === 'count' ? 'Count' : yColumnName ?? 'Value';
    const generated = xColumnName ? `${aggLabel} by ${xColumnName}` : `Total ${aggLabel}`;
    setTitle(generated);
  }, [xColumnName, yColumnName, aggFunction, editingWidget]);

  // Grouped sheets for optgroup
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups],
  );

  const ungroupedSheets = useMemo(
    () => sheets.filter(s => !s.group_id),
    [sheets],
  );

  const groupSheetsMap = useMemo(() => {
    const map = new Map<string, Sheet[]>();
    for (const g of sortedGroups) {
      map.set(g.id, sheets.filter(s => s.group_id === g.id));
    }
    return map;
  }, [sheets, sortedGroups]);

  // Row count info for selected sheet
  const infoText = selectedSheet
    ? `${rows.length} row${rows.length !== 1 ? 's' : ''}, ${selectedSheet.columns.length} column${selectedSheet.columns.length !== 1 ? 's' : ''}`
    : '';

  const config: WidgetConfig = {
    xColumnId,
    xColumnName,
    yColumnId,
    yColumnName,
    aggFunction,
    groupByColumnId,
    groupByColumnName,
    dateBucket,
    sortBy,
  };

  const canSave = chartType && (sheetId || (sourceType === 'sheet_group' && selectedSheetIds.length > 0)) && title.trim();

  const handleSave = async () => {
    if (!canSave || !chartType) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        chart_type: chartType,
        source_type: sourceType,
        sheet_id: sourceType === 'single_sheet' ? sheetId : null,
        sheet_group_id: sourceType === 'sheet_group' ? sheetGroupId || null : null,
        selected_sheet_ids: sourceType === 'sheet_group' ? selectedSheetIds : [],
        config,
        color_palette: 'auto',
        grid_span: gridSpan,
        show_legend: showLegend,
        show_values: showValues,
        sort_order: editingWidget?.sort_order ?? nextSortOrder,
        created_by: userId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingWidget ? 'Edit Chart' : 'Add Chart'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — two panels */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Left panel — config */}
          <div className="w-2/5 border-r border-gray-200 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Chart Type */}
            <ChartTypePicker value={chartType} onChange={setChartType} />

            {/* Section 2: Data Source */}
            {chartType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>

                {/* Source type toggle */}
                <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-3">
                  <button
                    type="button"
                    onClick={() => setSourceType('single_sheet')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                      sourceType === 'single_sheet'
                        ? 'bg-teal-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Single Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('sheet_group')}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                      sourceType === 'sheet_group'
                        ? 'bg-teal-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Sheet Group
                  </button>
                </div>

                {sourceType === 'single_sheet' ? (
                  <>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      value={sheetId}
                      onChange={e => {
                        setSheetId(e.target.value);
                        setXColumnId(undefined);
                        setXColumnName(undefined);
                        setYColumnId(undefined);
                        setYColumnName(undefined);
                        setGroupByColumnId(undefined);
                        setGroupByColumnName(undefined);
                      }}
                    >
                      <option value="">Select sheet...</option>
                      {sortedGroups.map(g => {
                        const groupSheets = groupSheetsMap.get(g.id) ?? [];
                        if (groupSheets.length === 0) return null;
                        return (
                          <optgroup key={g.id} label={g.name}>
                            {groupSheets.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </optgroup>
                        );
                      })}
                      {ungroupedSheets.length > 0 && (
                        <optgroup label={sortedGroups.length > 0 ? 'Ungrouped' : 'Sheets'}>
                          {ungroupedSheets.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {infoText && (
                      <p className="mt-1.5 text-xs text-gray-400">{infoText}</p>
                    )}
                  </>
                ) : (
                  <>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 mb-2"
                      value={sheetGroupId}
                      onChange={e => {
                        setSheetGroupId(e.target.value);
                        const groupSheets = groupSheetsMap.get(e.target.value) ?? [];
                        setSelectedSheetIds(groupSheets.map(s => s.id));
                      }}
                    >
                      <option value="">Select group...</option>
                      {sortedGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    {sheetGroupId && (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {(groupSheetsMap.get(sheetGroupId) ?? []).map(s => (
                          <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={selectedSheetIds.includes(s.id)}
                              onChange={e => {
                                setSelectedSheetIds(prev =>
                                  e.target.checked
                                    ? [...prev, s.id]
                                    : prev.filter(id => id !== s.id),
                                );
                              }}
                              className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                            />
                            {s.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Section 3: Axes */}
            {chartType && (sourceType === 'single_sheet' ? sheetId : selectedSheetIds.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Configuration</label>
                {selectedSheet && (
                  <AxisConfigurator
                    chartType={chartType}
                    columns={selectedSheet.columns}
                    xColumnId={xColumnId}
                    yColumnId={yColumnId}
                    aggFunction={aggFunction}
                    groupByColumnId={groupByColumnId}
                    dateBucket={dateBucket}
                    sortBy={sortBy}
                    onXChange={(id, name) => { setXColumnId(id); setXColumnName(name); }}
                    onYChange={(id, name) => { setYColumnId(id); setYColumnName(name); }}
                    onAggChange={setAggFunction}
                    onGroupByChange={(id, name) => { setGroupByColumnId(id); setGroupByColumnName(name); }}
                    onDateBucketChange={setDateBucket}
                    onSortChange={setSortBy}
                  />
                )}
              </div>
            )}

            {/* Section 4: Appearance (collapsible) */}
            {chartType && (
              <div className="border border-gray-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAppearanceOpen(!appearanceOpen)}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700"
                >
                  Appearance
                  {appearanceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {appearanceOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Chart title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setGridSpan(1)}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium ${
                            gridSpan === 1 ? 'bg-teal-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Half Width
                        </button>
                        <button
                          type="button"
                          onClick={() => setGridSpan(2)}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium ${
                            gridSpan === 2 ? 'bg-teal-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Full Width
                        </button>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={showLegend}
                        onChange={e => setShowLegend(e.target.checked)}
                        className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                      />
                      Show legend
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={showValues}
                        onChange={e => setShowValues(e.target.checked)}
                        className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                      />
                      Show values on chart
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel — preview */}
          <div className="w-3/5 p-6 flex flex-col">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Preview</h3>
            <div className="flex-1 min-h-0 bg-gray-50 rounded-lg border border-gray-200 p-4">
              <ChartPreview
                chartType={chartType}
                config={config}
                sheet={selectedSheet}
                rows={rows}
                title={title || 'Preview'}
                showLegend={showLegend}
                showValues={showValues}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : editingWidget ? 'Update Chart' : 'Add Chart'}
          </button>
        </div>
      </div>
    </div>
  );
}
