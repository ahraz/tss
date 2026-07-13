# Shareable Contract Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shareable contract link feature so admins can send a unique URL to clients, who can view the contract, sign it, and submit — auto-creating client + site records.

**Architecture:** New `sharedContracts` Firestore collection stores contract snapshots with shareable tokens. A public React route (`/#/share/:token`) allows unauthenticated clients to view/sign. Dashboard notification badge alerts admins when contracts are signed.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, HashRouter, react-hot-toast, html2canvas + jsPDF

## Global Constraints

- React 19 + TypeScript + Vite
- Firebase Firestore (no Firebase Functions)
- HashRouter (all routes use `/#/path`)
- Anonymous Firebase Auth for client access
- 7-day link expiry
- No external dependencies beyond what's already installed

---

## File Structure

| File | Purpose |
|------|---------|
| `src/types/sharedContract.ts` | SharedContract interface + ID generator |
| `src/pages/ShareContractPage.tsx` | Public contract viewing/signing page |
| `src/components/notifications/ContractNotificationBadge.tsx` | Dashboard notification badge |
| `src/App.tsx` | Add public route `/#/share/:token` |
| `src/types/index.ts` | Export SharedContract |
| `src/context/AppContext.tsx` | Add sharedContracts to state + reducer |
| `src/lib/firebaseSync.ts` | Add sharedContracts to Firestore sync |
| `src/components/quotes/ContractGenerator.tsx` | Add "Generate Link" section |
| `src/pages/DashboardPage.tsx` | Add notification badge |
| `firestore.rules` | Add sharedContracts rules |

---

## Task 1: SharedContract Type + Firestore Rules

**Files:**
- Create: `src/types/sharedContract.ts`
- Modify: `src/types/index.ts:1-20` (add export)
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: None (first task)
- Produces: `SharedContract` type, `generateShareToken()` function

- [ ] **Step 1: Create SharedContract type**

```typescript
// src/types/sharedContract.ts
import type { QuoteLineItem } from './index';

export interface SharedContract {
  id: string;
  quoteId: string;
  quoteData: {
    prospectName: string;
    prospectAddress: string;
    prospectCity: string;
    prospectProvince: string;
    prospectPostalCode: string;
    prospectPhone: string;
    lineItems: QuoteLineItem[];
    totalMonthly: number;
  };
  contractNumber: string;
  status: 'pending' | 'signed';
  clientSignature?: string;
  signedAt?: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
}

export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 20; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
```

- [ ] **Step 2: Add export to types/index.ts**

Add at the end of `src/types/index.ts`:
```typescript
export type { SharedContract } from './sharedContract';
export { generateShareToken } from './sharedContract';
```

- [ ] **Step 3: Update Firestore rules**

Add before the closing `}` in `firestore.rules`:
```
match /sharedContracts/{docId} {
  allow read: if true;
  allow update: if true;
  allow create: if request.auth != null;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/types/sharedContract.ts src/types/index.ts firestore.rules
git commit -m "feat: add SharedContract type and Firestore rules"
```

---

## Task 2: Add sharedContracts to State + Sync

**Files:**
- Modify: `src/context/AppContext.tsx` (add state + reducer)
- Modify: `src/lib/firebaseSync.ts` (add to fetch + subscribe)

**Interfaces:**
- Consumes: `SharedContract` type from Task 1
- Produces: `state.sharedContracts` array, `SET_SHARED_CONTRACTS` / `UPDATE_SHARED_CONTRACTS` actions

- [ ] **Step 1: Add sharedContracts to AppState**

In `src/context/AppContext.tsx`, add to `AppState` type (or initial state):
```typescript
// In initialState object, add:
sharedContracts: [],
```

- [ ] **Step 2: Add reducer cases**

In `appReducer`, add after the existing cases:
```typescript
// Shared Contracts
case 'SET_SHARED_CONTRACTS':
  return { ...state, sharedContracts: action.payload };
case 'ADD_SHARED_CONTRACT':
  return { ...state, sharedContracts: [...state.sharedContracts, action.payload] };
case 'UPDATE_SHARED_CONTRACT':
  return { ...state, sharedContracts: state.sharedContracts.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
```

- [ ] **Step 3: Add to firebaseSync fetchAllCollectionsOnce**

