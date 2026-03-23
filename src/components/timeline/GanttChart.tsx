import { useMemo } from 'react';
import { parseISO, differenceInDays, format, eachMonthOfInterval, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { GanttRow, GanttRowLabel } from './GanttRow';
import { GanttBar } from './GanttBar';
import { GanttDiamond } from './GanttDiamond';
import { GanttDependencyArrow } from './GanttDependencyArrow';
import { getWorkstreamColorHex } from '@/lib/utils/colors';
import { isOverdue } from '@/lib/utils/dates';
import type { Workstream, Activity, ActivityGroup, Task, Deliverable, Dependency, TeamMember } from '@/types';
import type { DetailLevel } from './GanttControls';
import type { GanttItemData } from './GanttTooltip';

interface GanttChartProps {
  workstreams: Workstream[];
  activities: Activity[];
  activityGroups: ActivityGroup[];
  tasks: Task[];
  deliverables: Deliverable[];
  dependencies: Dependency[];
  members: TeamMember[];
  zoom: number;
  detailLevel: DetailLevel;
}

interface RowData {
  key: string;
  label: string;
  isGroupHeader: boolean;
  isOwnerHeader?: boolean;
  indent: number;
  color?: string;
  bars: BarData[];
}

interface BarData {
  type: 'bar' | 'diamond';
  data: GanttItemData;
  leftPercent: number;
  widthPercent?: number;
  color: string;
  isOverdue: boolean;
}

export function GanttChart({
  workstreams,
  activities,
  activityGroups,
  tasks,
  deliverables,
  dependencies,
  members,
  zoom,
  detailLevel,
}: GanttChartProps) {
  // Compute dynamic timeline range from all data
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const allDates: Date[] = [];
    for (const ws of workstreams) {
      if (ws.start_date) allDates.push(parseISO(ws.start_date));
      if (ws.end_date) allDates.push(parseISO(ws.end_date));
    }
    for (const a of activities) {
      if (a.start_date) allDates.push(parseISO(a.start_date));
      if (a.end_date) allDates.push(parseISO(a.end_date));
    }
    for (const t of tasks) {
      if (t.start_date) allDates.push(parseISO(t.start_date));
      if (t.end_date) allDates.push(parseISO(t.end_date));
    }
    for (const d of deliverables) {
      if (d.due_date) allDates.push(parseISO(d.due_date));
    }

    if (allDates.length === 0) {
      const now = new Date();
      return {
        rangeStart: new Date(now.getFullYear(), 0, 1),
        rangeEnd: new Date(now.getFullYear(), 11, 31),
        totalDays: 365,
      };
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const start = subMonths(startOfMonth(minDate), 1);
    const end = addMonths(endOfMonth(maxDate), 1);
    return { rangeStart: start, rangeEnd: end, totalDays: differenceInDays(end, start) };
  }, [workstreams, activities, tasks, deliverables]);

  // Date positioning helpers using dynamic range
  const dateToPercent = (dateStr: string): number => {
    const d = parseISO(dateStr);
    return (differenceInDays(d, rangeStart) / totalDays) * 100;
  };

  const barPosition = (startStr: string, endStr: string) => {
    const left = dateToPercent(startStr);
    const right = dateToPercent(endStr);
    return { leftPercent: Math.max(0, left), widthPercent: Math.max(0.3, right - left) };
  };

  const months = useMemo(() => {
    return eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
  }, [rangeStart, rangeEnd]);

  const widthMultiplier = zoom;

  const todayPercent = useMemo(() => {
    const now = new Date();
    if (now < rangeStart || now > rangeEnd) return null;
    return (differenceInDays(now, rangeStart) / totalDays) * 100;
  }, [rangeStart, rangeEnd, totalDays]);

  // Build rows based on detail level, grouped by owner
  const rows = useMemo<RowData[]>(() => {
    const result: RowData[] = [];
    const sortedWs = [...workstreams].sort((a, b) => a.sort_order - b.sort_order);

    // Group workstreams by owner
    const ownerGroupsMap = new Map<string | null, Workstream[]>();
    for (const ws of sortedWs) {
      const key = ws.owner_id;
      if (!ownerGroupsMap.has(key)) ownerGroupsMap.set(key, []);
      ownerGroupsMap.get(key)!.push(ws);
    }
    const ownerGroups = Array.from(ownerGroupsMap.entries()).sort(
      (a, b) => a[1][0].sort_order - b[1][0].sort_order,
    );

    for (const [ownerId, ownerWorkstreams] of ownerGroups) {
      // Owner header row
      const owner = ownerId ? members.find(m => m.id === ownerId) : null;
      const ownerLabel = owner
        ? (owner.title ? `${owner.title} — ${owner.full_name}` : owner.full_name)
        : 'Unassigned';
      result.push({
        key: `owner-${ownerId ?? 'unassigned'}`,
        label: ownerLabel,
        isGroupHeader: true,
        isOwnerHeader: true,
        indent: 0,
        bars: [],
      });

    for (const ws of ownerWorkstreams) {
      const wsColor = getWorkstreamColorHex(ws.color);
      const wsActivities = activities.filter(a => a.workstream_id === ws.id);
      const wsDeliverables = deliverables.filter(d => d.workstream_id === ws.id);

      if (detailLevel === 'workstream') {
        const bars: BarData[] = [];
        bars.push({
          type: 'bar',
          data: {
            id: ws.id, name: ws.name, type: 'workstream', code: ws.code,
            startDate: ws.start_date, endDate: ws.end_date, status: 'in_progress',
            workstreamCode: ws.code, workstreamId: ws.id,
          },
          ...barPosition(ws.start_date, ws.end_date),
          color: wsColor,
          isOverdue: false,
        });
        for (const del of wsDeliverables) {
          bars.push({
            type: 'diamond',
            data: {
              id: del.id, name: del.name, type: 'deliverable',
              dueDate: del.due_date, status: del.status,
              workstreamCode: ws.code, workstreamId: ws.id,
            },
            leftPercent: dateToPercent(del.due_date),
            color: wsColor,
            isOverdue: isOverdue(del.due_date, del.status),
          });
        }
        result.push({ key: ws.id, label: `${ws.code} - ${ws.short_name}`, isGroupHeader: true, indent: 1, color: wsColor, bars });
      } else if (detailLevel === 'activity_group') {
        // Split deliverables: unlinked go on workstream header, linked handled later
        const unlinkedDels = wsDeliverables.filter(d => !d.activity_id);
        const wsHeaderBars: BarData[] = unlinkedDels.map(del => ({
          type: 'diamond' as const,
          data: {
            id: del.id, name: del.name, type: 'deliverable' as const,
            dueDate: del.due_date, status: del.status,
            workstreamCode: ws.code, workstreamId: ws.id,
          },
          leftPercent: dateToPercent(del.due_date),
          color: wsColor,
          isOverdue: isOverdue(del.due_date, del.status),
        }));
        result.push({ key: `ws-${ws.id}`, label: `${ws.code} - ${ws.short_name}`, isGroupHeader: true, indent: 1, color: wsColor, bars: wsHeaderBars });

        const wsGroups = activityGroups
          .filter(g => g.workstream_id === ws.id)
          .sort((a, b) => a.sort_order - b.sort_order);

        // Activities grouped under their activity group
        for (const group of wsGroups) {
          const groupActivities = wsActivities.filter(a => a.activity_group_id === group.id);
          if (groupActivities.length === 0) continue;

          // Compute group date span from its activities
          const groupStart = groupActivities
            .map(a => a.start_date).filter(Boolean).sort()[0];
          const groupEnd = groupActivities
            .map(a => a.end_date).filter(Boolean).sort().reverse()[0];

          const groupBars: BarData[] = groupStart && groupEnd ? [{
            type: 'bar',
            data: {
              id: group.id, name: group.name, type: 'activity_group', code: group.code,
              startDate: groupStart, endDate: groupEnd, status: 'in_progress',
              workstreamCode: ws.code, workstreamId: ws.id,
            },
            ...barPosition(groupStart, groupEnd),
            color: wsColor,
            isOverdue: false,
          }] : [];
          result.push({ key: group.id, label: group.name, isGroupHeader: false, indent: 2, color: wsColor, bars: groupBars });
        }

        // Ungrouped activities (no activity_group_id)
        const ungrouped = wsActivities.filter(a => !a.activity_group_id);
        const sortedUngrouped = [...ungrouped].sort((a, b) => {
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return a.start_date.localeCompare(b.start_date);
        });
        for (const act of sortedUngrouped) {
          const actBars: BarData[] = [{
            type: 'bar',
            data: {
              id: act.id, name: act.name, type: 'activity', code: act.code,
              startDate: act.start_date, endDate: act.end_date, status: act.status,
              workstreamCode: ws.code, workstreamId: ws.id,
            },
            ...barPosition(act.start_date, act.end_date),
            color: wsColor,
            isOverdue: isOverdue(act.end_date, act.status),
          }];
          result.push({ key: act.id, label: act.name, isGroupHeader: false, indent: 2, color: wsColor, bars: actBars });
        }
      } else {
        // activity or task detail level
        // Split deliverables: unlinked go on workstream header, linked go on activity rows
        const unlinkedDels = wsDeliverables.filter(d => !d.activity_id);
        const linkedDelsByActivity = new Map<string, typeof wsDeliverables>();
        for (const del of wsDeliverables.filter(d => d.activity_id)) {
          const key = del.activity_id!;
          if (!linkedDelsByActivity.has(key)) linkedDelsByActivity.set(key, []);
          linkedDelsByActivity.get(key)!.push(del);
        }

        const wsHeaderBars: BarData[] = unlinkedDels.map(del => ({
          type: 'diamond' as const,
          data: {
            id: del.id, name: del.name, type: 'deliverable' as const,
            dueDate: del.due_date, status: del.status,
            workstreamCode: ws.code, workstreamId: ws.id,
          },
          leftPercent: dateToPercent(del.due_date),
          color: wsColor,
          isOverdue: isOverdue(del.due_date, del.status),
        }));
        result.push({ key: `ws-${ws.id}`, label: `${ws.code} - ${ws.short_name}`, isGroupHeader: true, indent: 1, color: wsColor, bars: wsHeaderBars });

        const sortedActivities = [...wsActivities].sort((a, b) => {
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return a.start_date.localeCompare(b.start_date);
        });
        for (const act of sortedActivities) {
          // Activity bar + any linked deliverable diamonds
          const actLinkedDels = linkedDelsByActivity.get(act.id) ?? [];
          const actBars: BarData[] = [{
            type: 'bar',
            data: {
              id: act.id, name: act.name, type: 'activity', code: act.code,
              startDate: act.start_date, endDate: act.end_date, status: act.status,
              workstreamCode: ws.code, workstreamId: ws.id,
            },
            ...barPosition(act.start_date, act.end_date),
            color: wsColor,
            isOverdue: isOverdue(act.end_date, act.status),
          }];
          for (const del of actLinkedDels) {
            actBars.push({
              type: 'diamond',
              data: {
                id: del.id, name: del.name, type: 'deliverable',
                dueDate: del.due_date, status: del.status,
                workstreamCode: ws.code, workstreamId: ws.id,
              },
              leftPercent: dateToPercent(del.due_date),
              color: wsColor,
              isOverdue: isOverdue(del.due_date, del.status),
            });
          }
          result.push({ key: act.id, label: act.name, isGroupHeader: false, indent: 2, color: wsColor, bars: actBars });

          if (detailLevel === 'task') {
            const actTasks = tasks
              .filter(t => t.activity_id === act.id)
              .sort((a, b) => {
                if (!a.start_date && !b.start_date) return 0;
                if (!a.start_date) return 1;
                if (!b.start_date) return -1;
                return a.start_date.localeCompare(b.start_date);
              });
            for (const task of actTasks) {
              if (!task.start_date || !task.end_date) continue;
              const taskBars: BarData[] = [{
                type: 'bar',
                data: {
                  id: task.id, name: task.name, type: 'task', code: task.code ?? undefined,
                  startDate: task.start_date, endDate: task.end_date, status: task.status,
                  workstreamCode: ws.code, workstreamId: ws.id,
                },
                ...barPosition(task.start_date, task.end_date),
                color: wsColor,
                isOverdue: isOverdue(task.end_date, task.status),
              }];
              result.push({ key: task.id, label: task.name, isGroupHeader: false, indent: 3, bars: taskBars });
            }
          }
        }

      }
    }
    }

    return result;
  }, [workstreams, activities, activityGroups, tasks, deliverables, members, detailLevel]);

  // Dependency arrows
  const depArrows = useMemo(() => {
    const rowIndex = new Map<string, number>();
    rows.forEach((r, i) => {
      if (r.bars.length > 0) {
        rowIndex.set(r.bars[0].data.id, i);
      }
    });

    return dependencies.map(dep => {
      const fromIdx = rowIndex.get(dep.predecessor_id);
      const toIdx = rowIndex.get(dep.successor_id);
      if (fromIdx === undefined || toIdx === undefined) return null;

      const fromRow = rows[fromIdx];
      const toRow = rows[toIdx];
      if (!fromRow.bars.length || !toRow.bars.length) return null;

      const fromBar = fromRow.bars[0];
      const toBar = toRow.bars[0];
      const fromRight = fromBar.leftPercent + (fromBar.widthPercent ?? 0);
      const toLeft = toBar.leftPercent;
      const violated = fromRight > toLeft;

      return {
        id: dep.id,
        from: { left: fromBar.leftPercent, right: fromRight, top: fromIdx * 36 + 18 },
        to: { left: toLeft, right: toLeft + (toBar.widthPercent ?? 0), top: toIdx * 36 + 18 },
        violated,
      };
    }).filter(Boolean) as { id: string; from: { left: number; right: number; top: number }; to: { left: number; right: number; top: number }; violated: boolean }[];
  }, [dependencies, rows]);

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="flex">
        {/* Fixed label column */}
        <div className="w-56 flex-shrink-0 border-r border-gray-200">
          {/* Header */}
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 min-h-[33px] flex items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">Item</span>
          </div>
          {/* Row labels */}
          {rows.map(row => (
            <GanttRowLabel
              key={row.key}
              label={row.label}
              isGroupHeader={row.isGroupHeader}
              isOwnerHeader={row.isOwnerHeader}
              indent={row.indent}
              color={row.color}
            />
          ))}
        </div>

        {/* Scrollable bar area */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ minWidth: `${100 * widthMultiplier}%` }}>
            {/* Month headers */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {months.map(month => {
                const monthStart = startOfMonth(month);
                const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
                const effectiveEnd = nextMonth > rangeEnd ? rangeEnd : nextMonth;
                const width = (differenceInDays(effectiveEnd, monthStart) / totalDays) * 100;

                return (
                  <div
                    key={month.toISOString()}
                    className="text-[10px] text-gray-500 py-2 text-center border-r border-gray-100 flex-shrink-0"
                    style={{ width: `${width}%` }}
                  >
                    {format(month, 'MMM yy')}
                  </div>
                );
              })}
            </div>

            {/* Rows with bars */}
            <div className="relative">
              {/* Vertical month gridlines */}
              {months.map(month => {
                const left = (differenceInDays(startOfMonth(month), rangeStart) / totalDays) * 100;
                return (
                  <div
                    key={`grid-${month.toISOString()}`}
                    className="absolute top-0 bottom-0 border-l border-gray-100"
                    style={{ left: `${left}%` }}
                  />
                );
              })}

              {/* Today marker */}
              {todayPercent !== null && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-orange-400 z-10"
                  style={{ left: `${todayPercent}%` }}
                >
                  <span className="absolute -top-0.5 left-1 text-[9px] text-orange-500 font-medium">Today</span>
                </div>
              )}

              {/* Dependency arrows SVG overlay */}
              {depArrows.length > 0 && (
                <svg
                  className="absolute inset-0 w-full pointer-events-none z-10"
                  style={{ height: rows.length * 36 }}
                >
                  <defs>
                    <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                      <polygon points="0 0, 6 2, 0 4" fill="#9CA3AF" />
                    </marker>
                  </defs>
                  {depArrows.map(arrow => (
                    <GanttDependencyArrow
                      key={arrow.id}
                      from={arrow.from}
                      to={arrow.to}
                      violated={arrow.violated}
                    />
                  ))}
                </svg>
              )}

              {/* Data rows */}
              {rows.map(row => (
                <GanttRow
                  key={row.key}
                  label={row.label}
                  isGroupHeader={row.isGroupHeader}
                  isOwnerHeader={row.isOwnerHeader}
                  indent={row.indent}
                  color={row.color}
                >
                  {row.bars.map(bar =>
                    bar.type === 'bar' ? (
                      <GanttBar
                        key={bar.data.id}
                        startDate={bar.data.startDate!}
                        endDate={bar.data.endDate!}
                        color={bar.color}
                        status={bar.data.status}
                        isOverdue={bar.isOverdue}
                        item={bar.data}
                        leftPercent={bar.leftPercent}
                        widthPercent={bar.widthPercent ?? 0}
                      />
                    ) : (
                      <GanttDiamond
                        key={bar.data.id}
                        date={bar.data.dueDate!}
                        color={bar.color}
                        status={bar.data.status}
                        leftPercent={bar.leftPercent}
                        item={bar.data}
                      />
                    ),
                  )}
                </GanttRow>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
