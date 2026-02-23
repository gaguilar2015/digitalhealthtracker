import type { ChartType, SheetColumn, AggFunction, DateBucket, SortBy } from '@/types';
import { AGG_FUNCTIONS, DATE_BUCKETS, SORT_BY_OPTIONS } from '@/types';

const X_AXIS_ALLOWED: Record<string, string[]> = {
  bar: ['select', 'multiselect', 'text', 'checkbox'],
  horizontal_bar: ['select', 'multiselect', 'text', 'checkbox'],
  stacked_bar: ['select', 'text', 'date'],
  line: ['date', 'datetime', 'select', 'number'],
  area: ['date', 'datetime', 'select', 'number'],
  pie: ['select', 'multiselect', 'text', 'checkbox'],
  donut: ['select', 'multiselect', 'text', 'checkbox'],
  kpi: [],
};

const AGG_LABELS: Record<AggFunction, string> = {
  count: 'Count',
  sum: 'Sum',
  avg: 'Average',
  min: 'Min',
  max: 'Max',
};

const DATE_BUCKET_LABELS: Record<DateBucket, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
};

const SORT_LABELS: Record<SortBy, string> = {
  category_asc: 'Category (A-Z)',
  value_desc: 'Value (High→Low)',
  value_asc: 'Value (Low→High)',
};

interface AxisConfiguratorProps {
  chartType: ChartType;
  columns: SheetColumn[];
  xColumnId: string | undefined;
  yColumnId: string | undefined;
  aggFunction: AggFunction;
  groupByColumnId: string | undefined;
  dateBucket: DateBucket;
  sortBy: SortBy;
  onXChange: (colId: string, colName: string) => void;
  onYChange: (colId: string | undefined, colName: string | undefined) => void;
  onAggChange: (fn: AggFunction) => void;
  onGroupByChange: (colId: string | undefined, colName: string | undefined) => void;
  onDateBucketChange: (bucket: DateBucket) => void;
  onSortChange: (sort: SortBy) => void;
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  text: 'bg-gray-100 text-gray-600',
  number: 'bg-blue-100 text-blue-600',
  date: 'bg-amber-100 text-amber-600',
  datetime: 'bg-amber-100 text-amber-600',
  select: 'bg-purple-100 text-purple-600',
  multiselect: 'bg-pink-100 text-pink-600',
  checkbox: 'bg-green-100 text-green-600',
};

export function AxisConfigurator({
  chartType,
  columns,
  xColumnId,
  yColumnId,
  aggFunction,
  groupByColumnId,
  dateBucket,
  sortBy,
  onXChange,
  onYChange,
  onAggChange,
  onGroupByChange,
  onDateBucketChange,
  onSortChange,
}: AxisConfiguratorProps) {
  const allowedTypes = X_AXIS_ALLOWED[chartType] ?? [];
  const xColumns = columns.filter(c => allowedTypes.includes(c.type));
  const numberColumns = columns.filter(c => c.type === 'number');
  const groupByColumns = columns.filter(
    c => ['select', 'multiselect', 'checkbox'].includes(c.type) && c.id !== xColumnId,
  );

  const selectedXCol = columns.find(c => c.id === xColumnId);
  const showDateBucket = selectedXCol && (selectedXCol.type === 'date' || selectedXCol.type === 'datetime');
  const supportsGroupBy = ['bar', 'stacked_bar', 'line', 'area'].includes(chartType);
  const isKpi = chartType === 'kpi';

  if (isKpi) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <div className="flex gap-2">
            <select
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={yColumnId ?? '__count__'}
              onChange={e => {
                const v = e.target.value;
                if (v === '__count__') {
                  onYChange(undefined, undefined);
                  onAggChange('count');
                } else {
                  const col = columns.find(c => c.id === v);
                  onYChange(v, col?.name);
                }
              }}
            >
              <option value="__count__">Row Count</option>
              {numberColumns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {yColumnId && (
              <select
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                value={aggFunction}
                onChange={e => onAggChange(e.target.value as AggFunction)}
              >
                {AGG_FUNCTIONS.filter(f => f !== 'count').map(f => (
                  <option key={f} value={f}>{AGG_LABELS[f]}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* X-Axis */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis (Category)</label>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          value={xColumnId ?? ''}
          onChange={e => {
            const col = columns.find(c => c.id === e.target.value);
            if (col) onXChange(col.id, col.name);
          }}
        >
          <option value="">Select column...</option>
          {xColumns.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {xColumnId && (
          <div className="mt-1 flex gap-1">
            {xColumns.filter(c => c.id === xColumnId).map(c => (
              <span key={c.id} className={`inline-flex text-[10px] px-1.5 py-0.5 rounded ${TYPE_BADGE_COLORS[c.type] ?? 'bg-gray-100'}`}>
                {c.type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Y-Axis */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Y-Axis (Value)</label>
        <div className="flex gap-2">
          <select
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            value={yColumnId ?? '__count__'}
            onChange={e => {
              const v = e.target.value;
              if (v === '__count__') {
                onYChange(undefined, undefined);
                onAggChange('count');
              } else {
                const col = columns.find(c => c.id === v);
                onYChange(v, col?.name);
                if (aggFunction === 'count') onAggChange('sum');
              }
            }}
          >
            <option value="__count__">Row Count</option>
            {numberColumns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {yColumnId && (
            <select
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={aggFunction}
              onChange={e => onAggChange(e.target.value as AggFunction)}
            >
              {AGG_FUNCTIONS.map(f => (
                <option key={f} value={f}>{AGG_LABELS[f]}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Date Bucket */}
      {showDateBucket && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Grouping</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {DATE_BUCKETS.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => onDateBucketChange(b)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                  dateBucket === b
                    ? 'bg-teal-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {DATE_BUCKET_LABELS[b]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Group By */}
      {supportsGroupBy && groupByColumns.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group By (optional)</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            value={groupByColumnId ?? ''}
            onChange={e => {
              const v = e.target.value;
              if (!v) {
                onGroupByChange(undefined, undefined);
              } else {
                const col = columns.find(c => c.id === v);
                onGroupByChange(v, col?.name);
              }
            }}
          >
            <option value="">None</option>
            {groupByColumns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sort</label>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          value={sortBy}
          onChange={e => onSortChange(e.target.value as SortBy)}
        >
          {SORT_BY_OPTIONS.map(s => (
            <option key={s} value={s}>{SORT_LABELS[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
