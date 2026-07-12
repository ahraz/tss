# Contract PDF Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a branded service agreement PDF from an accepted quote with drawn customer signature, download it, and store on the client record.

**Architecture:** Render contract as styled HTML, capture with html2canvas, embed signature, generate PDF with jsPDF. Single-screen modal with contract preview and signature pad. Signature rendered reactively into contract HTML as user draws.

**Tech Stack:** React 19, TypeScript, html2canvas, jspdf, Tailwind CSS, lucide-react icons

## Global Constraints

- React 19 + TypeScript + Vite + Firebase Firestore
- html2canvas and jspdf already installed
- Logo image: `src/assets/gtascrub.png`
- Badge component only supports: `success | warning | danger | info | neutral`
- Use `formatCAD()` from `src/utils/formatters.ts` for currency
- Use `generateId()` from `src/utils/storage.ts` for IDs
- Use `toast` from `react-hot-toast` for notifications

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/contract.ts` | Create | Contract interface |
| `src/types/index.ts` | Modify | Export contract types, add client fields |
| `src/utils/contract-terms.ts` | Create | Contract terms text constants |
| `src/components/quotes/ContractGenerator.tsx` | Create | Main modal: HTML preview + signature pad + PDF |
| `src/pages/QuoteDetailPage.tsx` | Modify | Wire up ContractGenerator, change button |

---

### Task 1: Add Contract Types and Client Fields

**Files:**
- Create: `src/types/contract.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `Contract` interface, exports from index.ts

- [ ] **Step 1: Create contract type**

```typescript
// src/types/contract.ts
export interface Contract {
  id: string;
  quoteId: string;
  contractNumber: string;
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientProvince: string;
  clientPostalCode: string;
  clientPhone: string;
  lineItems: {
    description: string;
    frequency: string;
    visitsPerWeek: number;
    amountPerVisit: number;
    monthlyAmount: number;
  }[];
  totalMonthly: number;
  signatureDataUrl: string;
  createdAt: string;
}
```

- [ ] **Step 2: Add client fields and export from index.ts**

Open `src/types/index.ts`. Add these fields to the `Client` interface (after `isSubSite`):

```typescript
contractPdf?: string;
contractSignature?: string;
```

Add at the end of the file:

```typescript
export type { Contract } from './contract';
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/types/contract.ts src/types/index.ts
git commit -m "feat: add contract type and client fields"
```

---

### Task 2: Create Contract Terms Text

**Files:**
- Create: `src/utils/contract-terms.ts`

**Interfaces:**
- Produces: `CONTRACT_TERMS` string constant, `CONTRACT_FOOTER` string constant

- [ ] **Step 1: Create contract terms file**

```typescript
// src/utils/contract-terms.ts

export const CONTRACT_TERMS = `
## Terms & Conditions

**1. Term.** This agreement shall commence on the service start date and continue for a period of twelve (12) months. This agreement shall automatically renew on a month-to-month basis unless either party provides thirty (30) days' written notice of termination.

**2. Payment.** Payment is due within fifteen (15) days of the invoice date. A late payment fee of 1.5% per month will be applied to outstanding balances beyond the payment period.

**3. Scope of Changes.** Either party may request changes to the scope of services in writing. Any changes will be documented as an amendment to this agreement with adjusted pricing as applicable.

**4. Cancellation.** Either party may cancel this agreement with thirty (30) days' written notice. Early termination within the initial twelve (12) month term shall incur a cancellation fee equal to two (2) months' service charges.

**5. Liability.** GTA Scrub maintains commercial general liability insurance. The client is responsible for securing the premises and ensuring safe access for cleaning personnel during scheduled service times.

**6. Confidentiality.** Both parties agree to maintain the confidentiality of any business or proprietary information encountered during the performance of services under this agreement.

**7. Satisfaction.** If service quality does not meet the client's expectations, GTA Scrub will re-clean the affected area within twenty-four (24) hours at no additional charge.
`.trim();

export const CONTRACT_FOOTER = `This agreement is governed by the laws of Ontario, Canada.`;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/contract-terms.ts
git commit -m "feat: add standard cleaning contract terms"
```

---

### Task 3: Create ContractGenerator Component

**Files:**
- Create: `src/components/quotes/ContractGenerator.tsx`

**Interfaces:**
- Consumes: `Quote` type, `formatCAD` formatter, `generateId` utility, `logoImage` asset
- Produces: `ContractGenerator` component (exported)

- [ ] **Step 1: Create ContractGenerator component**

