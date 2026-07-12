# Contract PDF Generator — Design Spec

**Date:** 2026-07-12
**Status:** Approved
**Approach:** html2canvas + jspdf (same pattern as quote PDF)

## Overview

Generate a professional branded service agreement PDF from an accepted quote, capture a drawn customer signature, download the signed PDF, and store it on the client record.

## When It Runs

After a quote status is `accepted`, the "Convert to Client & Site" button changes to "Generate Contract". Clicking it opens a single-screen modal with the contract preview and signature pad.

## Architecture

### New Files
- `src/components/quotes/ContractGenerator.tsx` — Main modal component (review + signature + download)
- `src/utils/contract-terms.ts` — Standard cleaning contract terms text
- `src/types/contract.ts` — Contract type definition

### Modified Files
- `src/pages/QuoteDetailPage.tsx` — Replace "Convert to Client" button with "Generate Contract", wire up ContractGenerator
- `src/types/index.ts` — Add `contractPdf?: string` and `contractSignature?: string` fields to Client type

## Data Flow

```
Quote data → ContractGenerator (HTML render)
                ↓
         html2canvas → contract image (PNG)
                ↓
         jsPDF → contract PDF with embedded signature
                ↓
         Download PDF to user's device
                ↓
         Create client + site records (same as current flow)
                ↓
         Store contractPdf + contractSignature on client record
                ↓
         Mark quote as accepted
                ↓
         Navigate to new site page
```

## Contract Content

### Header
- GTA Scrub logo (PNG image) + "Commercial Cleaning Services"
- "SERVICE AGREEMENT" title
- Contract number: ` CONTRACT-{quote.id.slice(-6).toUpperCase()}`
- Date: current date

### Parties
- "Between: GTA Scrub (Service Provider)"
- Client: `{quote.prospectName}`
- Address: `{quote.prospectAddress}, {quote.prospectCity}, {quote.prospectProvince} {quote.prospectPostalCode}`
- Phone: `{quote.prospectPhone}`

### Scope of Services
Table of line items from `quote.lineItems`:
| Description | Frequency | Visits/Week | Rate/Visit | Monthly |
|-------------|-----------|-------------|------------|---------|
| {item.description} | {item.frequency} | {item.visitsPerWeek}x | ${item.amountPerVisit} | ${item.monthlyAmount} |

**Total Monthly:** `{quote.totalMonthly}`

### Terms & Conditions

1. **Term** — 12-month agreement from the service start date. Automatically renews on a month-to-month basis unless either party provides 30 days' written notice of termination.

2. **Payment** — Payment is due within fifteen (15) days of invoice date. A late payment fee of 1.5% per month will be applied to outstanding balances.

3. **Scope of Changes** — Either party may request changes to the scope of services in writing. Changes will be documented as an amendment to this agreement with adjusted pricing as applicable.

4. **Cancellation** — Either party may cancel this agreement with 30 days' written notice. Early termination within the initial 12-month term incurs a fee equal to two (2) months' service.

5. **Liability** — GTA Scrub carries commercial general liability insurance. The client is responsible for securing the premises and ensuring safe access for cleaning personnel.

6. **Confidentiality** — Both parties agree to maintain the confidentiality of any business or proprietary information encountered during the performance of services.

7. **Satisfaction** — If service quality does not meet expectations, GTA Scrub will re-clean the affected area within 24 hours at no additional charge.

### Signature Block
- **Client Signature:** [drawn signature image] — **Date:** {date}
- **GTA Scrub Representative:** Pre-filled "GTA Scrub" text with date line — no second signature required

### Footer
- "This agreement is governed by the laws of Ontario, Canada."
- Page numbers

## Signature Pad

### Component
HTML5 Canvas element with touch/mouse event support.

### Specifications
- Canvas size: 300×150px
- Background: white
- Stroke: black, 2px width
- Label: "Draw your signature" above canvas
- "Clear" button to reset

### Behavior
- Signature is required — "Download & Convert" button disabled until signature is drawn
- Supports both mouse and touch events (mobile/tablet compatible)
- Clear button resets canvas and re-disables download
- **Reactive rendering:** As user draws, signature image is rendered into the contract HTML preview at the signature line (via React state → conditional `<img>` tag)

### Storage
- Signature captured as PNG data URL from canvas
- Stored as `contractSignature` field on Client record (base64)
- Also embedded in the PDF at the signature line

## UI / Modal Layout

### Entry Point
On `QuoteDetailPage`, when `quote.status === 'accepted'`:
- Replace "Convert to Client & Site" button with "Generate Contract" button
- Icon: `FileText` from lucide-react

### Modal (single screen)
```
┌─────────────────────────────────────────────┐
│ Generate Contract                        [X]│
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │         CONTRACT PDF PREVIEW            │ │
│ │  (html2canvas capture zone)             │ │
│ │                                         │ │
│ │  GTA Scrub logo + header                │ │
│ │  Client info from quote                 │ │
│ │  Line items table                       │ │
│ │  Terms & conditions                     │ │
│ │  Signature lines                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│  Client Signature                           │
│  ┌─────────────────────────────────────┐    │
│  │        DRAW YOUR SIGNATURE          │    │
│  │                                     │    │
│  │   (canvas pad)     [Clear]          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│              [Cancel]  [Download & Convert]  │
└─────────────────────────────────────────────┘
```

### "Download & Convert" Action
1. Validate signature is drawn (button should be disabled otherwise)
2. Render signature image into the contract HTML at the signature line (reactive — updates contract preview as user draws)
3. Capture contract HTML via `html2canvas` (scale 2x, white background) — signature is now part of the captured image
4. Capture signature canvas as PNG data URL (separate copy for storage)
5. Build PDF with `jsPDF`:
   - Add contract image as full-page background (signature included)
   - Paginate if taller than one A4 page
6. Download PDF: `Contract-{quote.prospectName}.pdf`
7. Create client record (same fields as current `handleConvertToClient`)
8. Create site record (same fields as current `handleConvertToClient`)
9. Store `contractPdf` (base64 of PDF) and `contractSignature` (base64 of signature PNG) on client record
10. Mark quote as `accepted` with version history
11. Show success toast
12. Navigate to new site page

## Technical Details

### html2canvas Capture
```typescript
// Hide signature pad area during capture
const canvas = await html2canvas(contractElement, {
  scale: 2,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
});
```

### jsPDF Pagination
```typescript
const imgWidth = 210; // A4 width mm
const imgHeight = (canvas.height * imgWidth) / canvas.width;
const pageHeight = 297; // A4 height mm
// Paginate if taller than one page
```

### Client Record Extension
```typescript
// In types/index.ts Client interface
contractPdf?: string;        // base64 data URL of signed contract PDF
contractSignature?: string;  // base64 data URL of drawn signature PNG
```

## Error Handling
- Signature required: button disabled, toast message if attempted without signature
- html2canvas failure: toast error, modal stays open for retry
- PDF generation failure: toast error, modal stays open

## Testing Checklist
- [ ] Contract renders all quote line items correctly
- [ ] Contract terms are complete and formatted
- [ ] Signature pad works with mouse
- [ ] Signature pad works with touch
- [ ] Clear button resets signature
- [ ] Download button disabled without signature
- [ ] PDF downloads with correct filename
- [ ] PDF contains contract content + signature
- [ ] Client record created with contractPdf field
- [ ] Site record created correctly
- [ ] Quote marked as accepted
- [ ] Navigation to new site page works
