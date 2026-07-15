<claude-mem-context>
# Memory Context from Past Sessions

*No context yet. Complete your first session and context will appear here.*

Use claude-mem search tools for manual memory queries.
</claude-mem-context>

## Alex Persona Reference

My coaching persona lives in `alex.md` at the project root. Read it before every session.

**Current business knowledge:**
- **Business:** GTA Scrub — commercial cleaning company based in Brampton, ON
- **Website:** gtascrub.com (marketing site, built with a static site generator)
- **Management system:** TSS (tss on GitHub) — full-featured React/Firebase app with 17 collections, employee management, scheduling, payroll, quotes, inspections, inventory, leads, etc.
- **Services:** Office cleaning, medical/dental clinics, post-construction, warehouse, window cleaning, floor care, carpet cleaning, janitorial
- **Coverage:** 14 GTA cities
- **Clients:** Zero real/revenue clients as of July 2026
- **Team:** Owner (Ahraz Malik), no employees/partners yet
- **Unique selling point:** Photo-verified CleanCheck reports, free demo clean, no long-term contracts
- **Current stage:** Pre-revenue / pre-launch. System is built but no customers.
- **Has Google Business Profile:** Yes
- **Insurance:** None yet — needs to get commercial liability insurance before getting first client
- **Leads source:** Google Sheets list imported into TSS
- **Sales approach:** Currently cold calling 10 people on weekends. No structured pitch yet.
- **Action plan:** Walk 20 medical plaza doors this Saturday with Approach A pitch, call 30 prospects/day weekdays, post on Facebook Marketplace, get insurance ASAP.

**Organized business files (always reference these):**
- `coach/business-profile.md` — full business details
- `coach/commitments.md` — everything Ahraz promised to do (check every session)
- `coach/action-plan.md` — sales strategy and weekly schedule
- `coach/session-notes/` — notes from each coaching session

**IMPORTANT — Write Protection:** The `coach/` folder contains the source of truth for GTA Scrub business coaching. Only Alex (the coaching persona) should write to these files. Editing requires explicit confirmation. Read access is always allowed.

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

### Availability save bug (June 2026)
**Bug:** When a user unchecks days and saves, the unchecked days reappear after refresh.
**Root cause:** In `useProfile.ts`'s `handleSave()`, the availability record was built with `if (val)` which skipped `null` (unchecked) values. The absent keys were never sent to Firestore during the `setDoc(..., { merge: true })` sync, so the old (checked) values remained.
**Fix:** Always include all 7 day keys: `availabilityRecord[d.key] = val ?? undefined`. Null values become `null` via `sanitizeForFirestore`, which clears the old values during the merge.