```typescript
// src/components/quotes/ContractGenerator.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCAD, formatDate } from '../../utils/formatters';
import { generateId } from '../../utils/storage';
import { CONTRACT_TERMS, CONTRACT_FOOTER } from '../../utils/contract-terms';
import logoImage from '../../assets/gtascrub.png';
import type { Quote } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  onConvert: (contractPdf: string, contractSignature: string) => void;
}

export function ContractGenerator({ isOpen, onClose, quote, onConvert }: Props) {
  const contractRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const contractNumber = `CONTRACT-${quote.id.slice(-6).toUpperCase()}`;
  const today = new Date().toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Canvas drawing logic
  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Check if canvas has any content
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((val, i) => i % 4 === 3 && val > 0);
    if (hasContent) {
      setHasSignature(true);
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl(null);
  }, []);

  // Reset canvas when modal opens
  useEffect(() => {
    if (isOpen) {
      clearCanvas();
    }
  }, [isOpen, clearCanvas]);

  const handleDownloadAndConvert = async () => {
    if (!contractRef.current || !hasSignature || !signatureDataUrl) return;
    setGenerating(true);

    try {
      const element = contractRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfDataUrl = pdf.output('dataurlstring');
      const pdfBase64 = pdfDataUrl.split(',')[1];

      // Download the PDF
      const fileName = `Contract-${quote.prospectName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);

      // Convert to client and store contract
      onConvert(`data:application/pdf;base64,${pdfBase64}`, signatureDataUrl);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const lineItemsTotal = quote.lineItems.reduce((sum, li) => sum + li.monthlyAmount, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Contract" size="xl">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Contract Preview (capture zone) */}
        <div ref={contractRef} className="bg-white p-8 border rounded-lg" style={{ fontFamily: 'Times New Roman, serif' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-800">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="GTA Scrub" width={48} height={48} style={{ objectFit: 'contain' }} />
              <div>
                <div className="text-xl font-bold text-gray-900">GTA Scrub</div>
                <div className="text-xs text-gray-500 tracking-wider uppercase">Commercial Cleaning Services</div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div className="font-bold text-lg text-gray-900">SERVICE AGREEMENT</div>
              <div className="mt-1">{contractNumber}</div>
              <div>{today}</div>
            </div>
          </div>

          {/* Parties */}
          <div className="mb-6 text-sm">
            <div className="mb-2"><strong>Between:</strong> GTA Scrub (Service Provider)</div>
            <div className="mb-1"><strong>Client:</strong> {quote.prospectName}</div>
            <div>{quote.prospectAddress}</div>
            <div>{quote.prospectCity}, {quote.prospectProvince} {quote.prospectPostalCode}</div>
            {quote.prospectPhone && <div>Phone: {quote.prospectPhone}</div>}
          </div>

          {/* Scope of Services */}
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-2 uppercase tracking-wide">Scope of Services</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2">Description</th>
                  <th className="text-center py-2">Frequency</th>
                  <th className="text-center py-2">Visits/Week</th>
                  <th className="text-right py-2">Rate/Visit</th>
                  <th className="text-right py-2">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-center capitalize">{item.frequency}</td>
                    <td className="py-2 text-center">{item.visitsPerWeek}x</td>
                    <td className="py-2 text-right">{formatCAD(item.amountPerVisit)}</td>
                    <td className="py-2 text-right font-medium">{formatCAD(item.monthlyAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="py-2 text-right font-bold">Total Monthly</td>
                  <td className="py-2 text-right font-bold text-lg">{formatCAD(quote.totalMonthly)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Terms */}
          <div className="mb-6 text-sm leading-relaxed whitespace-pre-wrap">
            {CONTRACT_TERMS}
          </div>

          {/* Signature Block */}
          <div className="mb-6 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-sm font-bold mb-1">Client Signature</div>
                {signatureDataUrl ? (
                  <img src={signatureDataUrl} alt="Client Signature" className="h-12 border-b border-gray-400" />
                ) : (
                  <div className="h-12 border-b border-gray-400 flex items-end text-xs text-gray-400 pb-1">
                    Awaiting signature...
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">Date: {today}</div>
              </div>
              <div>
                <div className="text-sm font-bold mb-1">GTA Scrub Representative</div>
                <div className="h-12 border-b border-gray-400 flex items-end text-sm text-gray-700 pb-1">
                  GTA Scrub
                </div>
                <div className="text-xs text-gray-500 mt-1">Date: {today}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-300">
            {CONTRACT_FOOTER}
          </div>
        </div>

        {/* Signature Pad */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="text-sm font-semibold text-gray-700 mb-2">Client Signature</div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="border border-gray-300 rounded bg-white cursor-crosshair w-full max-w-[300px]"
                style={{ touchAction: 'none' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <div className="text-xs text-gray-400 mt-1">Draw your signature above</div>
            </div>
            <Button variant="secondary" size="sm" onClick={clearCanvas}>
              Clear
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            icon={Download}
            onClick={handleDownloadAndConvert}
            disabled={!hasSignature || generating}
          >
            {generating ? 'Generating...' : 'Download & Convert'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/quotes/ContractGenerator.tsx
git commit -m "feat: add ContractGenerator component with signature pad and PDF export"
```

---

### Task 4: Integrate ContractGenerator into QuoteDetailPage

**Files:**
- Modify: `src/pages/QuoteDetailPage.tsx`

**Interfaces:**
- Consumes: `ContractGenerator` component
- Produces: Updated QuoteDetailPage with contract flow

- [ ] **Step 1: Add imports and state**

Open `src/pages/QuoteDetailPage.tsx`.

Add import (after the QuoteVersionCompare import):

```typescript
import { ContractGenerator } from '../components/quotes/ContractGenerator';
```

Add state variable (after `showPdfPreview`):

```typescript
const [showContractGenerator, setShowContractGenerator] = useState(false);
```

- [ ] **Step 2: Add contract conversion handler**

Add this function after `handleConvertToClient`:

```typescript
const handleContractConvert = (contractPdf: string, contractSignature: string) => {
  const now = new Date().toISOString();
  const clientId = generateId();
  const newClient = {
    id: clientId,
    name: quote.prospectName,
    address: quote.prospectAddress,
    city: quote.prospectCity,
    province: quote.prospectProvince,
    postalCode: quote.prospectPostalCode,
    contactName: quote.prospectName,
    contactPhone: quote.prospectPhone,
    contractRate: quote.totalMonthly,
    frequency: 'weekly' as CleaningFrequency,
    cleaningDays: ['monday' as const, 'tuesday' as const, 'wednesday' as const, 'thursday' as const, 'friday' as const],
    status: 'active' as const,
    notes: `Converted from Quote #${quote.id.slice(-6).toUpperCase()}`,
    contractPdf,
    contractSignature,
    createdAt: now,
  };
  dispatch({ type: 'ADD_CLIENT', payload: newClient });

  const siteId = generateId();
  const newSite = {
    id: siteId,
    name: quote.prospectName,
    address: quote.prospectAddress,
    city: quote.prospectCity,
    province: quote.prospectProvince,
    postalCode: quote.prospectPostalCode,
    areaTags: [],
    type: 'other' as const,
    contactName: quote.prospectName,
    contactPhone: quote.prospectPhone,
    contractRate: quote.totalMonthly,
    frequency: 'weekly' as CleaningFrequency,
    cleaningDays: ['monday' as const, 'tuesday' as const, 'wednesday' as const, 'thursday' as const, 'friday' as const],
    scheduleStart: '17:00',
    scheduleEnd: '19:00',
    assignedUserIds: [],
    accessNotes: '',
    status: 'active' as const,
    checklist: [],
    clientId,
    isSubSite: false,
    createdAt: now,
  };
  dispatch({ type: 'ADD_SITE', payload: newSite });

  const version = createVersion(quote, currentUser.id, 'Converted to client with contract');
  const updatedQuote = addVersionToQuote(quote, version);
  dispatch({
    type: 'UPDATE_QUOTE',
    payload: { ...updatedQuote, status: 'accepted', updatedAt: now },
  });

  setShowContractGenerator(false);
  toast.success(`Contract signed and "${quote.prospectName}" converted to client + site`);
  navigate(`/sites/${siteId}`);
};
```

- [ ] **Step 3: Replace button in JSX**

Find the "Convert to Client" button section (around line 344-351):

```tsx
          {/* Convert to Client */}
          {isOwnerOrPartner && (quote.status === 'accepted') && (
            <div className="no-print border-t border-gray-200 pt-4 mt-6">
              <Button icon={Building2} onClick={() => setShowConvertConfirm(true)}>
                Convert to Client & Site
              </Button>
              <p className="text-xs text-gray-400 mt-1">Creates a client record and site from this accepted quote</p>
            </div>
          )}
```

Replace with:

```tsx
          {/* Generate Contract */}
          {isOwnerOrPartner && (quote.status === 'accepted') && (
            <div className="no-print border-t border-gray-200 pt-4 mt-6">
              <Button icon={FileText} onClick={() => setShowContractGenerator(true)}>
                Generate Contract
              </Button>
              <p className="text-xs text-gray-400 mt-1">Generate a service agreement, capture signature, and convert to client</p>
            </div>
          )}
```

- [ ] **Step 4: Add ContractGenerator modal**

Find the Convert to Client ConfirmModal (around line 438-447):

```tsx
      {/* Convert to Client Confirm */}
      <ConfirmModal
        isOpen={showConvertConfirm}
        onClose={() => setShowConvertConfirm(false)}
        onConfirm={handleConvertToClient}
        title={`Convert "${quote.prospectName}" to Client?`}
        message="This will create a new client record and site, and mark this quote as accepted."
        confirmLabel="Convert to Client"
        variant="warning"
      />
```

Add after it:

```tsx
      {/* Contract Generator */}
      <ContractGenerator
        isOpen={showContractGenerator}
        onClose={() => setShowContractGenerator(false)}
        quote={quote}
        onConvert={handleContractConvert}
      />
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/pages/QuoteDetailPage.tsx
git commit -m "feat: integrate ContractGenerator into QuoteDetailPage"
```

---

### Task 5: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Manual test checklist**

Verify the following in browser:
- [ ] "Generate Contract" button appears on accepted quotes
- [ ] Modal opens with contract preview
- [ ] Contract shows all line items with correct rates
- [ ] Contract terms are displayed
- [ ] Signature pad works with mouse
- [ ] Signature renders in contract preview as drawn
- [ ] Clear button resets signature
- [ ] "Download & Convert" disabled without signature
- [ ] PDF downloads with correct filename
- [ ] Client record created with contractPdf field
- [ ] Site record created
- [ ] Quote marked as accepted
- [ ] Navigation to site page works

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: contract generator fixes from testing"
```
