import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../ui/UserAvatar';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isDetail = location.pathname.split('/').length > 2;

  if (!currentUser) return null;

  return (
    <header className="md:hidden sticky top-0 h-14 bg-white border-b border-gray-100 shadow-sm z-20 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        {isDetail ? (
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-gray-600 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-6" /> // spacer to balance avatar
        )}
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {title || 'TSS Cleaners'}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-gray-500 hover:text-gray-700">
          <Bell size={20} />
        </button>
        <UserAvatar user={currentUser} size="sm" />
      </div>
    </header>
  );
}
