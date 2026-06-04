import { NavLink } from 'react-router-dom';
import { Sparkles, LayoutDashboard, Clock, ClipboardList, Building2, DollarSign, BarChart3, CheckSquare, Settings, LogOut, Users, Briefcase, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../ui/UserAvatar';
import { Badge } from '../ui/Badge';

export function Sidebar() {
  const { currentUser, dispatch } = useApp();

  if (!currentUser) return null;

  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clock', icon: Clock, label: 'Clock In/Out' },
    { to: '/shifts', icon: ClipboardList, label: 'Shifts' },
    { to: '/sites', icon: Building2, label: 'Sites' },
    ...(isOwnerOrPartner ? [
      { to: '/clients', icon: Briefcase, label: 'Clients' },
      { to: '/quotes', icon: FileText, label: 'Quotes' },
      { to: '/team', icon: Users, label: 'Team' },
      { to: '/money', icon: DollarSign, label: 'Money Book' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    ] : []),
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    ...(isOwnerOrPartner ? [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ] : []),
  ];

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-gray-900 text-gray-300 flex-shrink-0">
      <div className="p-6 flex items-center gap-3 text-white font-bold text-xl tracking-tight">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <Sparkles size={20} className="text-white" />
        </div>
        TSS Cleaners
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
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
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4">
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
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
