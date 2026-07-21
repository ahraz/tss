# Leads Page Pagination

**Date:** 2026-07-21
**Status:** Approved

## Problem

All leads render on a single page. With hundreds of leads, the page becomes slow and unresponsive.

## Design

Add client-side pagination to `LeadsPage.tsx`: 20 leads per page with Previous/Next and page number buttons.

### Changes

**File:** `src/pages/LeadsPage.tsx`

1. **State:** Add `currentPage` state (default 1)
2. **Derived values:** `PAGE_SIZE = 20`, `totalPages`, `paginatedLeads` (sliced from `mergedLeads`)
3. **Reset effect:** `useEffect` watching `mergedLeads` length resets to page 1 when filters change
4. **Render:** Map over `paginatedLeads` instead of `mergedLeads`
5. **Controls:** Pagination bar below the list with page buttons
6. **Count:** Update "X of Y leads" to show current range

### Pagination UI

A centered row below the leads list:
```
← Previous   1  2  3 ... 12  Next →
```
- Previous/Next disabled at boundaries
- Current page highlighted (blue), others gray
- Ellipsis for large page ranges (show first, last, and 5 surrounding pages)

### Edge Cases

- 0 results or 1 page: hide pagination entirely
- Search/filter change: reset to page 1
- Leads imported while on page > 1: reset to page 1

## Scope

Single file, ~30 lines added. No new dependencies or components.
