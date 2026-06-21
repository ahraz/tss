# GTA Scrub — Change Log

This file tracks all modifications made to the project. Entries are reverse-chronological.

---

## 2026-06-20 — Feature superpower expansions (v2)

### Added

#### TasksPage
- **Inline status toggle** — One-click cycle through todo → inprogress → done (◐ ○ ● icons)
- **Site filter** — Filter tasks by linked site
- **Completion notes** — Add notes when marking tasks as done, visible on card and in detail modal
- **Task detail modal** — Full task info with status buttons, assignee, dates, completion note editor
- **Recurring task checkbox** — Option to mark tasks as recurring on creation

#### DashboardPage
- **Employee: Today's Schedule** — Shows assigned sites with cleaning day matching today, with Done/Active/Due badges
- **Employee: Inline task completion** — One-click mark-as-done on dashboard tasks
- **Owner: Cash Flow Summary** — Monthly revenue, expenses, and net cash flow cards
- **Owner: Recent Payments** — Last 5 payments listed with site name and amount

#### ClockPage
- **Break tracking** — Start/end break button during active shift, timer shows total/break/work time
- **Supply/Issue reporting** — Report supply shortages during shift (auto-creates a task for management)
- **Break in shift summary** — Break duration shown in completion modal

#### ShiftsPage
- **Time correction** — Owners/partners can edit clock-in and clock-out times for completed shifts (recalculates duration)

#### SitesPage
- **Cleaning days display** — Shows abbreviated cleaning days on site cards (MO, TU, WE, etc.)

#### TeamPage
- **Employee performance stats** — View modal now shows week hours, month hours, month shifts, and tasks done with colored stat cards

#### MoneyBookPage
- **Profit by Site tab** — Per-site profitability breakdown showing revenue, expenses, labour costs, net profit, and margin percentage with summary cards

### Changed
- `Task` type — Added optional `completedNote` field
- `useClock` hook — Added break tracking state, supply issue reporting, `formatWorkElapsed`
- All page components updated to use new expanded capabilities
