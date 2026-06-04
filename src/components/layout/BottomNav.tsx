import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Clock, Building2, DollarSign, Menu, BarChart3, CheckSquare, Settings, LogOut, X, Users, Briefcase, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function BottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { currentUser, dispatch } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const isOwnerOrPartner = currentUser.role === 'owner' || currentUser.role === 'partner';

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
            <div className="p-2 space-y-1">
              {isOwnerOrPartner && (
                <NavLink to="/clients" onClick={() => setIsMoreOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Briefcase size={20} className="text-gray-400" />
                  <span className="font-medium">Clients</span>
                </NavLink>
              )}
              {isOwnerOrPartner && (
                <NavLink to="/quotes" onClick={() => setIsMoreOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <FileText size={20} className="text-gray-400" />
                  <span className="font-medium">Quotes</span>
                </NavLink>
              )}
              {isOwnerOrPartner && (
                <NavLink to="/money" onClick={() => setIsMoreOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <DollarSign size={20} className="text-gray-400" />
                  <span className="font-medium">Money</span>
                </NavLink>
              )}
              {isOwnerOrPartner && (
                <NavLink to="/team" onClick={() => setIsMoreOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Users size={20} className="text-gray-400" />
                  <span className="font-medium">Team</span>
                </NavLink>
              )}
              {isOwnerOrPartner && (
                <NavLink to="/analytics" onClick={() => setIsMoreOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <BarChart3 size={20} className="text-gray-400" />
                  <span className="font-medium">Analytics</span>
                </NavLink>
              )}
              <NavLink to="/tasks" onClick={() => setIsMoreOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                <CheckSquare size={20} className="text-gray-400" />
                <span className="font-medium">Tasks</span>
              </NavLink>
              {isOwnerOrPartner && (
                <NavLink to="/settings" onClick={() => setIsMoreOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Settings size={20} className="text-gray-400" />
                  <span className="font-medium">Settings</span>
                </NavLink>
              )}
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
        <NavLink to="/" end className={navItemClass} onClick={() => setIsMoreOpen(false)}>
          <Home size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>
        <NavLink to="/clock" className={navItemClass} onClick={() => setIsMoreOpen(false)}>
          <Clock size={20} />
          <span className="text-[10px] font-medium">Clock</span>
        </NavLink>
        <NavLink to="/sites" className={navItemClass} onClick={() => setIsMoreOpen(false)}>
          <Building2 size={20} />
          <span className="text-[10px] font-medium">Sites</span>
        </NavLink>
        <NavLink to="/shifts" className={navItemClass} onClick={() => setIsMoreOpen(false)}>
          <CheckSquare size={20} />
          <span className="text-[10px] font-medium">Shifts</span>
        </NavLink>
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
