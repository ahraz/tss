import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { linksForRole } from './navLinks';

export function BottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { currentUser, dispatch } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const links = linksForRole(
    currentUser.role === 'owner' || currentUser.role === 'partner',
    currentUser.role === 'owner',
    currentUser.role
  );

  const bottomBarLinks = links.filter(l => l.mobileBar || l.to === '/');

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 ${
      isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
    }`;

  return (
    <>
      {/* More Drawer */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMoreOpen(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl animate-slide-up pb-safe-bottom">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">More Options</h3>
              <button onClick={() => setIsMoreOpen(false)} className="p-2 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  <link.icon size={20} className="text-gray-400" />
                  <span className="font-medium">{link.label}</span>
                </NavLink>
              ))}
              <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-red-600">
                <LogOut size={20} className="text-red-500" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-30 pb-safe-bottom flex">
        {bottomBarLinks.map(link => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className={navItemClass} onClick={() => setIsMoreOpen(false)}>
            <link.icon size={20} />
            <span className="text-[10px] font-medium">{link.label === 'Clock In/Out' ? 'Clock' : link.label === 'My Profile' ? 'Profile' : link.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isMoreOpen ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}
