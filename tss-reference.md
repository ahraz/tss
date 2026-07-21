# TSS App Reference

## Stack
React 19 + TypeScript + Firebase Firestore + Tailwind CSS + Vite 8

## All Pages (22+)

| Route | Page | Purpose | Role |
|-------|------|---------|------|
| `/login` | LoginPage | PIN-based login (name + 4-digit PIN) | Public |
| `/` | DashboardPage | Overview: revenue, profit, payroll, upcoming shifts | Auth |
| `/profile` | ProfilePage | Edit own profile (photo, skills, languages, availability, documents, emergency contacts, driver info, uniform size) | Auth |
| `/clock` | ClockPage | Clock in/out with photo, break management, supply issues | Auth |
| `/shifts` | ShiftsPage | View/filter shifts, edit notes, clock photos, CSV export, time correction | Auth |
| `/schedule` | SchedulePage | Weekly schedule by day, site/employee assignments | Owner/Partner |
| `/sites` | SitesPage | CRUD cleaning sites, list/area view, filter by status | Auth |
| `/sites/:id` | SiteDetailPage | Single site: Info, Shifts, Finances, Checklist, Inventory tabs | Auth |
| `/quotes` | QuotesPage | List/create quotes, filter by status (draft/sent/accepted/rejected) | Owner/Partner |
| `/quotes/:id` | QuoteDetailPage | Line items, estimator, version history, PDF, contract, sharing | Owner/Partner |
| `/quotes/templates` | TemplatesPage | Quote estimation templates by facility type | Owner/Partner |
| `/team` | TeamPage | Manage employees/partners/owners, add/edit/delete, change PIN | Owner/Partner |
| `/quality` | QualityPage | Inspections (perform/sign-off/report) + Incidents | Owner/Partner |
| `/money` | MoneyBookPage | Finance hub: Revenue, Expenses, Profit, Payroll tabs | Owner/Partner |
| `/analytics` | AnalyticsPage | Charts: revenue, costs, profit by day, site-level profit breakdown | Owner/Partner |
| `/leads` | LeadsPage | Import/scrape from Google Sheets, log calls/emails, filter prospects | Owner |
| `/tasks` | TasksPage | Kanban board (Todo/In Progress/Done), assign to users/sites | Auth |
| `/settings` | SettingsPage | Business settings, profile edit, PIN change, data import/export/clear | Owner |
| `/quote/:token` | SharedQuotePage | Public quote view with accept/reject | Public |
| `/share/:token` | ShareContractPage | Public contract with signature pad, PDF download | Public |
| `/portal/:token` | ClientPortal | Client portal: CleanCheck reports, schedule, invoices, quote, profile | Public |

## Firestore Collections (17+)
leads, callLogs, emailLogs, sites, shifts, clockEntries, quotes, quoteTemplates, contracts, inspections, incidents, revenue, expenses, payroll, tasks, users, settings, documents, notifications, portalTokens

## Key Features Already Built
- **Leads:** Google Sheets import, scrape from Maps, call logging with outcomes, email templates (dental/medical/general/professional), copy-to-clipboard with subject, Mark as Sent, filter by emailed/not emailed
- **Quotes:** Line items, line item estimator, PDF generation, version history, contract generation, public share with acceptance
- **Sites:** Full CRUD with detail page, finances tracking, checklists, inventory per site
- **Schedule:** Weekly view, employee/site assignments
- **Clock:** Photo-verified clock in/out, break tracking, supply reporting
- **Shifts:** View/filter, time correction, CSV export, clock photos
- **Quality:** Inspections with sign-off, incident reporting
- **Money:** Revenue, expenses, profit tracking, payroll processing
- **Analytics:** Charts with recharts, site-level profit breakdown
- **Tasks:** Kanban board, recurring tasks, assignment
- **Client Portal:** Public portal with CleanCheck reports, schedule, invoices
- **Contract Signing:** Public share with signature pad
- **Team:** Employee/partner/owner management, profiles
- **Profile:** Full employee profile with documents, skills, languages, emergency contacts, driver info

## Lead Field Model
Lead has: id, rowIndex, type, phone, businessName, types, rating, address, reviews, website, placeId, gpsCoordinates, email?, currentCleaner?, competitorNotes?, lastContactedAt?, latestCall (derived from callLogs)

## Email System
- Email sent tracking via EmailLog collection (leadId, businessName, email, sentById, sentByName, sentAt)
- Filter: `emailed` (has logs) and `not_emailed` (has email but no logs)
- Templates: cold-outreach-dental.html, medical.html, general.html, professional.html
- Copy to clipboard includes subject line now (LeadsPage.tsx:486)
- "Mark as Sent" in toast + expanded card

## Business Context
- GTA Scrub — commercial cleaning in Brampton, ON
- $0 revenue, 0 real clients
- Lead gen is 100% online (alexonline persona)
