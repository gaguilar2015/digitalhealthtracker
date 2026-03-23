import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, GanttChart, FolderOpen, Table2, Workflow, BookOpen, Users, Activity, PanelLeftClose, PanelLeftOpen, ShieldCheck, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workplan', label: 'Workplan', icon: ClipboardList },
  { to: '/timeline', label: 'Timeline', icon: GanttChart },
  { to: '/resources', label: 'Resources', icon: FolderOpen },
  { to: '/sheets', label: 'Sheets', icon: Table2 },
  { to: '/diagrams', label: 'Diagrams', icon: Workflow },
  { to: '/guide', label: 'Guide', icon: BookOpen },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const { isAdmin, teamMember, signOut } = useAuth();

  return (
    <aside
      className={clsx(
        'hidden lg:flex lg:flex-col bg-white border-r border-surface-200 transition-all duration-200',
        collapsed ? 'w-14' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="p-5 border-b border-surface-200">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">Health Tracker</h1>
              <p className="text-xs text-gray-400 truncate">BL-L1048 Workplan</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className={clsx('flex-1 p-3 space-y-1 overflow-y-auto', collapsed && 'flex flex-col items-center')}>
        {navItems.map(item =>
          collapsed ? (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'p-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-surface-100',
                )
              }
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </NavLink>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-surface-100',
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      {isAdmin && (
        <div className={clsx('p-3 border-t border-surface-200', collapsed && 'flex flex-col items-center')}>
          {!collapsed && (
            <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
          )}
          <NavLink
            to="/admin/team"
            className={({ isActive }) =>
              clsx(
                'rounded-lg text-sm font-medium transition-all duration-200',
                collapsed
                  ? 'p-2.5'
                  : 'flex items-center gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-surface-100',
              )
            }
            title={collapsed ? 'Team' : undefined}
          >
            <Users className="w-5 h-5" />
            {!collapsed && 'Team'}
          </NavLink>
          <NavLink
            to="/admin/audit-logs"
            className={({ isActive }) =>
              clsx(
                'rounded-lg text-sm font-medium transition-all duration-200',
                collapsed
                  ? 'p-2.5'
                  : 'flex items-center gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-surface-100',
              )
            }
            title={collapsed ? 'Audit Logs' : undefined}
          >
            <ShieldCheck className="w-5 h-5" />
            {!collapsed && 'Audit Logs'}
          </NavLink>
        </div>
      )}

      {/* User profile */}
      <div className={clsx('p-3 border-t border-surface-200', collapsed && 'flex flex-col items-center')}>
        {collapsed ? (
          <>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                clsx(
                  'p-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-surface-100',
                )
              }
              title="Profile"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-[10px] font-semibold text-white">
                {teamMember?.full_name?.charAt(0) ?? <User className="w-3 h-3" />}
              </div>
            </NavLink>
            <button
              onClick={signOut}
              className="p-2.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                {teamMember?.full_name?.charAt(0) ?? <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{teamMember?.full_name ?? 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{teamMember?.email ?? ''}</p>
              </div>
            </div>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-surface-100',
                )
              }
            >
              <Settings className="w-5 h-5" />
              Profile
            </NavLink>
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-surface-100 transition-all duration-200 w-full"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <div className={clsx('p-3 border-t border-surface-200', collapsed && 'flex justify-center')}>
        <button
          onClick={onToggleCollapse}
          className={clsx(
            'rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-600 transition-colors',
            collapsed ? 'p-2.5' : 'flex items-center gap-3 px-3 py-2.5 w-full text-sm',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
