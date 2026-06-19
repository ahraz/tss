
## Profile form save bug (June 2026)

**Root cause:** The `useEffect` in `useProfile.ts` that populated form state from `currentUser` had `[currentUser]` as dependency. Any dispatch that updated the user (e.g., document upload via `UPDATE_USER`) changed `currentUser`'s reference, causing the effect to re-run and wipe in-progress form edits.

**Fix pattern:** Track loaded user ID with `useRef` and only populate form when the user identity changes, not on data syncs:
```ts
const loadedUserId = useRef<string | null>(null);
useEffect(() => {
  if (!currentUser || loadedUserId.current === currentUser.id) return;
  loadedUserId.current = currentUser.id;
  // populate form...
}, [currentUser]);
```

**Document upload pattern:** Never spread `currentUser` in dispatches — send only the fields that changed:
```
// BAD: dispatch({ type: 'UPDATE_USER', payload: { ...currentUser, documents } });
// GOOD: dispatch({ type: 'UPDATE_USER', payload: { id: currentUser.id, documents } });
```

**UPDATE_USER type:** Uses `Partial<User>` in AppAction since both the reducer (`{ ...u, ...payload }`) and Firestore (`merge: true`) support partial updates.

## Employee profile enhancements (June 2026)

### New User fields (in types/index.ts)
- `dateOfBirth?: string` — ISO date string
- `driversLicense?: string` — e.g. "G Class - ON"
- `vehicleInfo?: string` — e.g. "2018 Toyota Corolla - White"
- `languages?: string[]` — spoken languages

### Availability overhaul
- Old: morning/afternoon/evening/unavailable string union
- New: `AvailabilitySlot { start: string; end: string; allDay?: boolean }` per day
- If a day key is missing from the record → unavailable
- `allDay: true` means the employee is available the whole day (shown as "All day")
- UI: checkbox per day to toggle available/unavailable, time inputs for start/end, "All day" checkbox
- ProfilePage default: each toggled day starts at 09:00-17:00

### Self-rating removed
- Performance rating field removed from ProfilePage (employees can no longer rate themselves)
- The field remains in the User type so owners can set it via TeamPage admin

### Document uploads accept any file type
- Images: compressed via canvas (same as before)
- PDFs, DOCX, etc.: stored as base64 data URL without compression
- Admin view: images render inline, PDFs in `<iframe>`, other types as download links
- ProfilePage now shows document previews (images and download links)

### Admin view modal (TeamPage)
- Shows time-range availability with green styling, "All day" label for full-day
- Languages shown as purple pill badges
- Driver/Vehicle section with Car icon
- Date of birth displayed
- PDF iframe preview for PDF documents

### Day key mapping bug (June 2026)
**Bug:** Admin modal showed dashes for all days even when availability data existed.
**Root cause:** `TeamPage.tsx` computed day keys via `d.toLowerCase()` (e.g. `'Mon'` → `'mon'`), but the `DayOfWeek` type uses full names (`'monday'`, `'tuesday'`, etc.). The lookup always returned `undefined`, and the code rendered `—` when `slot == null`.
**Fix:** Added a `DAY_MAP` Record mapping short labels (`'Mon'`) to full keys (`'monday'`).
