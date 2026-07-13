import { useState } from 'react';
import { Bell, CheckCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';

export function ContractNotificationBadge() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const signedContracts = state.sharedContracts.filter(
    c => c.status === 'signed' && !c.notificationDismissedAt
  );

  const handleDismiss = (id: string) => {
    dispatch({
      type: 'UPDATE_SHARED_CONTRACT',
      payload: { id, notificationDismissedAt: new Date().toISOString() }
    });
  };

  const handleDismissAll = () => {
    signedContracts.forEach(c => handleDismiss(c.id));
  };

  if (signedContracts.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
      >
        <Bell size={20} />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {signedContracts.length}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Signed Contracts</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {signedContracts.map(c => (
                <div
                  key={c.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  onClick={() => {
                    handleDismiss(c.id);
                    navigate(`/quotes/${c.quoteId}`);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{c.quoteData.prospectName} signed their contract</p>
                      <p className="text-xs text-gray-500">
                        {c.signedAt && format(new Date(c.signedAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {signedContracts.length > 1 && (
              <div className="p-2 border-t">
                <button
                  onClick={handleDismissAll}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
                >
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
