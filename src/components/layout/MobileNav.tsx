import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, GanttChart, FolderOpen, Table2, Users, X, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workplan', label: 'Workplan', icon: ClipboardList },
  { to: '/timeline', label: 'Timeline', icon: GanttChart },
  { to: '/resources', label: 'Resources', icon: FolderOpen },
  { to: '/trackers', label: 'Trackers', icon: Table2 },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const { isAdmin } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
        <div className="p-5 border-b border-surface-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-base font-bold text-gray-900">Health Tracker</h1>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
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
          ))}
          {isAdmin && (
            <>
              <div className="pt-3 mt-3 border-t border-surface-200">
                <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                <NavLink
                  to="/admin/team"
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-surface-100',
                    )
                  }
                >
                  <Users className="w-5 h-5" />
                  Team
                </NavLink>
              </div>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
