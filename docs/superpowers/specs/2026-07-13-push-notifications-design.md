# Firestore-Triggered Notifications — Design Spec

## Overview

Add OS-level push notifications to the webapp using Firestore-triggered events and the Notification API — no Firebase Functions or backend server required. Notifications fire when events occur (contract signed, quote accepted/rejected, payroll pending) and appear both in-app (toast + badge) and as OS notifications when the app is running in the background.

## Goals

- Show toast notifications for events when the app is in the foreground
- Show OS-level notification (Notification API) when the app is in the background
- Clicking an OS notification opens the app to the relevant page
- Notification badge in the sidebar/topbar aggregates all unread notifications
- No backend server or Firebase paid plan required
- Works with the existing PWA (vite-plugin-pwa)

## Data Model

### New Firestore Collection: `notifications`

```typescript
interface AppNotification {
  id: string;
  type: 'contract_signed' | 'quote_accepted' | 'quote_rejected' | 'payroll_pending';
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
  userId: string;       // who this notification is for
}
```

### Notification content per type

| Type | Title | Body | Link |
|------|-------|------|------|
| `contract_signed` | "Contract Signed" | "{prospectName} signed their contract" | `/quotes/{quoteId}` |
| `quote_accepted` | "Quote Accepted" | "{prospectName} accepted the quote" | `/quotes/{quoteId}` |
| `quote_rejected` | "Quote Rejected" | "{prospectName} rejected the quote" | `/quotes/{quoteId}` |
| `payroll_pending` | "Payroll Pending" | "{n} employee(s) ready for approval" | `/money` |

## Architecture

```
Event (Contract signed / Quote status change / Payroll calc)
  │
  ▼
Write AppNotification doc to Firestore notifications collection
  │
  ▼
onSnapshot listener picks it up in the app
  │
  ├── Foreground → toast.success() + update badge
  └── Background → new Notification() OS notification
```

### Components

1. **NotificationService** — utility that requests notification permission, checks page visibility, and shows the appropriate notification (toast vs OS)

2. **NotificationBadge** — replaces the existing `ContractNotificationBadge`. Reads all unread notifications from state, shows count on bell icon, dropdown lists them grouped by type

3. **Firestore sync** — `notifications` collection added to `fetchAllCollectionsOnce`, `subscribeToCollections`, and `syncActionToFirestore` (same pattern as all other collections)

4. **Event triggers** — existing code sites that write notification docs to Firestore:
   - `ShareContractPage.handleSignAndSubmit` — after marking contract signed
   - `QuoteDetailPage.handleStatusChange` — when quote accepted/rejected
   - `MoneyBookPage` — when payroll is calculated and ready for approval

### Notification Permission

- Requested once on app initialization (AppContext)
- Permission state stored in localStorage
- If denied, in-app toasts still work; OS notifications silently skipped
- If granted, `new Notification()` can be called from the main thread

### Foreground vs Background Detection

- Use `document.visibilityState` and `document.hidden`
- If `document.hidden` is true → use `new Notification()`
- If `document.hidden` is false → use `toast.success()`

### Notification Click Handling

- OS notification `onclick` handler:
  - Focus the existing window if already open
  - Or open a new window/tab
  - Navigate to `notification.link`
  - Close the notification

## Firestore Security Rules

```
match /notifications/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

## Files to Create/Modify

### New Files
- `src/services/notificationService.ts` — requestPermission, showNotification, click handler
- `src/types/notification.ts` — AppNotification interface + notification content map

### Modified Files
- `src/types/index.ts` — export AppNotification
- `src/context/AppContext.tsx` — add notifications to state + reducer + request permission on init
- `src/lib/firebaseSync.ts` — add `notifications` to fetch/sync
- `src/components/notifications/NotificationBadge.tsx` — replaces ContractNotificationBadge, covers all types
- `src/components/layout/Sidebar.tsx` — use new NotificationBadge
- `src/components/layout/TopBar.tsx` — use new NotificationBadge
- `src/pages/ShareContractPage.tsx` — write notification doc after signing
- `src/pages/QuoteDetailPage.tsx` — write notification doc on status change
- `src/pages/MoneyBookPage.tsx` — write notification doc when payroll is ready

- `firestore.rules` — add notifications rules

## Error Handling

- Notification permission denied → silently skip OS notifications, toasts still work
- Firestore write fails → console.error, no user-visible error (non-critical)
- Multiple rapid notifications → batch or collapse by type

## Testing

- Sign a contract → notification appears in foreground (toast) and background (OS)
- Accept a quote → notification appears
- Reject a quote → notification appears
- Calculate payroll → notification appears
- Click notification → navigates to correct page
- Deny permission → no OS notification, toasts still work
- Multiple unread → badge count correct
- Mark as read → badge count decreases
