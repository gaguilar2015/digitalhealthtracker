import * as activitiesApi from '@/lib/api/activities';
import * as tasksApi from '@/lib/api/tasks';
import * as activityGroupsApi from '@/lib/api/activityGroups';
import * as trackerRowsApi from '@/lib/api/trackerRows';
import * as trackersApi from '@/lib/api/trackers';
import * as trackerGroupsApi from '@/lib/api/trackerGroups';
import type { UpdateActivity, UpdateTask, UpdateActivityGroup, UpdateTrackerRow, UpdateTracker, UpdateTrackerGroup } from '@/types';

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

interface TrackerRowSortUpdate extends SortUpdate {
  group_id?: string | null;
}

export async function batchUpdateTrackerRowSortOrder(
  updates: TrackerRowSortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order, group_id }) => {
      const data: UpdateTrackerRow = { sort_order };
      if (group_id !== undefined) data.group_id = group_id;
      return trackerRowsApi.update(id, data);
    }),
  );
}

interface TrackerSortUpdate extends SortUpdate {
  group_id?: string | null;
}

export async function batchUpdateTrackerSortOrder(
  updates: TrackerSortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order, group_id }) => {
      const data: UpdateTracker = { sort_order };
      if (group_id !== undefined) data.group_id = group_id;
      return trackersApi.update(id, data);
    }),
  );
}

export async function batchUpdateTrackerGroupSortOrder(
  updates: SortUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) => {
      const data: UpdateTrackerGroup = { sort_order };
      return trackerGroupsApi.update(id, data);
    }),
  );
}