In `src/lib/firebaseSync.ts`, add `sharedContractsSnap` to the Promise.all array and process it:
```typescript
// In the Promise.all array, add:
getDocs(collection(db, 'sharedContracts')),

// After processing other collections, add:
const sharedContracts = sharedContractsSnap.docs.map(d => docToObj<SharedContract>(d));

// Add to the return object:
return { ..., sharedContracts };
```

- [ ] **Step 4: Add to subscribeToCollections**

In `subscribeToCollections`, add a new onSnapshot:
```typescript
const unsubSharedContracts = onSnapshot(
  collection(db, 'sharedContracts'),
  (snapshot) => {
    const list: SharedContract[] = [];
    snapshot.forEach(doc => list.push(docToObj<SharedContract>(doc)));
    dispatch({ type: 'SET_SHARED_CONTRACTS', payload: list });
  },
  (err) => onError?.('sharedContracts', err)
);
```

Add `unsubSharedContracts` to the cleanup array.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/context/AppContext.tsx src/lib/firebaseSync.ts
git commit -m "feat: add sharedContracts to app state and Firestore sync"
```

---

## Task 3: ContractGenerator — Generate Link Button

**Files:**
- Modify: `src/components/quotes/ContractGenerator.tsx`

**Interfaces:**
- Consumes: `SharedContract`, `generateShareToken` from Task 1
- Produces: Link generation logic, copy-to-clipboard

- [ ] **Step 1: Add imports and state**

At the top of `ContractGenerator.tsx`, add:
```typescript
import { Link2, Copy, Check } from 'lucide-react';
import { generateShareToken } from '../../types/sharedContract';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
```

Add state inside the component:
```typescript
const [shareLink, setShareLink] = useState<string | null>(null);
const [generatingLink, setGeneratingLink] = useState(false);
const [copied, setCopied] = useState(false);
```

- [ ] **Step 2: Add handleGenerateLink function**

```typescript
const handleGenerateLink = async () => {
  if (!quote) return;
  setGeneratingLink(true);
  try {
    const token = generateShareToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const sharedContract = {
      id: token,
      quoteId: quote.id,
      quoteData: {
        prospectName: quote.prospectName,
        prospectAddress: quote.prospectAddress,
        prospectCity: quote.prospectCity,
        prospectProvince: quote.prospectProvince,
        prospectPostalCode: quote.prospectPostalCode,
        prospectPhone: quote.prospectPhone,
        lineItems: quote.lineItems,
        totalMonthly: quote.totalMonthly,
      },
      contractNumber: `CONTRACT-${quote.id.slice(-6).toUpperCase()}`,
      status: 'pending' as const,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      createdBy: '', // Will be set by the caller if needed
    };

    await setDoc(doc(db, 'sharedContracts', token), sharedContract);

    const url = `${window.location.origin}/#/share/${token}`;
    setShareLink(url);
    toast.success('Contract link generated');
  } catch (err) {
    console.error('Failed to generate link:', err);
    toast.error('Failed to generate link. Please try again.');
  } finally {
    setGeneratingLink(false);
  }
};
```

- [ ] **Step 3: Add handleCopyLink function**

```typescript
const handleCopyLink = async () => {
  if (!shareLink) return;
  try {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  } catch {
    toast.error('Failed to copy link');
  }
};
```

- [ ] **Step 4: Add share link section to JSX**

Before the existing `<div className="flex justify-end gap-3 pt-4 border-t border-gray-100">`, add:
```typescript
{/* Share with Client */}
<div className="border rounded-lg p-4 bg-blue-50">
  <div className="flex items-center gap-2 mb-2">
    <Link2 size={16} className="text-blue-600" />
    <span className="text-sm font-semibold text-blue-800">Share with Client</span>
  </div>
  {shareLink ? (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={shareLink}
        readOnly
        className="flex-1 text-sm bg-white border border-blue-200 rounded px-3 py-2 text-gray-700"
      />
      <Button size="sm" onClick={handleCopyLink} variant="secondary">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  ) : (
    <Button
      size="sm"
      onClick={handleGenerateLink}
      disabled={generatingLink}
      variant="secondary"
    >
      {generatingLink ? 'Generating...' : 'Generate Link'}
    </Button>
  )}
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/quotes/ContractGenerator.tsx
git commit -m "feat: add generate link button to ContractGenerator"
```

---

## Task 4: ShareContractPage — Public Contract View

**Files:**
- Create: `src/pages/ShareContractPage.tsx`

**Interfaces:**
- Consumes: `SharedContract` type, `CONTRACT_TERMS`/`CONTRACT_FOOTER` from utils, html2canvas+jsPDF for PDF download
- Produces: Full public contract viewing/signing page

- [ ] **Step 1: Create ShareContractPage skeleton**

```typescript
// src/pages/ShareContractPage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Logo } from '../assets/Logo';
import { Button } from '../components/ui/Button';
import { formatCAD } from '../utils/formatters';
import { CONTRACT_TERMS, CONTRACT_FOOTER } from '../utils/contract-terms';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { SharedContract } from '../types/sharedContract';

