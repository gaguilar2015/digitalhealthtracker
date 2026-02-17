import { useState, useMemo } from 'react';
import { Pencil, UserX, UserCheck, ArrowUpDown, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { Avatar, SearchInput } from '@/components/shared';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { TeamMember } from '@/types';

interface TeamTableProps {
  members: TeamMember[];
  onEdit: (member: TeamMember) => void;
  onDeactivate: (member: TeamMember) => void;
  onReactivate: (member: TeamMember) => void;
  onResendInvite: (member: TeamMember) => void;
}

type SortField = 'full_name' | 'email' | 'permission_level' | 'is_active' | 'last_login_at';
type SortDir = 'asc' | 'desc';

const PERMISSION_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const PERMISSION_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-700',
};

export function TeamTable({ members, onEdit, onDeactivate, onReactivate, onResendInvite }: TeamTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('full_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const isMobile = useMediaQuery('(max-width: 768px)');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = members;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        m => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
      );
    }
    result = [...result].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [members, search, sortField, sortDir]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
    >
      {children}
      <ArrowUpDown className={clsx('w-3 h-3', sortField === field && 'text-primary-600')} />
    </button>
  );

  if (isMobile) {
    return (
      <div className="space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
        {filtered.map(member => (
          <div key={member.id} className="bg-white rounded-xl shadow-sm border border-surface-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={member.full_name} url={member.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{member.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{member.email}</p>
              </div>
              <span
                className={clsx(
                  'inline-block px-2 py-0.5 text-xs font-medium rounded-full',
                  PERMISSION_COLORS[member.permission_level],
                )}
              >
                {PERMISSION_LABELS[member.permission_level]}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full',
                    member.is_active ? 'bg-green-400' : 'bg-gray-300',
                  )}
                />
                <span>{member.is_active ? 'Active' : 'Inactive'}</span>
                {member.title && <span className="text-gray-300">|</span>}
                {member.title && <span>{member.title}</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(member)}
                  className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {member.last_login_at === null && (
                  <button
                    onClick={() => onResendInvite(member)}
                    className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-primary-600"
                    title="Resend Invite"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
                {member.is_active ? (
                  <button
                    onClick={() => onDeactivate(member)}
                    className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onReactivate(member)}
                    className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-green-600"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-surface-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-surface-50">
              <th className="px-4 py-3 text-left">
                <SortHeader field="full_name">Name</SortHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="email">Email</SortHeader>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="permission_level">Permission</SortHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="is_active">Status</SortHeader>
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="last_login_at">Last Login</SortHeader>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(member => (
              <tr key={member.id} className="hover:bg-surface-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={member.full_name} url={member.avatar_url} size="sm" />
                    <span className="text-sm font-medium text-gray-900">{member.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{member.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{member.title ?? '-'}</td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'inline-block px-2 py-0.5 text-xs font-medium rounded-full',
                      PERMISSION_COLORS[member.permission_level],
                    )}
                  >
                    {PERMISSION_LABELS[member.permission_level]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={clsx(
                        'w-2 h-2 rounded-full',
                        member.is_active ? 'bg-green-400' : 'bg-gray-300',
                      )}
                    />
                    <span className="text-sm text-gray-600">
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {member.last_login_at
                    ? formatDistanceToNow(new Date(member.last_login_at), { addSuffix: true })
                    : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(member)}
                      className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {member.last_login_at === null && (
                      <button
                        onClick={() => onResendInvite(member)}
                        className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-primary-600"
                        title="Resend Invite"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {member.is_active ? (
                      <button
                        onClick={() => onDeactivate(member)}
                        className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600"
                        title="Deactivate"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onReactivate(member)}
                        className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-green-600"
                        title="Reactivate"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
