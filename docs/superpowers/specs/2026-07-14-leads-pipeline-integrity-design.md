# Leads Pipeline Integrity & Organization

**Date:** 2026-07-14
**Status:** Approved design

## Problem

The leads data pipeline (Google Sheets → Firestore → UI) has accumulated several integrity risks and one critical data-loss bug:

1. **Critical — Email wipe on sheet refresh:** `fetchLeadsFromSheet` sets `email: row[8] || ''`. On `SET_LEADS` with `merge: true`, the empty string overwrites any user-entered email in Firestore.
2. **Misleading column constant:** `COL.placeId = 9` points to column I (email), not column O (placeId).
3. **Scraper range mismatch:** Writes 15 columns (A:O) but declares range `A:N` (missing O).
4. **IMPORT_DATA uses full overwrite:** No `{ merge: true }` — would destroy call logs and email refs.
5. **Dedup by name only:** Same business in different cities incorrectly deduped; different businesses with same name in same city missed.

## Scope

Bulletproof the pipeline: fix all bugs, replace ad-hoc column index literals with a canonical registry, clean up email handling, improve dedup. Does NOT move call tracking to a separate sheet or add a verify button.

---

## Design

### 1. Column Registry

Replace the `COL` constant object with a single canonical `COLUMNS` registry:

```typescript
const COLUMNS: Record<string, { index: number; label: string }> = {
  A: { index: 0, label: 'Business Type' },
  B: { index: 1, label: 'Phone' },
  C: { index: 2, label: 'Business Name' },
  D: { index: 3, label: 'Google Types' },
  E: { index: 4, label: 'Rating' },
  F: { index: 5, label: 'Address' },
  G: { index: 6, label: 'Reviews' },
  H: { index: 7, label: 'Website' },
  I: { index: 8, label: 'Email' },
  J: { index: 9, label: 'GPS Coordinates' },
  K: { index: 10, label: 'Call Status' },     // legacy
  L: { index: 11, label: 'Called By' },        // legacy
  M: { index: 12, label: 'Last Called' },      // legacy
  N: { index: 13, label: 'Notes' },            // legacy
  O: { index: 14, label: 'Place ID' },
};
```

K-N marked as `// legacy` — no new code writes to them. `updateLeadInSheet` is removed entirely.

All read/write code replaces hardcoded indexes like `row[2]` or `row[14]` with `COLUMNS.C.index`, `COLUMNS.O.index`.

### 2. Header Enforcement

`ensureHeaderColumns` writes headers for ALL columns (A-O), not just K-N. Runs on every successful connect/import.

### 3. Email Handling

**Scraper:** Writes a truly empty cell to column I (email) instead of the string `''`. In `RAW` mode, a `null` or omitted value in the array writes an empty cell.

**`fetchLeadsFromSheet`:** Changes `email: row[8] || ''` to `email: row[8]?.trim() || undefined`.

- Empty sheet cell → `undefined` → `sanitizeForFirestore` converts to `null` → `merge: true` does NOT overwrite the existing Firestore field
- User-entered sheet email → imported normally
- UI-entered email (via `UPDATE_LEAD_EMAIL`) → saved directly to Firestore, never lost on refresh

### 4. Scraper Fixes

**Range:** Correct write range from `A${lastRow+1}:N${...}` to `A${lastRow+1}:O${...}`.

**Dedup:** Key changes from `businessName.toLowerCase().trim()` to `${name}|${city}` where city is the second comma-segment of the address.

**Empty cells:** K-N values changed from `''` to `null` so the scraper writes clean empty cells.

### 5. Zip Status Write Safety

Zip status writes happen BEFORE the new-rows write. If a crash occurs between the two, the zip stays in its old state (`partial`) and gets rescanned — no data loss, no endless loops.

### 6. IMPORT_DATA Merge Fix

Add `{ merge: true }` to the `setDoc` call for leads in the `IMPORT_DATA` handler:

```typescript
await setDoc(ref, sanitizeForFirestore(item), { merge: true });
```

### 7. Removed Code

- `updateLeadInSheet` function (entirely)
- `HEADER_LABELS` constant
- `COL` constant object
- Call-tracking handlers in `handleSaveOutcome` that called `updateLeadInSheet`

---

## Files Changed

| File | Changes |
|------|---------|
| `src/lib/googleSheets.ts` | Add `COLUMNS` registry, replace all hardcoded indexes, fix scraper range, change email handling, remove `updateLeadInSheet`, remove `COL` and `HEADER_LABELS`, change dedup key, write zip status before rows |
| `src/lib/firebaseSync.ts` | Add `{ merge: true }` to IMPORT_DATA leads write |
| `src/pages/LeadsPage.tsx` | Remove `updateLeadInSheet` import and call in `handleSaveOutcome` |
| `src/types/index.ts` | No changes needed |

---

## Risk & Migration

- **Legacy K-N data:** Existing values in columns K-N remain untouched in the sheet. No migration needed. They simply stop being overwritten.
- **Call logs in Firestore:** Already stored via `ADD_CALL_LOG` dispatch. Removing the sheet write has no effect on Firestore data or UI.
- **Existing emails:** After deploy, first refresh will NOT wipe emails (the `undefined` fix prevents it). Already-wiped emails are unrecoverable from the sheet — user must re-enter.
