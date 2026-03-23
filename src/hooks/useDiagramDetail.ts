import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { diagramsApi, diagramMembersApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useAuditLog } from './useAuditLog';
import { toast } from 'sonner';
import type { UpdateDiagram, CreateDiagramMember, DiagramFlowData } from '@/types';
import { useMemo, useCallback, useRef, useEffect } from 'react';

export function useDiagramDetail(diagramId: string | undefined) {
  const qc = useQueryClient();
  const { logEvent } = useAuditLog();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending debounced save on unmount to prevent stale writes
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const realtimeKeys = useMemo(
    () => [
      queryKeys.diagrams.detail(diagramId ?? ''),
      queryKeys.diagramMembers.byDiagram(diagramId ?? ''),
    ],
    [diagramId],
  );
  useRealtimeSubscription('diagrams', realtimeKeys);
  useRealtimeSubscription('diagram_members', realtimeKeys);

  const diagramQuery = useQuery({
    queryKey: queryKeys.diagrams.detail(diagramId ?? ''),
    queryFn: () => diagramsApi.getById(diagramId!),
    enabled: !!diagramId,
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.diagramMembers.byDiagram(diagramId ?? ''),
    queryFn: () => diagramMembersApi.getByDiagram(diagramId!),
    enabled: !!diagramId,
  });

  // Standard update mutation (with toast)
  const updateDiagramMutation = useMutation({
    mutationFn: (data: UpdateDiagram) => diagramsApi.update(diagramId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams.detail(diagramId ?? '') });
      qc.invalidateQueries({ queryKey: queryKeys.diagrams.all() });
      if (diagramId) logEvent({ event_type: 'update', entity_type: 'diagram', entity_id: diagramId });
      toast.success('Diagram updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Silent save mutation for auto-save (no toast)
  const saveFlowDataMutation = useMutation({
    mutationFn: (flowData: DiagramFlowData) => diagramsApi.update(diagramId!, { flow_data: flowData }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams.detail(diagramId ?? '') });
    },
  });

  // Debounced flow data save
  const saveFlowData = useCallback(
    (flowData: DiagramFlowData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveFlowDataMutation.mutate(flowData);
      }, 1000);
    },
    [saveFlowDataMutation],
  );

  // Save legend
  const saveLegendMutation = useMutation({
    mutationFn: (legend: UpdateDiagram['legend']) => diagramsApi.update(diagramId!, { legend }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.diagrams.detail(diagramId ?? '') });
      toast.success('Legend updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Member mutations
  const addMemberMutation = useMutation({
    mutationFn: (data: CreateDiagramMember) => diagramMembersApi.add(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.diagramMembers.byDiagram(diagramId ?? '') });
      logEvent({ event_type: 'create', entity_type: 'diagram_member', entity_id: data.id });
      toast.success('Member added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => diagramMembersApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.diagramMembers.byDiagram(diagramId ?? '') });
      logEvent({ event_type: 'delete', entity_type: 'diagram_member', entity_id: id });
      toast.success('Member removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    diagram: diagramQuery.data,
    isLoading: diagramQuery.isLoading,
    members: membersQuery.data ?? [],
    membersLoading: membersQuery.isLoading,
    updateDiagram: updateDiagramMutation.mutateAsync,
    saveFlowData,
    isSaving: saveFlowDataMutation.isPending,
    saveLegend: saveLegendMutation.mutateAsync,
    addMember: addMemberMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
  };
}
