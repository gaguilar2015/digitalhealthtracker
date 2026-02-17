import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
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
        <TopNav onToggleMobile={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
