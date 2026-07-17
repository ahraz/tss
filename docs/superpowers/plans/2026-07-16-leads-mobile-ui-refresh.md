# Leads Page Mobile UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Replace stat cards + filter dropdown with compact tappable filter pills on the Leads page.

**Architecture:** Inline the filter pills + type/area/search directly into LeadsPage.tsx. Remove LeadFilters.tsx component.

**Tech Stack:** React, Tailwind CSS, lucide-react

## Global Constraints

- Zero lint errors, zero TypeScript errors
- Must be mobile-friendly (pills wrap, search full-width on small screens)
- No new dependencies

---

### Task 1: Refactor LeadsPage.tsx — inline filter pills + remove stat cards

**Files:**
- Modify: `src/pages/LeadsPage.tsx`
- Delete: `src/components/leads/LeadFilters.tsx`

- [ ] **Step 1: Remove stat cards**

Replace the 5 StatCard components (lines ~674-680) with a row of filter pills.

- [ ] **Step 2: Remove LeadFilters component usage**

Replace the `<LeadFilters ... />` component with inline type dropdown, area dropdown, and search bar.

- [ ] **Step 3: Build the pill row**

Each pill: `button` with label + count, active state highlighted (blue bg/white text), inactive state (gray bg). Maps the same `FILTER_OPTIONS` that the dropdown used. Wraps via `flex-wrap`.

- [ ] **Step 4: Remove unused imports**

Remove `StatCard`, `Building2`, `Phone`, `Clock`, `RotateCcw`, `CheckCircle2` if they become unused. Remove `LeadFilters` import.

- [ ] **Step 5: Delete LeadFilters.tsx**

Remove `src/components/leads/LeadFilters.tsx` entirely.

- [ ] **Step 6: Verify**

Run `npm run build` and `npm run lint` — zero errors.
