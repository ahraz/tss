import { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';

export function NotificationBadge() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = state.notifications.filter(n => !n.read);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleDismiss = (id: string) => {
    dispatch({ type: 'UPDATE_NOTIFICATION', payload: { id, read: true } });
  };

  const handleDismissAll = () => {
    unread.forEach(n => handleDismiss(n.id));
  };

  if (unread.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
      >
        <Bell size={20} />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {unread.length > 9 ? '9+' : unread.length}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 md:left-0 md:right-auto top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {unread.map(n => (
                <div
                  key={n.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  onClick={() => {
                    handleDismiss(n.id);
                    navigate(n.link);
                    setIsOpen(false);
                  }}
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {unread.length > 1 && (
              <div className="p-2 border-t">
                <button onClick={handleDismissAll} className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">
                  Dismiss All
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