type PageState = 'loading' | 'expired' | 'signed' | 'ready' | 'thankyou' | 'notfound';

export function ShareContractPage() {
  const { token } = useParams<{ token: string }>();
  const contractRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [pageState, setPageState] = useState<PageState>('loading');
  const [contract, setContract] = useState<SharedContract | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ... (loading and rendering logic in next steps)
}
```

- [ ] **Step 2: Add contract loading logic**

```typescript
useEffect(() => {
  if (!token) {
    setPageState('notfound');
    return;
  }

  const loadContract = async () => {
    try {
      const docRef = doc(db, 'sharedContracts', token);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setPageState('notfound');
        return;
      }

      const data = { id: docSnap.id, ...docSnap.data() } as SharedContract;
      
      if (new Date(data.expiresAt) < new Date()) {
        setPageState('expired');
        return;
      }

      if (data.status === 'signed') {
        setContract(data);
        setPageState('signed');
        return;
      }

      setContract(data);
      setPageState('ready');
    } catch (err) {
      console.error('Failed to load contract:', err);
      setPageState('notfound');
    }
  };

  loadContract();
}, [token]);
```

- [ ] **Step 3: Add signature pad handlers**

复制 `ContractGenerator.tsx` 中的签名 pad 逻辑（`getPos`, `startDraw`, `draw`, `stopDraw`, `clearCanvas`）到 `ShareContractPage.tsx`。

- [ ] **Step 4: Add handleSignAndSubmit function**

```typescript
const handleSignAndSubmit = async () => {
  if (!contract || !signatureDataUrl || !token) return;
  setSubmitting(true);
  try {
    // Update shared contract
    const docRef = doc(db, 'sharedContracts', token);
    await updateDoc(docRef, {
      status: 'signed',
      clientSignature: signatureDataUrl,
      signedAt: new Date().toISOString(),
    });

    setPageState('thankyou');
    toast.success('Contract signed successfully!');
  } catch (err) {
    console.error('Failed to sign contract:', err);
    toast.error('Failed to submit. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 5: Add PDF download function**

```typescript
const handleDownloadPdf = async () => {
  if (!contractRef.current) return;
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

    const fileName = `Contract-${contract?.quoteData.prospectName.replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
  } catch (err) {
    console.error('PDF generation failed:', err);
    toast.error('Failed to generate PDF');
  }
};
```

- [ ] **Step 6: Add renderContractHtml function**

复制 `ContractGenerator.tsx` 中的合同 HTML 渲染逻辑到一个新的 `renderContractHtml()` 函数，但使用 `contract.quoteData` 而不是 `quote`。

- [ ] **Step 7: Add page state rendering**

```typescript
if (pageState === 'loading') {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

if (pageState === 'notfound') {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Not Found</h1>
        <p className="text-gray-500">This contract link is invalid.</p>
      </div>
    </div>
  );
}

if (pageState === 'expired') {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
        <p className="text-gray-500">This contract link has expired. Please contact GTA Scrub for a new link.</p>
      </div>
    </div>
  );
}

if (pageState === 'signed') {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Already Signed</h1>
        <p className="text-gray-500 mb-4">This contract has already been signed.</p>
        <Button onClick={handleDownloadPdf}>Download Copy</Button>
      </div>
    </div>
  );
}

