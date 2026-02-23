import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { diagramGroupsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateDiagramGroup, UpdateDiagramGroup } from '@/types';
import { useMemo } from 'react';

export function useDiagramGroups() {
  const qc = useQueryClient();
  const keys = useMemo(() => [queryKeys.diagramGroups.all()], []);
  useRealtimeSubscription('diagram_groups', keys);

  const query = useQuery({
    queryKey: queryKeys.diagramGroups.all(),
    queryFn: diagramGroupsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDiagramGroup) => diagramGroupsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagramGroups.all() });
      toast.success('Group created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiagramGroup }) => diagramGroupsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagramGroups.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => diagramGroupsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagramGroups.all() });
      // ON DELETE SET NULL modifies diagrams, so refresh them too
      qc.invalidateQueries({ queryKey: queryKeys.diagrams.all() });
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
