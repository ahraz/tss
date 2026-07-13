# Shareable Contract Link — Design Spec

## Overview

Add a shareable contract link feature so the admin can send a unique URL to a client, who can then view the contract, draw their signature, and submit. On submission, a client + site record is auto-created and the admin sees a notification on the dashboard.

## Goals

- Admin generates a shareable link from the contract modal
- Client opens the link (no login required), views the contract, signs, and submits
- On submit: client + site records are auto-created, quote status updates to 'accepted'
- Admin sees a dashboard notification badge when a contract is signed
- Links expire after 7 days

## Data Model

### New Firestore Collection: `sharedContracts`

```typescript
interface SharedContract {
  id: string;                    // random 20-char alphanumeric token (document ID)
  quoteId: string;               // reference to the original quote
  quoteData: {                   // snapshot of quote data at share time
    prospectName: string;
    prospectAddress: string;
    prospectCity: string;
    prospectProvince: string;
    prospectPostalCode: string;
    prospectPhone: string;
    lineItems: QuoteLineItem[];
    totalMonthly: number;
  };
  contractNumber: string;        // e.g. "CONTRACT-A1B2C3"
  status: 'pending' | 'signed';
  clientSignature?: string;      // PNG data URL, set on sign
  signedAt?: string;             // ISO timestamp
  createdAt: string;             // ISO timestamp
  expiresAt: string;             // ISO timestamp (7 days from creation)
  createdBy: string;             // admin user ID
}
```

### Firestore Rules

Add to `firestore.rules`:
```
match /sharedContracts/{docId} {
  allow read: if true;                    // anyone with the link can read
  allow update: if true;                  // client can submit signature
  allow create: if request.auth != null;  // only authenticated admins can create
}
```

The security model: the unguessable token (document ID) acts as the access control. No auth required to read/update. Only admins (authenticated) can create shared contracts.

## Admin Flow

### Generating the Link

1. Admin opens a quote (status must be 'accepted'), clicks "Generate Contract"
2. The existing `ContractGenerator` modal opens
3. Modal now has two action sections:
   - **"Share with Client"** — generates the link and shows a copy button
   - **"Download PDF"** — downloads locally (existing behavior, unchanged)
4. When admin clicks "Generate Link":
   - A `sharedContracts` document is created with a random 20-char token as the ID
   - Quote data is snapshot into `quoteData` (so the contract is independent of future quote edits)
   - The shareable URL is displayed: `{currentOrigin}/#/share/{token}`
   - A "Copy Link" button copies the URL to clipboard
   - `toast.success('Contract link copied to clipboard')` on copy

### After Client Signs

- The admin does NOT need to manually convert — the client signing triggers auto-conversion
- The quote status updates to 'accepted'
- The client + site records are created automatically

## Client Flow

### Route

New public route in `App.tsx`: `/#/share/:token`

This route bypasses `ProtectedRoute` — no auth required.

### Page: `ShareContractPage`

**States:**

1. **Loading** — fetching `sharedContracts/{token}` from Firestore
2. **Expired** — `expiresAt < now` → show "This contract link has expired. Please contact GTA Scrub for a new link."
3. **Already Signed** — `status === 'signed'` → show "This contract has already been signed." with a PDF download button
4. **Ready to Sign** — `status === 'pending'` → show the contract + signature pad

### Contract Display

- Full contract rendered as styled HTML (same layout as admin preview in `ContractGenerator`)
- Read-only — no interactive elements except the signature pad and submit button
- Company branding (GTA Scrub logo, letterhead)
- Contract number, client details, line items, terms, footer

### Signature Pad

- HTML5 Canvas (300×150px, same as admin signature pad)
- Mouse + touch support
- "Clear" button to reset
- Signature stored as PNG data URL

### Submit

- "Submit Contract" button (disabled until signature is drawn)
- On click:
  1. Save `clientSignature` and `signedAt` to the `sharedContracts` document
  2. Set `status: 'signed'`
  3. Auto-create client record (same fields as current `handleContractConvert`)
  4. Auto-create site record (same fields as current `handleContractConvert`)
  5. Update quote status to 'accepted'
  6. Navigate to "Thank You" page

### Thank You Page

- "Thank you, {prospectName}! Your contract has been signed."
- "Download a copy of your signed contract" button (generates PDF via html2canvas + jsPDF)
- No further action needed from the client

## Dashboard Notification

### Badge

- On the dashboard (owner/partner only), add a notification section at the top
- Badge shows count of `sharedContracts` where `status === 'signed'` and `notificationDismissedAt` is not set
- Styled as a red/orange badge with a bell icon

### Notification Panel

- Clicking the badge opens a dropdown/panel listing recent signings
- Each entry shows: client name (`quoteData.prospectName`), signed timestamp
- Clicking an entry navigates to the quote detail page (`/quotes/{quoteId}`)
- "Dismiss All" button marks all as dismissed (sets `notificationDismissedAt`)

### Data Source

- On app load, fetch `sharedContracts` where `status === 'signed'` and `notificationDismissedAt` is null
- Add `sharedContracts` to the Firestore sync (fetchAllCollectionsOnce + onSnapshot)
- Add `sharedContracts` to the AppContext state

## Files to Create/Modify

### New Files
- `src/types/sharedContract.ts` — SharedContract interface
- `src/pages/ShareContractPage.tsx` — Public contract viewing/signing page
- `src/components/notifications/ContractNotificationBadge.tsx` — Dashboard notification badge

### Modified Files
- `src/types/index.ts` — export SharedContract
- `src/App.tsx` — add public route `/#/share/:token`
- `src/lib/firebaseSync.ts` — add `sharedContracts` collection to sync
- `src/context/AppContext.tsx` — add `sharedContracts` to state and dispatch actions
- `src/components/quotes/ContractGenerator.tsx` — add "Generate Link" section with copy button
- `src/pages/DashboardPage.tsx` — add notification badge at top
- `firestore.rules` — add `sharedContracts` rules
- `src/index.css` — add print-friendly styles for contract page

## Error Handling

- Firestore write failures → `toast.error('Failed to save. Please try again.')`
- Link expired → static "expired" page with contact info
- Link already signed → static "signed" page with download option
- PDF generation failure → `toast.error('Failed to generate PDF. Please try again.')`
- Invalid token → "Contract not found" page

## Security Considerations

- Token is a random 20-character alphanumeric string (62^20 ≈ 10^35 possibilities)
- 7-day expiry limits the window of exposure
- Only authenticated users (admins) can create shared contracts
- No sensitive business data is exposed — only the contract content for the specific client
- The client can only view/sign their own contract — no access to other contracts

## Testing

- Admin: generate link, copy it, open in incognito → contract renders
- Admin: link expires after 7 days → shows expired page
- Admin: client signs → client + site auto-created, quote updated
- Admin: dashboard badge shows count, clicking shows list
- Client: contract displays correctly with all line items
- Client: signature pad works (mouse + touch)
- Client: submit saves signature and creates records
- Client: refresh after submit → shows "already signed"
- Client: expired link → shows expired message
