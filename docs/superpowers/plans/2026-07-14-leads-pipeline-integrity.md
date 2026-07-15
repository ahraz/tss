# Leads Pipeline Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all data integrity risks in the leads pipeline — email wipe bug, scraper range mismatch, misleading column constants, dedup improvements, and IMPORT_DATA overwrite risk.

**Architecture:** Google Sheets is the source of truth for raw lead data. Firestore stores call logs, email logs, and user-entered emails. The pipeline reads from Sheets and merges into Firestore. This plan fixes the merge to never overwrite user data, cleans up column references, and makes the scraper safer.

**Tech Stack:** TypeScript, React, Google Sheets API v4, Firebase Firestore

## Global Constraints

- Only A-O columns in the Results sheet — call tracking (K-N) columns are legacy, no new code writes to them
- `updateLeadInSheet` is removed entirely — call outcomes live only in Firestore
- `email` field must never be overwritten with empty string during import via `merge: true`
- All hardcoded column indexes replaced with `COLUMNS` registry lookups
- Scraper dedup key changes from name-only to `name|city`
- Zip status writes happen BEFORE new-rows writes

---

### Task 1: Add COLUMNS Registry & Expand Header Enforcement

**Files:**
- Modify: `src/lib/googleSheets.ts:17-30` — replace `COL` and `HEADER_LABELS` with `COLUMNS` registry
- Modify: `src/lib/googleSheets.ts:130-166` — expand `ensureHeaderColumns` to cover all columns A-O

- [ ] **Step 1: Replace `COL` and `HEADER_LABELS` with `COLUMNS`**

Replace lines 17-30:

```typescript
// Column mapping — single source of truth
const COLUMNS: Record<string, { index: number; label: string }> = {
  A: { index: 0,  label: 'Business Type' },
  B: { index: 1,  label: 'Phone' },
  C: { index: 2,  label: 'Business Name' },
  D: { index: 3,  label: 'Google Types' },
  E: { index: 4,  label: 'Rating' },
  F: { index: 5,  label: 'Address' },
  G: { index: 6,  label: 'Reviews' },
  H: { index: 7,  label: 'Website' },
  I: { index: 8,  label: 'Email' },
  J: { index: 9,  label: 'GPS Coordinates' },
  K: { index: 10, label: 'Call Status' },     // legacy
  L: { index: 11, label: 'Called By' },        // legacy
  M: { index: 12, label: 'Last Called' },      // legacy
  N: { index: 13, label: 'Notes' },            // legacy
  O: { index: 14, label: 'Place ID' },
};
```

- [ ] **Step 2: Rewrite `ensureHeaderColumns` for all A-O**

Replace lines 126-166:

```typescript
/**
 * Ensure all header columns (A-O) exist in the Results sheet.
 * Runs once per session.
 */
export async function ensureHeaderColumns(): Promise<void> {
  if (headersEnsured) return;
  const token = await getAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!1:1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  const existingHeaders: string[] = data.values?.[0] || [];

  const updates: { range: string; value: string }[] = [];
  for (const [letter, col] of Object.entries(COLUMNS)) {
    if (!existingHeaders[col.index] || existingHeaders[col.index] !== col.label) {
      updates.push({ range: `${SHEET_NAME}!${letter}1`, value: col.label });
    }
  }

  if (updates.length === 0) { headersEnsured = true; return; }

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
      }),
    }
  );
  headersEnsured = true;
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/googleSheets.ts
git commit -m "fix(leads): add COLUMNS registry and expand headers to A-O"
```

---

### Task 2: Replace Hardcoded Indexes in fetchLeadsFromSheet

**Files:**
- Modify: `src/lib/googleSheets.ts:200-212` — replace `row[0]`, `row[1]`, etc. with `COLUMNS.X.index`

- [ ] **Step 1: Replace hardcoded indexes in lead mapping**

Replace lines 200-213:

