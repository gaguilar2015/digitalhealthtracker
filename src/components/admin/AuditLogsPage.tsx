import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { SkeletonLoader } from '@/components/shared';
import { format } from 'date-fns';
import type { AuditLogFilters } from '@/lib/api/auditLogs';

const EVENT_TYPES = ['login', 'logout', 'page_view', 'heartbeat', 'create', 'update', 'delete'] as const;

const EVENT_BADGE_COLORS: Record<string, string> = {
  login:     'bg-green-100 text-green-700',
  logout:    'bg-gray-100 text-gray-700',
  page_view: 'bg-blue-100 text-blue-700',
  heartbeat: 'bg-purple-100 text-purple-700',
  create:    'bg-emerald-100 text-emerald-700',
  update:    'bg-amber-100 text-amber-700',
  delete:    'bg-red-100 text-red-700',
};

function EventBadge({ type }: { type: string }) {
  const color = EVENT_BADGE_COLORS[type] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {type.replace('_', ' ')}
    </span>
  );
}

export default function AuditLogsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { members } = useTeamMembers();

  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters: AuditLogFilters = {};
  if (userId) filters.userId = userId;
  if (eventType) filters.eventType = eventType;
  if (from) filters.from = from;
  if (to) filters.to = to;

  const { data: logs, isLoading } = useAuditLogs(filters);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-6 h-6 text-primary-600" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">Track user activity across the application</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-surface-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">From</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">To</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Event type</label>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All events</option>
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">User</label>
          <select
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All users</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
            ))}
          </select>
        </div>
        {(userId || eventType || from || to) && (
          <div className="flex flex-col justify-end">
            <button
              onClick={() => { setUserId(''); setEventType(''); setFrom(''); setTo(''); }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Result count */}
      {!isLoading && logs && (
        <p className="text-sm text-gray-500 mb-3">
          {logs.length === 500 ? '500+ results (showing first 500)' : `${logs.length} result${logs.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Table */}
      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <SkeletonLoader count={8} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Event type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Entity type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Entity ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {logs && logs.length > 0 ? (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3">
                        {log.team_members ? (
                          <div>
                            <div className="font-medium text-gray-900">{log.team_members.full_name || '—'}</div>
                            <div className="text-xs text-gray-500">{log.team_members.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs font-mono">{log.user_id?.slice(0, 8) ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <EventBadge type={log.event_type} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.entity_type ?? '—'}</td>
                      <td className="px-4 py-3">
                        {log.entity_id ? (
                          <span className="font-mono text-xs text-gray-500" title={log.entity_id}>
                            {log.entity_id.slice(0, 8)}…
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.page ?? '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      No audit log entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
