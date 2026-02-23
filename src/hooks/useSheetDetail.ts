import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { sheetsApi, sheetMembersApi, sheetRowsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import { batchUpdateSheetRowSortOrder } from '@/lib/utils/reorder';
import type { UpdateSheet, CreateSheetMember, CreateSheetRow, UpdateSheetRow, SheetRow } from '@/types';
import { useMemo } from 'react';

export function useSheetDetail(sheetId: string | undefined) {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();

  const realtimeKeys = useMemo(
    () => [
      queryKeys.sheets.detail(sheetId ?? ''),
      queryKeys.sheetRows.bySheet(sheetId ?? ''),
      queryKeys.sheetMembers.bySheet(sheetId ?? ''),
    ],
    [sheetId],
  );
  useRealtimeSubscription('sheets', realtimeKeys);
  useRealtimeSubscription('sheet_rows', realtimeKeys);
  useRealtimeSubscription('sheet_members', realtimeKeys);

  const sheetQuery = useQuery({
    queryKey: queryKeys.sheets.detail(sheetId ?? ''),
    queryFn: () => sheetsApi.getById(sheetId!),
    enabled: !!sheetId,
  });

  const rowsQuery = useQuery({
    queryKey: queryKeys.sheetRows.bySheet(sheetId ?? ''),
    queryFn: () => sheetRowsApi.getBySheet(sheetId!),
    enabled: !!sheetId,
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.sheetMembers.bySheet(sheetId ?? ''),
    queryFn: () => sheetMembersApi.getBySheet(sheetId!),
    enabled: !!sheetId,
  });

  // --- Sheet mutations ---
  const updateSheetMutation = useMutation({
    mutationFn: (data: UpdateSheet) => sheetsApi.update(sheetId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheets.detail(sheetId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.sheets.all() });
      if (sheetId) logEvent({ event_type: 'update', entity_type: 'sheet', entity_id: sheetId });
      toast.success('Sheet updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Row mutations ---
  const createRowMutation = useMutation({
    mutationFn: (data: CreateSheetRow) => sheetRowsApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetRows.bySheet(sheetId ?? '') });
      logEvent({ event_type: 'create', entity_type: 'sheet_row', entity_id: data.id });
      toast.success('Row added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRowMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSheetRow }) => sheetRowsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      const qk = queryKeys.sheetRows.bySheet(sheetId ?? '');
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<SheetRow[]>(qk);
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
        qc.setQueryData(queryKeys.sheetRows.bySheet(sheetId ?? ''), context.prev);
      }
      toast.error(e.message);
    },
    onSuccess: (_data, { id }) => {
      logEvent({ event_type: 'update', entity_type: 'sheet_row', entity_id: id });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetRows.bySheet(sheetId ?? '') });
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: (id: string) => sheetRowsApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetRows.bySheet(sheetId ?? '') });
      logEvent({ event_type: 'delete', entity_type: 'sheet_row', entity_id: id });
      toast.success('Row deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // --- Reorder rows mutation (optimistic, prevents realtime flicker) ---
  const reorderRowsMutation = useMutation({
    mutationFn: (updates: { id: string; sort_order: number; group_id?: string | null }[]) =>
      batchUpdateSheetRowSortOrder(updates),
    onMutate: async (updates) => {
      const qk = queryKeys.sheetRows.bySheet(sheetId ?? '');
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<SheetRow[]>(qk);
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
        qc.setQueryData(queryKeys.sheetRows.bySheet(sheetId ?? ''), context.prev);
      }
      toast.error(e.message || 'Failed to reorder rows');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetRows.bySheet(sheetId ?? '') });
    },
  });

  // --- Member mutations ---
  const addMemberMutation = useMutation({
    mutationFn: (data: CreateSheetMember) => sheetMembersApi.add(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetMembers.bySheet(sheetId ?? '') });
      logEvent({ event_type: 'create', entity_type: 'sheet_member', entity_id: data.id });
      toast.success('Member added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => sheetMembersApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetMembers.bySheet(sheetId ?? '') });
      logEvent({ event_type: 'delete', entity_type: 'sheet_member', entity_id: id });
      toast.success('Member removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    sheet: sheetQuery.data,
    isLoading: sheetQuery.isLoading,
    rows: rowsQuery.data ?? [],
    rowsLoading: rowsQuery.isLoading,
    members: membersQuery.data ?? [],
    membersLoading: membersQuery.isLoading,
    updateSheet: updateSheetMutation.mutateAsync,
    createRow: createRowMutation.mutateAsync,
    updateRow: updateRowMutation.mutateAsync,
    deleteRow: deleteRowMutation.mutateAsync,
    reorderRows: reorderRowsMutation.mutate,
    addMember: addMemberMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
  };
}
