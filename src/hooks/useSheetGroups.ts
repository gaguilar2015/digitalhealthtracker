import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { sheetGroupsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateSheetGroup, UpdateSheetGroup } from '@/types';
import { useMemo } from 'react';

export function useSheetGroups() {
  const qc = useQueryClient();
  const keys = useMemo(() => [queryKeys.sheetGroups.all()], []);
  useRealtimeSubscription('sheet_groups', keys);

  const query = useQuery({
    queryKey: queryKeys.sheetGroups.all(),
    queryFn: sheetGroupsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSheetGroup) => sheetGroupsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetGroups.all() });
      toast.success('Group created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSheetGroup }) => sheetGroupsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetGroups.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sheetGroupsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetGroups.all() });
      // ON DELETE SET NULL modifies sheet rows, so refresh them too
      qc.invalidateQueries({ queryKey: queryKeys.sheets.all() });
      toast.success('Group deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    createGroup: createMutation.mutateAsync,
    updateGroup: updateMutation.mutateAsync,
    deleteGroup: deleteMutation.mutateAsync,
  };
}
