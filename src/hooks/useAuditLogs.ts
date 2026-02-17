import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchAuditLogs } from '@/lib/api/auditLogs';
import type { AuditLogFilters } from '@/lib/api/auditLogs';

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(filters as Record<string, unknown> | undefined),
    queryFn: () => fetchAuditLogs(filters),
  });
}
