# Client Portal Dashboard

## Overview

A public, shareable client portal page that displays a commercial cleaning client's account in a single-page dashboard. No login required — clients access via a unique token link after signing a contract. Designed for sales demos and ongoing client transparency.

## Route

- `/portal/:token` — public route (no auth)

## Data Model

No new Firestore collections needed. The portal queries existing collections via a share token.

**Token lookup:** A `shareToken` field is added to the `Site` type in Firestore (generated on contract acceptance). The portal queries `sites` collection with `where('shareToken', '==', token)`.

- **Site** (by `shareToken`) → client info, schedule, address, clientId
- **Inspections** (by `siteId`) → CleanCheck reports, pass/fail scores, photos
- **Shifts** (by `siteId`) → upcoming and past cleaning visits
- **Payments** (by `siteId`) → invoice history, balance
- **SharedContracts** (by `token`) → accepted quote/plan

## Component Tree

```
ClientPortal (page)
├── PortalHeader — GTA Scrub logo, client business name, last inspection score badge
├── CleanCheckCard — score summary (pass/needs/fail counts), inspector, date
│   └── CleanCheckReportView — expanded: items grouped by category with ratings, notes, photo thumbnails, client sign-off
├── ScheduleCard — next visit date/time, cleaner name, frequency
├── InvoicesCard — outstanding balance, last payment, next billing date
├── QuoteCard — service line items summary, monthly total, status badge
└── ProfileCard — business name, address, contact info, document download links
```

## Card Designs

### CleanCheckCard + CleanCheckReportView

Dashboard card shows:
- Large score badge (colored: green ≥ 90%, amber ≥ 70%, red < 70%)
- Pass / Needs Work / Fail counts inline
- Inspector name + formatted date
- "View Full Report" button

Expanded report view (renders below card, inline):
- Items grouped by category (Floors, Washrooms, Dusting, Kitchen, etc.)
- Each item: rating icon (check/alert/x), label, notes, photo thumbnails
- Photo thumbnails load from `photoIds` via photoStore utility; click to enlarge
- Overall notes section
- Client sign-off section (if signed): checkmark + signed name + date

### ScheduleCard

- Next upcoming shift: date, start time, cleaner name
- Frequency label (e.g. "Weekly · Mon & Thu")
- "View Full Schedule" expands to show last 10 shifts in a list

### InvoicesCard

- Balance: sum of unpaid payments (green if $0, red if > $0)
- Last payment: date + amount (if any)
- Next billing date based on frequency
- "View Invoices" expands to show last 10 payments with status badges (Paid / Unpaid)

### QuoteCard

- Service line items from sharedContracts (description, visits/week, per-visit rate)
- Monthly total
- Status: "Accepted" (green) or "Pending" (amber)
- "View Full Quote" links to `/quote/:token`

### ProfileCard

- Business name, address, city, province
- Contact name + phone
- Document links: contract PDF, insurance certificate (conditional — only shown if data exists)

## Demo Mode

URL param `?demo=true` populates all cards with realistic sample data for sales demos with prospects who haven't signed yet. Each card shows the layout structure even when real data doesn't exist.

## Empty States

Every card gracefully handles missing data:
- "No inspection yet — first one coming soon"
- "No upcoming visits scheduled"
- "No payment history yet"
- Shows layout structure so the page never looks broken

## Implementation Notes

- Reuses `InspectionReportModal` logic adapted into an inline `CleanCheckReportView` component
- Photo loading uses existing `photoStore` utility from `src/utils/photoStore.ts`
- Quote data source: existing `sharedContracts` collection (same as `SharedQuotePage`)
- No new types needed — all data uses existing `Inspection`, `Site`, `Shift`, `Payment`, `Client` interfaces

## Future Considerations (not in scope)

- Client authentication (login/password)
- Push notifications for new inspection reports
- In-app feedback/submission forms
- Recurring invoice PDF generation
