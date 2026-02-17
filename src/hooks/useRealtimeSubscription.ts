import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';

export function useRealtimeSubscription(table: string, queryKeysToInvalidate: readonly (readonly unknown[])[]) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        queryKeysToInvalidate.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryKeysToInvalidate]);
}
