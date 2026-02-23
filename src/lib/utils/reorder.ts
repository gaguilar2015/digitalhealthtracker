import * as activitiesApi from '@/lib/api/activities';
import * as tasksApi from '@/lib/api/tasks';
import * as activityGroupsApi from '@/lib/api/activityGroups';
import * as sheetRowsApi from '@/lib/api/sheetRows';
import * as sheetsApi from '@/lib/api/sheets';
import * as sheetGroupsApi from '@/lib/api/sheetGroups';
import * as diagramsApi from '@/lib/api/diagrams';
import * as diagramGroupsApi from '@/lib/api/diagramGroups';
import type { UpdateActivity, UpdateTask, UpdateActivityGroup, UpdateSheetRow, UpdateSheet, UpdateSheetGroup, UpdateDiagram, UpdateDiagramGroup } from '@/types';

interface SortableItem {
  id: string;
  sort_order: number;
}

interface SortUpdate {
  id: string;
  sort_order: number;
}

interface ActivitySortUpdate extends SortUpdate {
  activity_group_id?: string | null;
}

/**
 * Compares a reordered array of IDs against current sort_order values.
 * Returns only items whose sort_order actually changed.
 */
export function computeSortUpdates(
  reorderedIds: string[],
  currentItems: SortableItem[],
): SortUpdate[] {
  const currentMap = new Map(currentItems.map(item => [item.id, item.sort_order]));
  const updates: SortUpdate[] = [];

  reorderedIds.forEach((id, index) => {
    const currentOrder = currentMap.get(id);
    if (currentOrder !== index) {
      updates.push({ id, sort_order: index });
    }
  });

  return updates;
}

export async function batchUpdateActivitySortOrder(
  updates: ActivitySortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order, activity_group_id }) => {
      const data: UpdateActivity = { sort_order };
      if (activity_group_id !== undefined) {
        data.activity_group_id = activity_group_id;
      }
      return activitiesApi.update(id, data);
    }),
  );
}

export async function batchUpdateTaskSortOrder(
  updates: SortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) => {
      const data: UpdateTask = { sort_order };
      return tasksApi.update(id, data);
    }),
  );
}

export async function batchUpdateActivityGroupSortOrder(
  updates: SortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) => {
      const data: UpdateActivityGroup = { sort_order };
      return activityGroupsApi.update(id, data);
    }),
  );
}

interface SheetRowSortUpdate extends SortUpdate {
  group_id?: string | null;
}

export async function batchUpdateSheetRowSortOrder(
  updates: SheetRowSortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order, group_id }) => {
      const data: UpdateSheetRow = { sort_order };
      if (group_id !== undefined) data.group_id = group_id;
      return sheetRowsApi.update(id, data);
    }),
  );
}

interface SheetSortUpdate extends SortUpdate {
  group_id?: string | null;
}

export async function batchUpdateSheetSortOrder(
  updates: SheetSortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order, group_id }) => {
      const data: UpdateSheet = { sort_order };
      if (group_id !== undefined) data.group_id = group_id;
      return sheetsApi.update(id, data);
    }),
  );
}

export async function batchUpdateSheetGroupSortOrder(
  updates: SortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) => {
      const data: UpdateSheetGroup = { sort_order };
      return sheetGroupsApi.update(id, data);
    }),
  );
}

interface DiagramSortUpdate extends SortUpdate {
  group_id?: string | null;
}

export async function batchUpdateDiagramSortOrder(
  updates: DiagramSortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order, group_id }) => {
      const data: UpdateDiagram = { sort_order };
      if (group_id !== undefined) data.group_id = group_id;
      return diagramsApi.update(id, data);
    }),
  );
}

export async function batchUpdateDiagramGroupSortOrder(
  updates: SortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) => {
      const data: UpdateDiagramGroup = { sort_order };
      return diagramGroupsApi.update(id, data);
    }),
  );
}
