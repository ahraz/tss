import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function PwaUpdatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (reg: ServiceWorkerRegistration) => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          // New SW installed but there's already an active controller → update ready
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setShow(true);
          }
        });
      });
    };

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg && handler(reg));
  }, []);

  const handleUpdate = () => {
    setShow(false);
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-gray-900 text-white rounded-xl shadow-lg p-4 flex items-center gap-3">
        <RefreshCw size={18} className="text-blue-400 shrink-0" />
        <p className="text-sm flex-1">A new version is available.</p>
        <button
          onClick={handleUpdate}
          className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          Refresh
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
