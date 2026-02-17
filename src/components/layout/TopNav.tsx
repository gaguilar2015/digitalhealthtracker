import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TopNavProps {
  onToggleMobile: () => void;
}

export default function TopNav({ onToggleMobile }: TopNavProps) {
  const { teamMember, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-14 border-b border-surface-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button onClick={onToggleMobile} className="lg:hidden p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <span className="lg:hidden text-sm font-semibold text-gray-900">Health Tracker</span>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-sm font-semibold text-white">
            {teamMember?.full_name?.charAt(0) ?? <User className="w-4 h-4" />}
          </div>
          <span className="hidden sm:block text-sm text-gray-700">{teamMember?.full_name ?? 'User'}</span>
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-1 w-48 bg-white/95 backdrop-blur-xl border border-surface-200 rounded-xl shadow-lg py-1 z-50">
            <Link
              to="/profile"
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-surface-100 transition-colors"
            >
              <Settings className="w-4 h-4" /> Profile
            </Link>
            <button
              onClick={() => { setShowMenu(false); signOut(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-surface-100 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
