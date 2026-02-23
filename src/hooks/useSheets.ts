import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { sheetsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { CreateSheet, UpdateSheet } from '@/types';
import { useMemo } from 'react';

export function useSheets() {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();
  const keys = useMemo(() => [queryKeys.sheets.all()], []);
  useRealtimeSubscription('sheets', keys);

  const query = useQuery({
    queryKey: queryKeys.sheets.all(),
    queryFn: sheetsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSheet) => sheetsApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.sheets.all() });
      logEvent({ event_type: 'create', entity_type: 'sheet', entity_id: data.id });
      toast.success('Sheet created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSheet }) => sheetsApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.sheets.all() });
      logEvent({ event_type: 'update', entity_type: 'sheet', entity_id: id });
      toast.success('Sheet updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sheetsApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.sheets.all() });
      logEvent({ event_type: 'delete', entity_type: 'sheet', entity_id: id });
      toast.success('Sheet deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    sheets: query.data ?? [],
    isLoading: query.isLoading,
    createSheet: createMutation.mutateAsync,
    updateSheet: updateMutation.mutateAsync,
    deleteSheet: deleteMutation.mutateAsync,
  };
}
