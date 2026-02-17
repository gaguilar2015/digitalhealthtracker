import { supabase } from '../supabase';

export interface AuditEventInput {
  user_id: string;
  event_type: 'login' | 'logout' | 'page_view' | 'heartbeat' | 'create' | 'update' | 'delete';
  entity_type?: string;
  entity_id?: string;
  page?: string;
}

export interface AuditLogFilters {
  userId?: string;
  eventType?: string;
  from?: string;
  to?: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  page: string | null;
  created_at: string;
  team_members: { full_name: string | null; email: string } | null;
}

export async function insertAuditLog(data: AuditEventInput): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert(data);
  if (error) throw new Error(error.message);
}

export async function fetchAuditLogs(filters?: AuditLogFilters): Promise<AuditLogRow[]> {
  let query = supabase
    .from('audit_logs')
    .select('*, team_members(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  if (filters?.from) {
    query = query.gte('created_at', filters.from);
  }
  if (filters?.to) {
    // include the full end day
    query = query.lte('created_at', filters.to + 'T23:59:59.999Z');
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLogRow[];
}
