import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { sheetRowCommentsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateSheetRowComment } from '@/types';

export function useSheetRowComments(sheetId: string | undefined) {
  const qc = useQueryClient();

  const realtimeKeys = useMemo(
    () => [queryKeys.sheetRowComments.bySheet(sheetId ?? '')],
    [sheetId],
  );
  useRealtimeSubscription('sheet_row_comments', realtimeKeys);

  const commentsQuery = useQuery({
    queryKey: queryKeys.sheetRowComments.bySheet(sheetId ?? ''),
    queryFn: () => sheetRowCommentsApi.getBySheet(sheetId!),
    enabled: !!sheetId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSheetRowComment) => sheetRowCommentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetRowComments.bySheet(sheetId ?? '') });
      toast.success('Comment added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sheetRowCommentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sheetRowComments.bySheet(sheetId ?? '') });
      toast.success('Comment deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of commentsQuery.data ?? []) {
      counts[c.sheet_row_id] = (counts[c.sheet_row_id] ?? 0) + 1;
    }
    return counts;
  }, [commentsQuery.data]);

  return {
    comments: commentsQuery.data ?? [],
    commentCounts,
    isLoading: commentsQuery.isLoading,
    createComment: createMutation.mutateAsync,
    deleteComment: deleteMutation.mutateAsync,
  };
}
