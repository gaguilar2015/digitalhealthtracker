import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Workstream, Activity, Task, Deliverable, Dependency, TeamMember } from '@/types';

function getMemberName(id: string | null, members: TeamMember[]): string {
  if (!id) return '';
  return members.find(m => m.id === id)?.full_name ?? '';
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function exportWorkplanToExcel(
  workstreams: Workstream[],
  activities: Activity[],
  tasks: Task[],
  deliverables: Deliverable[],
  dependencies: Dependency[],
  teamMembers: TeamMember[],
) {
  const wb = XLSX.utils.book_new();
  const exportDate = format(new Date(), 'MMM d, yyyy');

  // Sheet 1: Summary
  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.status === 'complete').length;
  const totalDeliverables = deliverables.length;
  const completedDeliverables = deliverables.filter(d => d.status === 'complete').length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'complete').length;

  const summaryData = [
    ['BL-L1048: Improving Efficiency, Quality, and Access in Belize\'s Health System'],
    ['Export Date:', exportDate],
    [''],
    ['Metric', 'Total', 'Completed', 'Progress'],
    ['Workstreams', workstreams.length, '', ''],
    ['Activities', totalActivities, completedActivities, totalActivities > 0 ? `${Math.round((completedActivities / totalActivities) * 100)}%` : '0%'],
    ['Tasks', totalTasks, completedTasks, totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%'],
    ['Deliverables', totalDeliverables, completedDeliverables, totalDeliverables > 0 ? `${Math.round((completedDeliverables / totalDeliverables) * 100)}%` : '0%'],
    ['Dependencies', dependencies.length, '', ''],
    ['Team Members', teamMembers.filter(m => m.is_active).length, '', ''],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Sheet 2: Workplan Detail
  const workplanRows: (string | number | null)[][] = [
    ['Workstream', 'Code', 'Item', 'Type', 'Start Date', 'End Date', 'Status', 'Assigned To', 'Notes'],
  ];

  const sortedWs = [...workstreams].sort((a, b) => a.sort_order - b.sort_order);
  for (const ws of sortedWs) {
    const wsActivities = activities
      .filter(a => a.workstream_id === ws.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    for (const act of wsActivities) {
      workplanRows.push([
        ws.name,
        act.code,
        act.name,
        'Activity',
        act.start_date,
        act.end_date,
        formatStatus(act.status),
        getMemberName(act.assigned_to, teamMembers),
        act.notes ?? '',
      ]);

      const actTasks = tasks
        .filter(t => t.activity_id === act.id)
        .sort((a, b) => a.sort_order - b.sort_order);

      for (const task of actTasks) {
        workplanRows.push([
          '',
          task.code ?? '',
          `  ${task.name}`,
          'Task',
          task.start_date ?? '',
          task.end_date ?? '',
          formatStatus(task.status),
          getMemberName(task.assigned_to, teamMembers),
          '',
        ]);
      }
    }
  }

  const workplanSheet = XLSX.utils.aoa_to_sheet(workplanRows);
  workplanSheet['!cols'] = [
    { wch: 25 }, { wch: 12 }, { wch: 40 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, workplanSheet, 'Workplan Detail');

  // Sheet 3: Deliverables
  const deliverableRows: (string | number | null)[][] = [
    ['Name', 'Workstream', 'Due Date', 'Status', 'Completion Date', 'Assigned To', 'Description', 'Notes'],
  ];

  const sortedDeliverables = [...deliverables].sort(
    (a, b) => a.due_date.localeCompare(b.due_date),
  );

  for (const del of sortedDeliverables) {
    const ws = workstreams.find(w => w.id === del.workstream_id);
    deliverableRows.push([
      del.name,
      ws?.name ?? '',
      del.due_date,
      formatStatus(del.status),
      del.completion_date ?? '',
      getMemberName(del.assigned_to, teamMembers),
      del.description ?? '',
      del.notes ?? '',
    ]);
  }

  const deliverableSheet = XLSX.utils.aoa_to_sheet(deliverableRows);
  deliverableSheet['!cols'] = [
    { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 14 },
    { wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, deliverableSheet, 'Deliverables');

  // Sheet 4: Dependencies
  const depRows: (string | number | null)[][] = [
    ['Predecessor Type', 'Predecessor', 'Successor Type', 'Successor', 'Dependency Type', 'Violated'],
  ];

  const allItems = new Map<string, { name: string; status: string; end_date: string | null }>();
  for (const a of activities) allItems.set(a.id, { name: a.name, status: a.status, end_date: a.end_date });
  for (const t of tasks) allItems.set(t.id, { name: t.name, status: t.status, end_date: t.end_date });
  for (const d of deliverables) allItems.set(d.id, { name: d.name, status: d.status, end_date: d.due_date });

  for (const dep of dependencies) {
    const pred = allItems.get(dep.predecessor_id);
    const succ = allItems.get(dep.successor_id);
    const violated = pred && succ && pred.status !== 'complete' && succ.status !== 'not_started';

    depRows.push([
      dep.predecessor_type,
      pred?.name ?? dep.predecessor_id,
      dep.successor_type,
      succ?.name ?? dep.successor_id,
      dep.dependency_type,
      violated ? 'Yes' : 'No',
    ]);
  }

  const depSheet = XLSX.utils.aoa_to_sheet(depRows);
  depSheet['!cols'] = [
    { wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, depSheet, 'Dependencies');

  // Download
  const fileName = `Workplan_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
