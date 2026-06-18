# TSS App — Architectural Audit & Fix Plan

## 🔴 CRITICAL Issues

### 1. Monolithic Page Components (zero separation of concerns)
- InspectionsPage.tsx: 911 lines
- PayrollPage.tsx: 569 lines
- TeamPage.tsx: 490 lines
- ProfilePage.tsx: 479 lines
- SiteDetailPage.tsx: 383 lines
- ClockPage.tsx: 353 lines
All contain mixed UI, state, business logic, and inline rendering.

### 2. Stale Closure in customDispatch (AppContext.tsx:228–239)
`syncActionToFirestore` captures `state.settings` by closure value, not ref.

### 3. Duplicate Firestore helper
`mapDoc` (line 82) and `ensureId` (line 164) are identical functions.

### 4. Race condition — Firestore init order
Double-dispatch on load: fetchAllCollectionsOnce + real-time listeners both fire SET_*.

## 🟡 SIGNIFICANT Issues

### 5. Duplicate Navigation Systems
Sidebar.tsx and BottomNav.tsx maintain separate link arrays and role logic.

### 6. Dead migrateLocalToFirebase function (firebaseSync.ts:110–150)
Removed from init flow but still in source.

### 7. Dead `useRoleGuard` hook (hooks/useRoleGuard.ts)
No component imports it.

### 8. Dead localStorage wrapper layer (storage.ts)
28 getX/setX functions, clearOldPhotos, getStorageUsage, exportAllData, persistState — none used.
validation.ts — entire 148-line file never imported.

## 🟠 MODERATE Issues

### 9. setDoc overwrites instead of merging
All ADD/UPDATE handlers replace the entire Firestore document.

### 10. SiteDetailPage — Two placeholder tabs (Shifts, Tasks)
### 11. MoneyBookPage — Redundant Payroll tab
### 12. No error boundaries anywhere
### 13. InspectionsPage.tsx — Dead import (isCameraAvailable)
### 14. DashboardPage.tsx — 3 unused imports

## 🔵 MINOR Issues

### 15. No loading state during Firestore init
### 16. Every page duplicates AppShell/container wrapper pattern
### 17. Inline formatCAD calls everywhere
### 18. Firebase config keys in repo

---

## Execution Phases

### Phase 1: Navigation Unification
- Extract shared nav links config
- Both Sidebar + BottomNav consume it
- Add missing links to BottomNav (Inspections, Payroll, etc.)

### Phase 2: Data Layer Improvements
- Remove dead migrateLocalToFirebase
- Remove duplicate ensureId/mapDoc
- Fix customDispatch stale closure
- Add merge:true to setDoc calls

### Phase 3: Dead Code Removal
- storage.ts clean-up (bulk accessors, orphaned functions)
- Remove validation.ts
- Remove useRoleGuard
- Remove unused imports

### Phase 4: Page Decomposition
- Extract custom hooks for business logic
- Split 900+ line pages into components + hooks

### Phase 5: Polish
- Error boundaries
- Loading states
- Remove placeholder tabs
- Remove redundant Payroll tab in MoneyBookPage
