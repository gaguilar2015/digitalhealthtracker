import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { dependenciesApi } from '@/lib/api';
import { toast } from 'sonner';
import type { CreateDependency, DependencyItemType } from '@/types';

export function useDependencies(itemType?: DependencyItemType, itemId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.dependencies.byItem(itemType ?? '', itemId ?? ''),
    queryFn: () => dependenciesApi.getByItem(itemType!, itemId!),
    enabled: !!itemType && !!itemId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDependency) => dependenciesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dependencies.byItem(itemType ?? '', itemId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.dependencies.all() });
      toast.success('Dependency added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dependenciesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dependencies.byItem(itemType ?? '', itemId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.dependencies.all() });
      toast.success('Dependency removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    dependencies: query.data ?? [],
    isLoading: query.isLoading,
    createDependency: createMutation.mutateAsync,
    deleteDependency: deleteMutation.mutateAsync,
  };
}

export function useAllDependencies() {
  const query = useQuery({
    queryKey: queryKeys.dependencies.all(),
    queryFn: dependenciesApi.getAll,
  });

  return {
    dependencies: query.data ?? [],
    isLoading: query.isLoading,
  };
}
