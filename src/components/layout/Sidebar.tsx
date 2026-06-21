import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, Settings, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../ui/UserAvatar';
import { Badge } from '../ui/Badge';
import { groupedLinks, sectionLabels } from './navLinks';
import type { NavSection } from './navLinks';

export function Sidebar() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentUser, dispatch } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';
  const isOwner = currentUser.role === 'owner';
  const groups = groupedLinks(isOwnerOrPartner, isOwner, currentUser.role);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

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

  const showSettings = isOwner;

  const sectionOrder: NavSection[] = ['main', 'management', 'operations', 'sales'];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-gray-900 text-gray-300 flex-shrink-0">
      <div className="p-6 flex items-center gap-3 text-white font-bold text-xl tracking-tight">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <Sparkles size={20} className="text-white" />
        </div>
        GTA Scrub
      </div>

      <nav className="flex-1 px-3 overflow-y-auto space-y-6">
        {sectionOrder.map(section => {
          const sectionLinks = groups.get(section);
          if (!sectionLinks || sectionLinks.length === 0) return null;
          return (
            <div key={section}>
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                {sectionLabels[section]}
              </p>
              <div className="space-y-0.5">
                {sectionLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    <link.icon size={18} />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User profile with dropdown */}
      <div className="p-4 border-t border-gray-800 relative" ref={menuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
        >
          <UserAvatar user={currentUser} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
            <div className="mt-0.5">
              <Badge 
                label={currentUser.role} 
                variant={currentUser.role === 'owner' ? 'warning' : currentUser.role === 'partner' ? 'info' : 'neutral'}
                className="bg-gray-800 text-xs py-0"
              />
            </div>
          </div>
        </button>

        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
            <NavLink
              to="/profile"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <User size={16} />
              Profile
            </NavLink>
            {showSettings && (
              <NavLink
                to="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <Settings size={16} />
                Settings
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-gray-700 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
