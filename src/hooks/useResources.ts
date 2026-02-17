import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { resourcesApi } from '@/lib/api';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { CreateResource, UpdateResource } from '@/types';

export function useResources() {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();

  const query = useQuery({
    queryKey: queryKeys.resources.all(),
    queryFn: resourcesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateResource) => resourcesApi.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.resources.all() });
      logEvent({ event_type: 'create', entity_type: 'resource', entity_id: data.id });
      toast.success('Resource created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResource }) => resourcesApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.resources.all() });
      logEvent({ event_type: 'update', entity_type: 'resource', entity_id: id });
      toast.success('Resource updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resourcesApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.resources.all() });
      logEvent({ event_type: 'delete', entity_type: 'resource', entity_id: id });
      toast.success('Resource deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    resources: query.data ?? [],
    isLoading: query.isLoading,
    createResource: createMutation.mutateAsync,
    updateResource: updateMutation.mutateAsync,
    deleteResource: deleteMutation.mutateAsync,
  };
}
