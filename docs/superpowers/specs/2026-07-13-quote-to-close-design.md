# Quote-to-Close Optimization — Design Spec

**Date:** 2026-07-13
**Status:** Approved → Implementation

## Overview

Convert more leads into paying clients by reducing friction in the quote-to-sign process. Three features: smart quote pre-fill by business type, shareable public quote pages, and quote view tracking.

## Feature 1: Smart Quote Pre-fill

**Goal:** "Create Quote from Lead" auto-populates line items based on the lead's business type, making quote creation faster and more accurate.

**Mapping:**

| Lead Type | Auto Line Items |
|---|---|
| Dental Clinic | Medical-grade disinfection, Exam room cleaning, Reception area, Floor care |
| Medical Center | Medical-grade disinfection, Waiting room, Exam rooms, Sanitization |
| Physiotherapy Clinic | Treatment area cleaning, Reception, Floor care, Sanitization |
| Veterinary Clinic | Treatment area cleaning, Reception, Floor care, Sanitization |
| Law Firm, Accounting Office, Real Estate Agency, Insurance Agency | Reception area, Conference rooms, Office cleaning, Window cleaning |
| Corporate Office (default) | Workstation cleaning, Reception, Floor care, Breakroom |

**Implementation:** Modify the "Create Quote from Lead" button handler in `LeadsPage.tsx`. Add line items to the quote object before dispatching. Use existing `LineItem` type.

## Feature 2: Shareable Quote Page

**Goal:** Each quote gets a unique public URL the lead can open without logging in. The page shows a branded GTA Scrub view with service breakdown, pricing, and an accept button.

**Flow:**
1. Owner clicks "Share Quote" on QuoteDetailPage → generates a unique token
2. Token stored on the quote document (`shareToken` field)  
3. Owner copies link: `https://gtascrub.com/quote/{token}`
4. Lead opens link → sees public page with quote details
5. Lead clicks "Accept" → quote status changes to `accepted` → owner notified

**Route:** `/quote/:token` — no ProtectedRoute wrapper, accessible to anyone.

**Page layout:**
```
┌────────────────────────────────────┐
│  GTA Scrub logo                    │
│                                    │
│  Quote for [Business Name]         │
│  Valid until [Date]                │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Service           Monthly    │  │
│  │ Office Cleaning    $1,200    │  │
│  │ Floor Care          $400     │  │
│  │ ──────────────────────────── │  │
│  │ Total              $1,600    │  │
│  └──────────────────────────────┘  │
│                                    │
│  Notes: [Quote notes]               │
│                                    │
│  [Accept Quote]  [Contact Us]       │
│                                    │
│  GTA Scrub · Brampton, ON           │
│  4.9 ★ · 500+ clients · Insured    │
└────────────────────────────────────┘
```

**Actions on accept:**
- Update `quote.status` to `'accepted'` in Firestore
- Record acceptance timestamp
- Show confirmation message on page
- Notify owner via toast on next load

## Feature 3: Quote View Tracking

**Goal:** Know when a lead views a shared quote so you can follow up at the right time.

**Data model:** `QuoteView { id, quoteId, token, viewedAt, ip }`

**Firestore:** Collection `quoteViews`. Document ID = generated UUID.

**Display:** On QuoteDetailPage, show view stats below the share button:
```
Viewed 3 times. Last: Jul 13, 2026 2:30 PM
```

**Follow-up prompt:** In the Leads page, if a quote has views but isn't accepted after 48 hours, show a subtle indicator on the lead card.

## Shared Contract Reuse

The app already has a `sharedContracts` system with `generateShareToken` in `src/types/sharedContract.ts`. The quote sharing will reuse the same token generation pattern but with its own route and UI.

## Files Changed

| File | Change |
|---|---|
| `src/types/index.ts` | Add `QuoteView`, `quoteViews` to AppState, actions |
| `src/context/AppContext.tsx` | Add `quoteViews` init + reducer + dispatch |
| `src/lib/firebaseSync.ts` | Add `quoteViews` collection, listener, sync cases |
| `src/pages/LeadsPage.tsx` | Smart pre-fill line items by business type |
| `src/pages/QuoteDetailPage.tsx` | Add "Share Quote" button + view stats |
| `src/pages/SharedQuotePage.tsx` | **NEW** public quote viewer |
| `src/App.tsx` | Add `/quote/:token` route |
| `firestore.rules` | Allow public read on quotes with shareToken |

## Success Criteria

- Owner creates quote from lead in <5 seconds with pre-filled services
- Leads can view and accept quotes without creating an account
- Owner sees when a lead viewed their quote and can follow up
- Quote acceptance updates in real-time
