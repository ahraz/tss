# Cold Outreach Email Template — GTA Scrub

**Date:** 2026-07-12
**Status:** Approved → Implementation

## Overview

High-converting HTML email template for cold outreach to dental clinics in the GTA. Drives free demo clean bookings from scraped Google Sheets leads.

## Target Audience

- Dental clinic owners, office managers, and decision-makers
- Businesses in Brampton and surrounding GTA cities
- Scraped leads with email, business name, rating, and location data available

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Format | HTML email | Better open/click rates for service businesses |
| Approach | Trust-First (Approach A) | Leads with social proof (4.9 stars, 500+ clients) — the key barrier in cold outreach |
| Personalization | Moderate | Business name, star rating, city from sheet columns |
| CTA | Free demo clean | Lowest-friction entry; matches GTA Scrub's key offer |
| Width | 600px max | Standard email client safe width |
| Mobile | Stacks at <480px | Essential — 60%+ opens are mobile |

## Email Structure

```
┌─────────────────────────────────────┐
│  HEADER:  GTA Scrub logo            │
├─────────────────────────────────────┤
│  HERO:    Navy gradient background  │
│           "The clean your patients  │
│            already expect."          │
├─────────────────────────────────────┤
│  TRUST BAR:  ★ 4.9  ·  500+  ·  Insured │
├─────────────────────────────────────┤
│  BODY:    "Hi {{business_name}} team" │
│           Photo-verified pitch       │
│           No contracts callout       │
│           Dental-specific value prop │
├─────────────────────────────────────┤
│  PERSONALIZATION:                    │
│           {{business_name}} — {{rating}} ★ │
│           "Serving {{city}}"          │
├─────────────────────────────────────┤
│  CTA:     [Claim Your Free Demo]

Green button, full-width on mobile │
├─────────────────────────────────────┤
│  FOOTER:  Phone · Email · Address   │
│           Unsubscribe link           │
└─────────────────────────────────────┘
```

## Visual Spec

| Property | Value |
|---|---|
| Max width | 600px |
| Primary color | #0F1D3D (navy) |
| Accent color | #22C55E (green) |
| Text color | #1E293B (dark gray) |
| Background | #FFFFFF (white) |
| Section alt bg | #F8FAFC (light gray) |
| Heading font | Trebuchet MS, sans-serif |
| Body font | Arial, Helvetica, sans-serif |
| CTA button | White text on #22C55E, 16px bold, rounded 6px |

## Merge Fields

| Field | Source Column | Example |
|---|---|---|
| `{{business_name}}` | Column C (title) | "Magnolia Dental Brampton" |
| `{{rating}}` | Column E (rating) | "5.0" |
| `{{city}}` | Column F (address) — extract city | "Brampton" |
| `{{first_name}}` | Manual / fallback | "there" (default) |

## Deliverables

1. `emails/cold-outreach-dental.html` — standalone HTML email template with inline CSS and merge tags
2. `emails/README.md` — documentation on usage with Google Sheets / mail merge tools

## Success Criteria

- Renders correctly in Gmail, Outlook, Apple Mail
- Mobile-responsive at <480px
- All merge tags clearly documented
- Unsubscribe link included (CAN-SPAM compliance)
- Matches GTA Scrub brand (navy, green, logo)
