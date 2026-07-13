# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Firestore-triggered push notifications for contract signing, quote acceptance/rejection, and payroll pending events.

**Architecture:** New `notifications` Firestore collection. Events write notification docs which are picked up by the app's `onSnapshot` listener. Foreground shows toast, background shows OS Notification API. All managed client-side — no backend server.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, Notification API, react-hot-toast

## Global Constraints

- No Firebase Functions or backend server — 100% client-side
- Uses Notification API (not FCM) for OS notifications
- Notification permission requested once on app init
- PWA must stay on `generateSW` strategy (vite-plugin-pwa)
- Existing Firestore onSnapshot pattern for real-time sync
- Owner/partner roles only for notifications

---

## File Structure

| File | Purpose |
|------|---------|
| `src/types/notification.ts` | AppNotification type + notification content map |
| `src/services/notificationService.ts` | Permission request, foreground/background detection, show toast/OS notification |
| `src/components/notifications/NotificationBadge.tsx` | Replaces ContractNotificationBadge — all notification types, grouped by type |
| `src/types/index.ts` | Export AppNotification |
| `src/context/AppContext.tsx` | Add notifications to state + reducer + request permission on init |
| `src/lib/firebaseSync.ts` | Add `notifications` to fetch/sync/actions |
| `src/pages/ShareContractPage.tsx` | Write notification doc after signing |
| `src/pages/QuoteDetailPage.tsx` | Write notification doc on status change |
| `src/pages/MoneyBookPage.tsx` | Write notification doc when payroll is ready |
| `src/components/layout/Sidebar.tsx` | Use NotificationBadge |
| `src/components/layout/TopBar.tsx` | Use NotificationBadge |
| `firestore.rules` | Add notifications rules |
| `src/components/notifications/ContractNotificationBadge.tsx` | DELETE |

---

## Task 1: AppNotification Type + Firestore Rules

**Files:**
- Create: `src/types/notification.ts`
- Modify: `src/types/index.ts`
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: None
- Produces: `AppNotification` type, `NOTIFICATION_CONTENT` map, `firestore.rules` for notifications

- [ ] **Step 1: Create AppNotification type**

```typescript
// src/types/notification.ts
export type NotificationType = 'contract_signed' | 'quote_accepted' | 'quote_rejected' | 'payroll_pending';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
  userId: string;
}

export const NOTIFICATION_CONTENT: Record<NotificationType, (params: { prospectName?: string; quoteId?: string; count?: number }) => { title: string; body: string; link: string }> = {
  contract_signed: ({ prospectName = 'A client', quoteId = '' }) => ({
    title: 'Contract Signed',
    body: `${prospectName} signed their contract`,
    link: `/quotes/${quoteId}`,
  }),
  quote_accepted: ({ prospectName = 'A client', quoteId = '' }) => ({
    title: 'Quote Accepted',
    body: `${prospectName} accepted the quote`,
    link: `/quotes/${quoteId}`,
  }),
  quote_rejected: ({ prospectName = 'A client', quoteId = '' }) => ({
    title: 'Quote Rejected',
    body: `${prospectName} rejected the quote`,
    link: `/quotes/${quoteId}`,
  }),
  payroll_pending: ({ count = 1 }) => ({
    title: 'Payroll Pending',
    body: `${count} employee(s) ready for approval`,
    link: '/money',
  }),
};
```

- [ ] **Step 2: Add export to types/index.ts**

```typescript
export type { AppNotification, NotificationType } from './notification';
export { NOTIFICATION_CONTENT } from './notification';
```

- [ ] **Step 3: Update Firestore rules**

Add before the closing `}` in `firestore.rules`:
```
match /notifications/{docId} {
  allow read, write: if request.auth != null;
}
```

- [ ] **Step 4: Verify tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/types/notification.ts src/types/index.ts firestore.rules
git commit -m "feat: add AppNotification type and Firestore rules"
```

---

## Task 2: NotificationService Utility

**Files:**
- Create: `src/services/notificationService.ts`

**Interfaces:**
- Consumes: None (standalone utility)
- Produces: `requestNotificationPermission()`, `showNotification(type, body, link)`, `isPageVisible()` — used by event trigger tasks

- [ ] **Step 1: Create notificationService.ts**

```typescript
// src/services/notificationService.ts
import toast from 'react-hot-toast';

