import toast from 'react-hot-toast';

let permissionRequested = false;

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  if (Notification.permission === 'denied') return Promise.resolve(false);
  if (permissionRequested) return Promise.resolve(false);
  permissionRequested = true;
  return Notification.requestPermission().then(p => p === 'granted');
}

export function isPageVisible(): boolean {
  return !document.hidden;
}

export function showNotification(title: string, body: string, link?: string): void {
  if (isPageVisible()) {
    toast.success(body, { duration: 4000 });
    return;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    toast.success(body, { duration: 4000 });
    return;
  }

  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: 'app-notification',
    });

    notif.onclick = () => {
      window.focus();
      if (link) {
        window.location.hash = link;
      }
      notif.close();
    };
  } catch {
    toast.success(body, { duration: 4000 });
  }
}