```typescript
    leads.push({
      rowIndex: i + 1,
      type: row[COLUMNS.A.index] || '',
      phone: row[COLUMNS.B.index] || '',
      businessName: row[COLUMNS.C.index] || '',
      types: row[COLUMNS.D.index] || '',
      rating: row[COLUMNS.E.index] || '',
      address: row[COLUMNS.F.index] || '',
      reviews: row[COLUMNS.G.index] || '',
      website: row[COLUMNS.H.index] || '',
      email: row[COLUMNS.I.index]?.trim() || undefined,
      placeId: row[COLUMNS.O.index] || String(i + 1),
      gpsCoordinates: row[COLUMNS.J.index] || '',
    });
```

Note: `email` changes from `row[8] || ''` to `row[COLUMNS.I.index]?.trim() || undefined` — this is the email wipe fix. Empty sheet cell → `undefined` → `sanitizeForFirestore` converts to `null` → `merge: true` skips the field, preserving existing Firestore values.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/googleSheets.ts
git commit -m "fix(leads): replace hardcoded column indexes with COLUMNS registry, fix email wipe bug"
```

---

### Task 3: Remove updateLeadInSheet & Clean Up

**Files:**
- Modify: `src/lib/googleSheets.ts:8` — remove `CallOutcome` from import
- Modify: `src/lib/googleSheets.ts:222-268` — delete `updateLeadInSheet` function
- Modify: `src/pages/LeadsPage.tsx:19` — remove `updateLeadInSheet` import
- Modify: `src/pages/LeadsPage.tsx:358-359` — remove the call to `updateLeadInSheet`

- [ ] **Step 1: Remove `CallOutcome` from import in googleSheets.ts**

Line 8 changes from:
```typescript
import type { Lead, CallOutcome } from '../types';
```
To:
```typescript
import type { Lead } from '../types';
```

- [ ] **Step 2: Delete `updateLeadInSheet` function**

Delete lines 222-268 (the entire function from its JSDoc to its closing brace).

- [ ] **Step 3: Remove import from LeadsPage.tsx**

Line 19 (`updateLeadInSheet,`) — remove that line.

- [ ] **Step 4: Remove the sheet write call**

Lines 358-359:
```typescript
      updateLeadInSheet(outcomeLead.rowIndex, outcome, currentUser.name, outcomeNotes)
        .catch(err => console.warn('Sheet write failed:', err));
```
Remove entirely. The `dispatch({ type: 'ADD_CALL_LOG', ... })` at line 356 remains.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/googleSheets.ts src/pages/LeadsPage.tsx
git commit -m "fix(leads): remove updateLeadInSheet — call tracking in Firestore only"
```

---

### Task 4: Fix Scraper — Range, Dedup, Null Cells

**Files:**
- Modify: `src/lib/googleSheets.ts:444-449` — dedup key from name to name|city
- Modify: `src/lib/googleSheets.ts:487-500` — null for K-N, email as null
- Modify: `src/lib/googleSheets.ts:539` — write range from A:N to A:O

- [ ] **Step 1: Change dedup key to name|city**

Replace lines 442-449:

```typescript
  // Read existing business names + cities for bulletproof dedup
  onProgress('Checking existing leads...');
  const resultsRows = await fetchSheetValues(token, 'Results!A:N');
  const seenKeys = new Set<string>();
  for (let i = 1; i < resultsRows.length; i++) {
    const name = String(resultsRows[i][COLUMNS.C.index] || '').toLowerCase().trim();
    const address = String(resultsRows[i][COLUMNS.F.index] || '');
    const city = address.split(',')[1]?.trim().toLowerCase() || '';
    if (name) seenKeys.add(`${name}|${city}`);
  }
```

- [ ] **Step 2: Update scraper loop dedup check**

