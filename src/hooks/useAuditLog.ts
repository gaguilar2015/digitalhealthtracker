import { useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { insertAuditLog } from '@/lib/api/auditLogs';
import type { AuditEventInput } from '@/lib/api/auditLogs';

export function useAuditLog() {
  const { user } = useAuthContext();

  const logEvent = useCallback((event: Omit<AuditEventInput, 'user_id'>) => {
    if (!user) return;
    insertAuditLog({ ...event, user_id: user.id }).catch(() => {});
  }, [user]);

  return { logEvent };
}
