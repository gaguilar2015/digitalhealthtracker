import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { trackersApi, trackerMembersApi, trackerRowsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import { batchUpdateTrackerRowSortOrder } from '@/lib/utils/reorder';
import type { UpdateTracker, CreateTrackerMember, CreateTrackerRow, UpdateTrackerRow, TrackerRow } from '@/types';
import { useMemo } from 'react';

export function useTrackerDetail(trackerId: string | undefined) {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();

  const realtimeKeys = useMemo(
    () => [
      queryKeys.trackers.detail(trackerId ?? ''),
      queryKeys.trackerRows.byTracker(trackerId ?? ''),
      queryKeys.trackerMembers.byTracker(trackerId ?? ''),
    ],
    [trackerId],
  );
  useRealtimeSubscription('trackers', realtimeKeys);
  useRealtimeSubscription('tracker_rows', realtimeKeys);
  useRealtimeSubscription('tracker_members', realtimeKeys);

  const trackerQuery = useQuery({
    queryKey: queryKeys.trackers.detail(trackerId ?? ''),
    queryFn: () => trackersApi.getById(trackerId!),
    enabled: !!trackerId,
  });

  const rowsQuery = useQuery({
    queryKey: queryKeys.trackerRows.byTracker(trackerId ?? ''),
    queryFn: () => trackerRowsApi.getByTracker(trackerId!),
    enabled: !!trackerId,
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.trackerMembers.byTracker(trackerId ?? ''),
    queryFn: () => trackerMembersApi.getByTracker(trackerId!),
    enabled: !!trackerId,
  });

  // --- Tracker mutations ---
  const updateTrackerMutation = useMutation({
    mutationFn: (data: UpdateTracker) => trackersApi.update(trackerId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackers.detail(trackerId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.trackers.all() });
      if (trackerId) logEvent({ event_type: 'update', entity_type: 'tracker', entity_id: trackerId });
      toast.success('Tracker updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Row mutations ---
  const createRowMutation = useMutation({
    mutationFn: (data: CreateTrackerRow) => trackerRowsApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerRows.byTracker(trackerId ?? '') });
      logEvent({ event_type: 'create', entity_type: 'tracker_row', entity_id: data.id });
      toast.success('Row added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRowMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTrackerRow }) => trackerRowsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      const qk = queryKeys.trackerRows.byTracker(trackerId ?? '');
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<TrackerRow[]>(qk);
      if (prev) {
        qc.setQueryData(qk, prev.map(r =>
          r.id === id ? {
            ...r,
            ...data,
            cells: { ...r.cells, ...data.cells },
            cell_formats: data.cell_formats ? { ...r.cell_formats, ...data.cell_formats } : r.cell_formats,
            group_id: data.group_id !== undefined ? data.group_id : r.group_id,
          } : r,
        ));
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.trackerRows.byTracker(trackerId ?? ''), context.prev);
      }
      toast.error(e.message);
    },
    onSuccess: (_data, { id }) => {
      logEvent({ event_type: 'update', entity_type: 'tracker_row', entity_id: id });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerRows.byTracker(trackerId ?? '') });
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: (id: string) => trackerRowsApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerRows.byTracker(trackerId ?? '') });
      logEvent({ event_type: 'delete', entity_type: 'tracker_row', entity_id: id });
      toast.success('Row deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Reorder rows mutation (optimistic, prevents realtime flicker) ---
  const reorderRowsMutation = useMutation({
    mutationFn: (updates: { id: string; sort_order: number; group_id?: string | null }[]) =>
      batchUpdateTrackerRowSortOrder(updates),
    onMutate: async (updates) => {
      const qk = queryKeys.trackerRows.byTracker(trackerId ?? '');
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<TrackerRow[]>(qk);
      if (prev) {
        const updateMap = new Map(updates.map(u => [u.id, u]));
        qc.setQueryData(qk, prev.map(r => {
          const upd = updateMap.get(r.id);
          if (!upd) return r;
          return {
            ...r,
            sort_order: upd.sort_order,
            ...(upd.group_id !== undefined ? { group_id: upd.group_id } : {}),
          };
        }));
      }
      return { prev };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKeys.trackerRows.byTracker(trackerId ?? ''), context.prev);
      }
      toast.error(e.message || 'Failed to reorder rows');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerRows.byTracker(trackerId ?? '') });
    },
  });

  // --- Member mutations ---
  const addMemberMutation = useMutation({
    mutationFn: (data: CreateTrackerMember) => trackerMembersApi.add(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerMembers.byTracker(trackerId ?? '') });
      logEvent({ event_type: 'create', entity_type: 'tracker_member', entity_id: data.id });
      toast.success('Member added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => trackerMembersApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerMembers.byTracker(trackerId ?? '') });
      logEvent({ event_type: 'delete', entity_type: 'tracker_member', entity_id: id });
      toast.success('Member removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    tracker: trackerQuery.data,
    isLoading: trackerQuery.isLoading,
    rows: rowsQuery.data ?? [],
    rowsLoading: rowsQuery.isLoading,
    members: membersQuery.data ?? [],
    membersLoading: membersQuery.isLoading,
    updateTracker: updateTrackerMutation.mutateAsync,
    createRow: createRowMutation.mutateAsync,
    updateRow: updateRowMutation.mutateAsync,
    deleteRow: deleteRowMutation.mutateAsync,
    reorderRows: reorderRowsMutation.mutate,
    addMember: addMemberMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
  };
}