let permissionRequested = false;

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  if (Notification.permission === 'denied') return Promise.resolve(false);
  if (permissionRequested) return Promise.resolve(Notification.permission === 'granted');
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
```

- [ ] **Step 2: Verify tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/services/notificationService.ts
git commit -m "feat: add notification service with permission and foreground/background detection"
```

---

## Task 3: Add Notifications to State + Sync

**Files:**
- Modify: `src/context/AppContext.tsx`
- Modify: `src/lib/firebaseSync.ts`

**Interfaces:**
- Consumes: `AppNotification` type
- Produces: `state.notifications` array, `SET_NOTIFICATIONS` / `ADD_NOTIFICATION` / `UPDATE_NOTIFICATION` actions

- [ ] **Step 1: Add notifications to AppState**

In `src/context/AppContext.tsx`, add to `initialState`:
```typescript
notifications: [],
```

- [ ] **Step 2: Add reducer cases**

```typescript
case 'SET_NOTIFICATIONS':
  return { ...state, notifications: action.payload };
case 'ADD_NOTIFICATION':
  return { ...state, notifications: [...state.notifications, action.payload] };
case 'UPDATE_NOTIFICATION':
  return { ...state, notifications: state.notifications.map(n => n.id === action.payload.id ? { ...n, ...action.payload } : n) };
```

- [ ] **Step 3: Add to fetchAllCollectionsOnce**

In `src/lib/firebaseSync.ts`, add to the Promise.all:
```typescript
getDocs(collection(db, 'notifications')),
```
After mapping other collections:
```typescript
const notifications = notificationsSnap.docs.map(d => docToObj<AppNotification>(d));
```
Add to the return:
```typescript
return { ..., notifications };
```

- [ ] **Step 4: Add to subscribeToCollections**

```typescript
const unsubNotifications = onSnapshot(
  collection(db, 'notifications'),
  (snapshot) => {
    const list: AppNotification[] = [];
    snapshot.forEach(doc => list.push(docToObj<AppNotification>(doc)));
    dispatch({ type: 'SET_NOTIFICATIONS', payload: list });
  },
  (err) => onError?.('notifications', err)
);
```

Add `unsubNotifications()` to the cleanup return.

- [ ] **Step 5: Request notification permission on init**

In AppContext's init useEffect, after the try block or near the anonymous auth:
```typescript
if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
  requestNotificationPermission();
}
```
Import: `import { requestNotificationPermission } from '../services/notificationService';`

- [ ] **Step 6: Add UPDATE_NOTIFICATION to syncActionToFirestore**

```typescript
case 'ADD_NOTIFICATION':
case 'UPDATE_NOTIFICATION':
  if (!action.payload.id) return;
  await setDoc(doc(db, 'notifications', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
  break;
```

- [ ] **Step 7: Verify tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 8: Commit**

```bash
git add src/context/AppContext.tsx src/lib/firebaseSync.ts
git commit -m "feat: add notifications to app state and Firestore sync"
```

---

## Task 4: NotificationBadge Component

**Files:**
- Create: `src/components/notifications/NotificationBadge.tsx`
- Delete: `src/components/notifications/ContractNotificationBadge.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/TopBar.tsx`

**Interfaces:**
- Consumes: `state.notifications` from AppContext
- Produces: Reusable badge component with bell, count, and dropdown

- [ ] **Step 1: Create NotificationBadge.tsx**

```typescript
// src/components/notifications/NotificationBadge.tsx
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
```

- [ ] **Step 2: Delete ContractNotificationBadge**

```bash
rm src/components/notifications/ContractNotificationBadge.tsx
```

- [ ] **Step 3: Update Sidebar.tsx imports**

Change the import from:
```typescript
import { ContractNotificationBadge } from '../notifications/ContractNotificationBadge';
```
To:
```typescript
import { NotificationBadge } from '../notifications/NotificationBadge';
```

Update JSX:
```typescript
{isOwnerOrPartner && <NotificationBadge />}
```

- [ ] **Step 4: Update TopBar.tsx imports**

Same import change, update JSX.

