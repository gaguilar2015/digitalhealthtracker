import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useAuditLog } from '@/hooks/useAuditLog';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { logEvent } = useAuditLog();

  useEffect(() => {
    logEvent({ event_type: 'page_view', page: location.pathname });
  }, [location.pathname, logEvent]);

  useEffect(() => {
    const interval = setInterval(() => {
      logEvent({ event_type: 'heartbeat' });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [logEvent]);

  return (
    <div className="h-screen flex bg-surface-50">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(prev => !prev)} />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile-only hamburger */}
        <div className="lg:hidden flex items-center h-12 px-3 border-b border-surface-200 bg-white/80 backdrop-blur-sm">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="ml-2 text-sm font-semibold text-gray-900">Health Tracker</span>
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
