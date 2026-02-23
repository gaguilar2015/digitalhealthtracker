import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { diagramsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { CreateDiagram, UpdateDiagram } from '@/types';
import { useMemo } from 'react';

export function useDiagrams() {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();
  const keys = useMemo(() => [queryKeys.diagrams.all()], []);
  useRealtimeSubscription('diagrams', keys);

  const query = useQuery({
    queryKey: queryKeys.diagrams.all(),
    queryFn: diagramsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDiagram) => diagramsApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams.all() });
      logEvent({ event_type: 'create', entity_type: 'diagram', entity_id: data.id });
      toast.success('Diagram created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiagram }) => diagramsApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams.all() });
      logEvent({ event_type: 'update', entity_type: 'diagram', entity_id: id });
      toast.success('Diagram updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => diagramsApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams.all() });
      logEvent({ event_type: 'delete', entity_type: 'diagram', entity_id: id });
      toast.success('Diagram deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    diagrams: query.data ?? [],
    isLoading: query.isLoading,
    createDiagram: createMutation.mutateAsync,
    updateDiagram: updateMutation.mutateAsync,
    deleteDiagram: deleteMutation.mutateAsync,
  };
}