- [ ] **Step 5: Verify tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/components/notifications/NotificationBadge.tsx src/components/notifications/ContractNotificationBadge.tsx src/components/layout/Sidebar.tsx src/components/layout/TopBar.tsx
git commit -m "feat: add NotificationBadge replacing ContractNotificationBadge"
```

---

## Task 5: Event Triggers — Write Notification Docs

**Files:**
- Modify: `src/pages/ShareContractPage.tsx`
- Modify: `src/pages/QuoteDetailPage.tsx`
- Modify: `src/pages/MoneyBookPage.tsx`

**Interfaces:**
- Consumes: `AppNotification`, `NOTIFICATION_CONTENT`, `showNotification`, `generateId` from utils
- Produces: Firestore writes to `notifications` collection on events

- [ ] **Step 1: Add notification write to ShareContractPage**

In `handleSignAndSubmit`, after the successful signing, add:
```typescript
import { NOTIFICATION_CONTENT } from '../types/notification';
import { showNotification } from '../services/notificationService';
import { generateId } from '../utils/storage';

// After toast.success('Contract signed successfully!') and before setPageState('thankyou'):
const notificationId = generateId();
const content = NOTIFICATION_CONTENT.contract_signed({
  prospectName: contract.quoteData.prospectName,
  quoteId: contract.quoteId,
});
await setDoc(doc(db, 'notifications', notificationId), {
  id: notificationId,
  type: 'contract_signed',
  title: content.title,
  body: content.body,
  link: content.link,
  read: false,
  createdAt: now,
  userId: '',
});
showNotification(content.title, content.body, content.link);
```

Note: Add `setDoc` and `doc` to the firestore imports if not already there.

- [ ] **Step 2: Add notification write to QuoteDetailPage**

In `handleStatusChange`, after the dispatch:
```typescript
import { NOTIFICATION_CONTENT } from '../types/notification';
import { showNotification } from '../services/notificationService';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// In handleStatusChange, after dispatch:
if (status === 'accepted' || status === 'rejected') {
  const notificationId = generateId();
  const type = status === 'accepted' ? 'quote_accepted' : 'quote_rejected';
  const content = NOTIFICATION_CONTENT[type]({
    prospectName: quote.prospectName,
    quoteId: quote.id,
  });
  setDoc(doc(db, 'notifications', notificationId), {
    id: notificationId,
    type,
    title: content.title,
    body: content.body,
    link: content.link,
    read: false,
    createdAt: new Date().toISOString(),
    userId: '',
  });
  showNotification(content.title, content.body, content.link);
}
```

- [ ] **Step 3: Add notification write to MoneyBookPage for payroll pending**

In `src/pages/MoneyBookPage.tsx`, find where payroll is calculated/approved and add after the dispatch that sets payroll to 'calculated' status:

```typescript
import { NOTIFICATION_CONTENT } from '../types/notification';
import { showNotification } from '../services/notificationService';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// After payroll calculation dispatch:
const pendingCount = state.payroll.filter(r => r.status === 'calculated' && !r.isPaid).length;
if (pendingCount > 0) {
  const notificationId = generateId();
  const content = NOTIFICATION_CONTENT.payroll_pending({ count: pendingCount });
  setDoc(doc(db, 'notifications', notificationId), {
    id: notificationId,
    type: 'payroll_pending',
    title: content.title,
    body: content.body,
    link: content.link,
    read: false,
    createdAt: new Date().toISOString(),
    userId: '',
  });
  showNotification(content.title, content.body, content.link);
}
```

- [ ] **Step 4: Verify tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/pages/ShareContractPage.tsx src/pages/QuoteDetailPage.tsx src/pages/MoneyBookPage.tsx
git commit -m "feat: add notification triggers for contract signing, quote changes, and payroll"
```

---

## Task 6: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Full build**

Run: `npm run build`

- [ ] **Step 3: Manual testing checklist**

- [ ] Sign a contract → notification doc written, toast shown (foreground) or OS notification (background)
- [ ] Accept a quote → notification doc written, toast shown
- [ ] Reject a quote → notification doc written, toast shown
- [ ] Notification badge shows correct unread count
- [ ] Click notification in dropdown → marks as read, navigates to page
- [ ] Dismiss All → all marked as read
- [ ] Permission denied → toasts still work, no OS notification
- [ ] Sidebar bell icon shows on desktop
- [ ] TopBar bell icon shows on mobile

- [ ] **Step 4: Commit (if fixes needed)**

```bash
git add -A
git commit -m "fix: integration fixes for push notifications"
```
