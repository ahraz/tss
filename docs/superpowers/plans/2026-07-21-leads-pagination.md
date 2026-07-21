# Leads Page Pagination Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement task-by-task.

**Goal:** Add client-side pagination (20 leads/page) to the leads page to improve performance.

**Architecture:** Single-file change to `LeadsPage.tsx` — add state, slice logic, reset effect, and pagination controls.

**Tech Stack:** React, TypeScript, Tailwind CSS

## Global Constraints

- `PAGE_SIZE = 20`
- Page resets to 1 on filter/search change
- Pagination hidden when ≤ 1 page
- Must match existing UI style (gray/blue buttons, same font sizes)

---

### Task 1: Add pagination state and computed values

**File:** `src/pages/LeadsPage.tsx`

**Changes:**
- Add `const [currentPage, setCurrentPage] = useState(1)` near line 61
- Add `const PAGE_SIZE = 20` as a constant
- Compute `totalPages` and `paginatedLeads` from `mergedLeads`
- Add `useEffect` to reset page on `mergedLeads.length` change
- Replace `mergedLeads.map(` with `paginatedLeads.map(`

### Task 2: Add pagination UI component

**File:** `src/pages/LeadsPage.tsx`

Add pagination bar after the leads list (before closing `AppShell`):
- Previous/Next buttons
- Page number buttons with ellipsis logic
- Update the "X of Y" count

### Task 3: Verify and commit

- `npm run lint` passes
- `npx tsc --noEmit` passes
- Commit and merge to main