Replace the dedup check inside the loop (around line 475):
```typescript
          const nameKey = place.name.toLowerCase().trim();
          const city = (place.formatted_address || '').split(',')[1]?.trim().toLowerCase() || '';
          const dedupKey = `${nameKey}|${city}`;
          if (seenKeys.has(dedupKey)) continue;
          seenKeys.add(dedupKey);
```

- [ ] **Step 3: Replace `''` with `null` for K-N and email**

Replace lines 487-500:
```typescript
          newRows.push([
            category,                                // A: type
            details.phone,                           // B: phone
            place.name,                              // C: title
            JSON.stringify(place.types || []),       // D: types
            String(place.rating || ''),              // E: rating
            place.formatted_address || '',           // F: address
            details.reviews,                         // G: reviews (JSON array)
            details.website,                         // H: website
            null,                                    // I: email (empty — user fills later)
            gps,                                     // J: gpsCoordinates
            null, null, null, null,                   // K-N: legacy tracking (not used)
            place.place_id,                           // O: stable Google Maps place_id
          ]);
```

- [ ] **Step 4: Fix write range**

Line 539, change:
```typescript
    const range = `Results!A${lastRow + 1}:N${lastRow + newRows.length}`;
```
To:
```typescript
    const range = `Results!A${lastRow + 1}:O${lastRow + newRows.length}`;
```

- [ ] **Step 5: Fetch Results!A:O for dedup to cover all columns**

Line 444, change:
```typescript
  const resultsRows = await fetchSheetValues(token, 'Results!A:N');
```
To:
```typescript
  const resultsRows = await fetchSheetValues(token, 'Results!A:O');
```

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/googleSheets.ts
git commit -m "fix(leads): scraper range A:O, dedup by name|city, null for unused cells"
```

---

### Task 5: Zip Status Write Safety

**Files:**
- Modify: `src/lib/googleSheets.ts:515-550` — swap order: write zip statuses BEFORE new rows

- [ ] **Step 1: Move zip status write before new-rows write**

Replace lines 515-549 with:

```typescript
  // Write zip statuses first — so if the rows write fails, zips aren't left active
  if (zipUpdates.length > 0) {
    for (const u of zipUpdates) {
      try {
        const range = `'AZ Zips'!B${u.row}`;
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ range, majorDimension: 'ROWS', values: [[u.status]] }),
          }
        );
      } catch (e) {
        console.warn(`Failed to update status for row ${u.row}:`, e);
      }
    }
    onProgress(`Updated ${zipUpdates.length} zip statuses`);
  }

  // Write to Results tab
  if (newRows.length > 0) {
    onProgress(`Writing ${newRows.length} new leads...`);
    const lastRow = resultsRows.length;
    const range = `Results!A${lastRow + 1}:O${lastRow + newRows.length}`;

    // Retry loop for rows write
    let retries = 3;
    while (retries > 0) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ range, majorDimension: 'ROWS', values: newRows }),
          }
        );
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, 2000));
        console.warn(`Rows write failed, retrying (${retries} left):`, e);
      }
    }
  }
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/googleSheets.ts
git commit -m "fix(leads): write zip status before rows, add retry for rows write"
```

---

### Task 6: Fix IMPORT_DATA Merge

**Files:**
- Modify: `src/lib/firebaseSync.ts:631-634` — add `{ merge: true }` to leads setDoc

- [ ] **Step 1: Add `{ merge: true }` to IMPORT_DATA leads write**

Lines 631-633 are currently:
```typescript
        for (const item of action.payload.leads) {
          const ref = doc(db, 'leads', item.placeId || item.rowIndex.toString());
          await setDoc(ref, sanitizeForFirestore(item));
        }
```
Change to:
```typescript
        for (const item of action.payload.leads) {
          const ref = doc(db, 'leads', item.placeId || item.rowIndex.toString());
          await setDoc(ref, sanitizeForFirestore(item), { merge: true });
        }
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebaseSync.ts
git commit -m "fix(leads): IMPORT_DATA now uses merge:true to preserve call logs"
```
