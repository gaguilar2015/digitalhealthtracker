import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { trackerRowCommentsApi } from '@/lib/api';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { CreateTrackerRowComment } from '@/types';

export function useTrackerRowComments(trackerId: string | undefined) {
  const qc = useQueryClient();

  const realtimeKeys = useMemo(
    () => [queryKeys.trackerRowComments.byTracker(trackerId ?? '')],
    [trackerId],
  );
  useRealtimeSubscription('tracker_row_comments', realtimeKeys);

  const commentsQuery = useQuery({
    queryKey: queryKeys.trackerRowComments.byTracker(trackerId ?? ''),
    queryFn: () => trackerRowCommentsApi.getByTracker(trackerId!),
    enabled: !!trackerId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTrackerRowComment) => trackerRowCommentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerRowComments.byTracker(trackerId ?? '') });
      toast.success('Comment added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trackerRowCommentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trackerRowComments.byTracker(trackerId ?? '') });
      toast.success('Comment deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of commentsQuery.data ?? []) {
      counts[c.tracker_row_id] = (counts[c.tracker_row_id] ?? 0) + 1;
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
