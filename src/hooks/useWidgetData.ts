import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { sheetRowsApi } from '@/lib/api';
import type { SheetRow } from '@/types';

export function useWidgetData(sheetIds: string[]) {
  const uniqueIds = [...new Set(sheetIds)];

  const queries = useQueries({
    queries: uniqueIds.map(id => ({
      queryKey: queryKeys.sheetRows.bySheet(id),
      queryFn: () => sheetRowsApi.getBySheet(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const rowsBySheet = new Map<string, SheetRow[]>();
  for (let i = 0; i < uniqueIds.length; i++) {
    const q = queries[i];
    if (q.data) {
      rowsBySheet.set(uniqueIds[i], q.data);
    }
  }

  const isLoading = queries.some(q => q.isLoading);

  return { rowsBySheet, isLoading };
}
