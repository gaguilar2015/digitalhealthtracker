import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { dashboardWidgetsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateDashboardWidget, UpdateDashboardWidget } from '@/types';
import { useMemo } from 'react';

export function useDashboardWidgets() {
  const qc = useQueryClient();
  const keys = useMemo(() => [queryKeys.dashboardWidgets.all()], []);
  useRealtimeSubscription('dashboard_widgets', keys);

  const query = useQuery({
    queryKey: queryKeys.dashboardWidgets.all(),
    queryFn: dashboardWidgetsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDashboardWidget) => dashboardWidgetsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dashboardWidgets.all() });
      toast.success('Chart added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDashboardWidget }) =>
      dashboardWidgetsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dashboardWidgets.all() });
      toast.success('Chart updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dashboardWidgetsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dashboardWidgets.all() });
      toast.success('Chart deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    widgets: query.data ?? [],
    isLoading: query.isLoading,
    createWidget: createMutation.mutateAsync,
    updateWidget: updateMutation.mutateAsync,
    deleteWidget: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
