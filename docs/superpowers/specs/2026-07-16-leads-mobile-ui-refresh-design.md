# Leads Page Mobile UI Refresh

## Purpose
Make the Leads page cleaner and mobile-friendly by replacing stat cards and filter dropdown with compact tappable filter pills.

## Changes

### Remove
- 5 StatCard components (Total Leads, Not Called, Called Today, Callbacks, Completed)
- `LeadFilters` component (status filter dropdown, type dropdown, area dropdown, search)

### Add: Filter pill row
Replace the removed elements with a single consolidated filter bar:

- **Status pills**: `All`, `Not Called`, `Today`, `Callback`, `Completed`, `No Answer`, `Wrong Number`
  - Each shows label + count (e.g. "All (52)")
  - Tapping sets the active filter
  - Active pill visually highlighted
  - Wraps to multiple rows on mobile
- **Below pills**: Type dropdown, Area dropdown, Search bar

### Data flow
- `filter` state stays the same in LeadsPage (`FilterMode`)
- Pills dispatch `onFilterChange` just like the dropdown did
- Stats map removed from page (no longer needed)

### Files affected
- `src/pages/LeadsPage.tsx` — remove stat cards + LeadFilters, inline the new pill bar + type/area/search
- `src/components/leads/LeadFilters.tsx` — can be fully removed or gutted
