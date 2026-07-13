import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { ArrowLeft, User, LogOut, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../ui/UserAvatar';
import { Logo } from '../../assets/Logo';
import { ContractNotificationBadge } from '../notifications/ContractNotificationBadge';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentUser, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isDetail = location.pathname.split('/').length > 2;

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isUserMenuOpen]);

  if (!currentUser) return null;

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  const showSettings = currentUser.role === 'owner' || currentUser.role === 'partner';

  return (
    <header className="md:hidden sticky top-0 h-14 bg-white border-b border-gray-100 shadow-sm z-20 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        {isDetail ? (
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-6" />
        )}
        {title ? (
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
        ) : (
          <Logo size={32} variant="full" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <ContractNotificationBadge />
        <div className="relative" ref={menuRef}>
        <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
          <UserAvatar user={currentUser} size="sm" />
        </button>

        {isUserMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
            <NavLink
              to="/profile"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User size={16} className="text-gray-400" />
              Profile
            </NavLink>
            {showSettings && (
              <NavLink
                to="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings size={16} className="text-gray-400" />
                Settings
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-gray-50 transition-colors border-t border-gray-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
