# Leads Page: Intel & Contact Visibility Design

**Date:** 2026-07-19
**Status:** Approved for implementation

## Problem

The leads page shows too little information at a glance. Contact details (website, address, email) require expanding each card, and there is no place to track competitor intelligence — who the lead currently uses, pricing notes, or relationship context. This slows down cold-calling workflow.

## Data Model

Add three optional fields to the `Lead` interface in `types/index.ts`:

```typescript
currentCleaner?: string;    // e.g. "EcoClean", "Jan-Pro"
competitorNotes?: string;   // free-text intel: pricing, pain points, etc.
lastContactedAt?: string;   // ISO date string, auto-set when call outcome is saved
```

These map to new Google Sheet columns P, Q, R (indexes 15, 16, 17) and persist through re-imports via Firestore merge.

## LeadCard Layout Redesign

The card shows contact details (phone, email, website, address) without requiring expansion:

```
┌──────────────────────────────────────────────┐
│  Business Name                       ★ 4.5   │
│  📞 (905) 555-0142                          │
│  ✉️ email  🌐 website                        │
│  📍 Full address                              │
│                                              │
│  [Call] [Quote] [Intel ▾]                    │
│  Status: Not Called                           │
│                                              │
│  Intel (collapsible):                        │
│  ┌──────────────────────────────────────────┐│
│  │ Cleaner: EcoClean ($400/mo)              ││
│  │ Notes: Complained about missed visits    ││
│  │ Last contacted: 2026-07-18               ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

On mobile, long addresses collapse to city-only to prevent layout breakage.

The Intel section is a `<Collapsible>` block inside `LeadCard` — opens inline when toggled.

## Bug Fixes

1. **Email input conflict:** Replace shared `emailValue` state with per-lead tracking using `emailEditState: Record<string, string>` keyed by `placeId`.
2. **Firestore flickering:** Add a `firestoreReady` ref that gates the empty-state rendering until the first `onSnapshot` callback fires.
3. **Missing loading state:** Show `<Spinner />` while `firestoreReady === false && leads.length === 0`.
4. **"Clear All Lead Data" mislabel:** Change button text to "Clear Call Logs".
5. **Dead code:** Remove `const leads = leadsFromFirestore` alias, move `getLineItemsForType` and `leadTypeToRate` out of `LeadCard`, remove unused `importingFromSheets` guard complexity.

## Files Changed

- `src/types/index.ts` — add `currentCleaner`, `competitorNotes`, `lastContactedAt` to `Lead`
- `src/pages/LeadsPage.tsx` — bug fixes, loading state, dead code removal
- `src/components/leads/LeadCard.tsx` — layout redesign, intel section, static function extraction
- `src/lib/firebaseSync.ts` — no changes (Firestore merge already handles new fields)
- `src/lib/googleSheets.ts` — update `COLUMNS` registry, expand header range to `A:Q`

## Non-Goals

- No pagination (defer until lead count exceeds 500)
- No pipeline stage tracking
- No mobile bottom nav for leads
- No error boundary for Firestore listener