if (pageState === 'thankyou') {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
        <p className="text-gray-500 mb-4">Your contract has been signed successfully.</p>
        <Button onClick={handleDownloadPdf}>Download a Copy</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Add main contract view (ready state)**

在 `pageState === 'ready'` 时渲染完整的合同视图，包括：
- 合同 HTML（从 `renderContractHtml()`）
- 签名画布
- "Submit" 按钮

- [ ] **Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/pages/ShareContractPage.tsx
git commit -m "feat: add ShareContractPage for public contract signing"
```

---

## Task 5: Add Public Route to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `ShareContractPage` from Task 4
- Produces: Public route `/#/share/:token`

- [ ] **Step 1: Add lazy import for ShareContractPage**

```typescript
const ShareContractPage = lazy(() =>
  import('./pages/ShareContractPage').then((m) => ({ default: m.ShareContractPage }))
);
```

- [ ] **Step 2: Add public route**

在 `<Route path="/login" ...>` 之后添加：
```typescript
<Route path="/share/:token" element={
  <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Loading contract...</div>}>
    <ShareContractPage />
  </Suspense>
} />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add public route for shareable contract links"
```

---

## Task 6: Dashboard Notification Badge

**Files:**
- Create: `src/components/notifications/ContractNotificationBadge.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `state.sharedContracts` from AppContext
- Produces: Notification badge + panel UI

- [ ] **Step 1: Create ContractNotificationBadge component**

```typescript
// src/components/notifications/ContractNotificationBadge.tsx
import { useState } from 'react';
import { Bell, CheckCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';

export function ContractNotificationBadge() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const signedContracts = state.sharedContracts.filter(
    c => c.status === 'signed' && !c.notificationDismissedAt
  );

  const handleDismiss = (id: string) => {
    dispatch({
      type: 'UPDATE_SHARED_CONTRACT',
      payload: { id, notificationDismissedAt: new Date().toISOString() }
    });
  };

  const handleDismissAll = () => {
    signedContracts.forEach(c => handleDismiss(c.id));
  };

  if (signedContracts.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
      >
        <Bell size={20} />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {signedContracts.length}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Signed Contracts</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {signedContracts.map(c => (
                <div
                  key={c.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  onClick={() => {
                    navigate(`/quotes/${c.quoteId}`);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{c.quoteData.prospectName}</p>
                      <p className="text-xs text-gray-500">
                        {c.signedAt && format(new Date(c.signedAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {signedContracts.length > 1 && (
              <div className="p-2 border-t">
                <button
                  onClick={handleDismissAll}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
                >
                  Dismiss All
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add UPDATE_SHARED_CONTRACT reducer case**

In `src/context/AppContext.tsx`, ensure the reducer has:
```typescript
case 'UPDATE_SHARED_CONTRACT':
  return { ...state, sharedContracts: state.sharedContracts.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
```

- [ ] **Step 3: Add SharedContract to AppAction type**

In `src/types/index.ts`, add `SharedContract` to the `AppAction` union type:
```typescript
| { type: 'SET_SHARED_CONTRACTS'; payload: SharedContract[] }
| { type: 'ADD_SHARED_CONTRACT'; payload: SharedContract }
| { type: 'UPDATE_SHARED_CONTRACT'; payload: Partial<SharedContract> & { id: string } }
```

- [ ] **Step 4: Add notificationDismissedAt to SharedContract type**

In `src/types/sharedContract.ts`, add:
```typescript
notificationDismissedAt?: string;
```

- [ ] **Step 5: Integrate into DashboardPage**

In `src/pages/DashboardPage.tsx`, add at the top (after imports):
```typescript
import { ContractNotificationBadge } from '../components/notifications/ContractNotificationBadge';
```

In the `renderOwnerDashboard()` function, add at the top:
```typescript
<ContractNotificationBadge />
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/notifications/ContractNotificationBadge.tsx src/pages/DashboardPage.tsx src/types/index.ts src/types/sharedContract.ts
git commit -m "feat: add dashboard notification badge for signed contracts"
```

---

## Task 7: Final Integration Testing

**Files:** None (verification only)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified working feature

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Manual testing checklist**

- [ ] Admin: Open accepted quote, click "Generate Contract"
- [ ] Admin: Click "Generate Link", verify link is created
- [ ] Admin: Click "Copy", verify link is copied to clipboard
- [ ] Admin: Open link in incognito → contract renders correctly
- [ ] Admin: Draw signature on shared contract, click "Submit"
- [ ] Admin: Verify client + site records are auto-created
- [ ] Admin: Verify quote status updates to 'accepted'
- [ ] Admin: Verify dashboard shows notification badge
- [ ] Admin: Click badge, verify panel shows signed contract
- [ ] Client: Open expired link → shows "Link Expired" message
- [ ] Client: Open already-signed link → shows "Already Signed" with download
- [ ] Client: Open invalid token → shows "Contract Not Found"

- [ ] **Step 4: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: integration testing fixes for shareable contract links"
```
