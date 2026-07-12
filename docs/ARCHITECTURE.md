# GTA Scrub — Architecture Overview

Last updated: 2026-06-20

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 6.0, Vite 8 |
| **Styling** | Tailwind CSS 3.4, clsx, tailwind-merge |
| **Routing** | React Router DOM 6.30 |
| **Forms** | react-hook-form 7.76 |
| **Charts** | recharts 2.15 (lazy-loaded in AnalyticsPage) |
| **Backend / DB** | Firebase Firestore (tssc-4d214) |
| **Auth** | Firebase Auth (anonymous sign-in) |
| **File Storage** | Firestore documents themselves (data URLs), no Firebase Storage used |
| **PWA** | vite-plugin-pwa |
| **Google Sheets** | Google Identity Services (OAuth) + Sheets API v4 (Leads feature only) |
| **PDF Gen** | jspdf + html2canvas |

## Project Structure

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Routes + ProtectedRoute wrapper
├── index.css                 # Tailwind base styles
├── context/
│   └── AppContext.tsx         # Global state: Reducer + Firestore sync (source of truth)
├── types/
│   └── index.ts              # All TypeScript interfaces, AppState, AppAction union
├── lib/
│   ├── firebase.ts           # Firebase/Firestore initialization
│   ├── firebaseSync.ts       # Firestore CRUD, syncActionToFirestore, seed data, listeners
│   ├── firebaseStorage.ts    # Profile photo save/remove (data URLs in Firestore)
│   └── googleSheets.ts       # Google Sheets OAuth + API (Leads feature)
├── hooks/
│   ├── useProfile.ts         # Profile form state & save logic
│   ├── useClock.ts           # Clock in/out logic
│   ├── useActiveShift.ts     # Active shift tracking
│   ├── useTeam.ts            # Team management
│   ├── usePayroll.ts         # Payroll calculations
│   └── useInspections.ts     # Inspection logic
├── pages/                    # 21 page components (routes)
├── components/
│   ├── layout/               # AppShell, Sidebar, BottomNav
│   ├── ui/                   # Reusable UI primitives
│   ├── inspections/          # Inspection-specific components
│   └── payroll/              # Payroll-specific components
├── utils/
│   ├── calculations.ts       # Payroll/scheduling math
│   ├── camera.ts             # Camera access
│   ├── compressImage.ts      # Image compression via canvas
│   ├── csv.ts                # CSV export
│   ├── formatters.ts         # Date/currency formatting
│   ├── photoStore.ts         # IndexedDB photo storage
│   └── storage.ts            # localStorage (mostly dead code)
└── assets/
    └── Logo.tsx              # SVG Logo component
```

## Data Flow

```
User Action → dispatch(AppAction)
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
   Reducer (optimistic)   syncActionToFirestore()
   updates React state         │
          │                    ▼
          │              Firestore setDoc/updateDoc/deleteDoc
          │                    │
          │                    ▼
          │              onSnapshot listener fires back
          │                    │
          └─────────┬──────────┘
                    ▼
          React re-render
```

**Key principle:** Firestore is the single source of truth. On init:
1. `fetchAllCollectionsOnce()` hydrates all state
2. `subscribeToCollections()` attaches `onSnapshot` listeners for real-time updates
3. Any write action goes through `customDispatch` → (reducer + Firestore write)

## Authentication

- Anonymous Firebase Auth (`signInAnonymously`)
- PIN-based login (4-digit pin per user, stored in Firestore)
- Session persisted to localStorage, restored on reload
- Role-based route protection: `owner`, `partner`, `employee`

## Routing (21 routes)

| Route | Page | Roles |
|-------|------|-------|
| `/login` | LoginPage | all |
| `/` | DashboardPage | all |
| `/profile` | ProfilePage | all |
| `/clock` | ClockPage | all |
| `/schedule` | SchedulePage | owner, partner |
| `/shifts` | ShiftsPage | all |
| `/sites` | SitesPage | all |
| `/sites/:id` | SiteDetailPage | all |
| `/clients` | ClientsPage | all |
| `/clients/:id` | ClientDetailPage | all |
| `/quotes` | QuotesPage | owner, partner |
| `/quotes/:id` | QuoteDetailPage | owner, partner |
| `/team` | TeamPage | owner, partner |
| `/inventory` | InventoryPage | owner, partner |
| `/incidents` | IncidentsPage | owner, partner |
| `/inspections` | InspectionsPage | owner, partner |
| `/money` | MoneyBookPage | owner, partner |
| `/analytics` | AnalyticsPage (lazy) | owner, partner |
| `/payroll` | PayrollPage | owner, partner |
| `/settings` | SettingsPage | owner |
| `/leads` | LeadsPage | owner |
| `/tasks` | TasksPage | all |

## Known Technical Debt (see plan2.md)

1. Monolithic page components (InspectionsPage: 911 lines, PayrollPage: 569, etc.)
2. Dead code: `storage.ts` bulk accessors, `validation.ts`, `useRoleGuard`
3. `setDoc` calls don't use `merge: true` in some ADD/UPDATE handlers (Firestore overwrite risk)
4. Race condition: double-dispatch on init (fetch + listeners both fire SET_*)
5. Duplicate navigation link configs in Sidebar.tsx and BottomNav.tsx
