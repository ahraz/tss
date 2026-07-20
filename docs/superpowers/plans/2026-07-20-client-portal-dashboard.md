# Client Portal Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, shareable client portal page at `/portal/:token` that displays a cleaning client's account in a single-page dashboard hub with CleanCheck reports, schedule, invoices, quote, and profile cards.

**Architecture:** A new public route `/portal/:token` serves a self-contained page that fetches data from Firestore via a share token on the Site document. Six sub-components render inline cards; the CleanCheck report expands below its card. No login required. Demo mode (`?demo=true`) fills in sample data for sales pitches.

**Tech Stack:** React 18, TypeScript, Firebase Firestore (existing), Tailwind CSS, IndexedDB photoStore, date-fns (existing)

## Global Constraints

- Share token generated on contract acceptance (no new UI — reuse existing contract-to-close flow)
- All existing types/interfaces remain unchanged except adding `shareToken` field to `Site`
- Photos load from IndexedDB via existing `getPhoto()` — never inline photo data in Firestore queries
- All colors use emerald-600/700 for GTA Scrub branding (consistent with SharedQuotePage)
- Demo mode populates all cards with mock data — never writes demo data to Firestore

---

### Task 1: Type & Route Setup

**Files:**
- Modify: `src/types/index.ts:225`
- Modify: `src/App.tsx:26,92`

**Interfaces:**
- Produces: `Site.shareToken?: string` — optional string field on Site interface
- Produces: Route `/portal/:token` rendering `ClientPortalPage`

- [ ] **Step 1: Add shareToken to Site type**

Add to `/home/ahrazmalik/Documents/New OpenCode Project/src/types/index.ts` at line 225 (before `createdAt`):

Old:
```
  isSubSite: boolean;
  createdAt: string;
```
New:
```
  isSubSite: boolean;
  shareToken?: string;
  createdAt: string;
```

- [ ] **Step 2: Add route + import in App.tsx**

Add import after line 26 (`import { SharedQuotePage }...`):
```
import { ClientPortal } from './pages/ClientPortal';
```

Add route after line 92 (`<Route path="/quote/:token"...`):
```
<Route path="/portal/:token" element={<ClientPortal />} />
```

- [ ] **Step 3: Commit**

```
git add src/types/index.ts src/App.tsx
git commit -m "feat: add shareToken to Site type and /portal/:token route"
```

---

### Task 2: ClientPortal Page Shell + Data Fetching Hook

**Files:**
- Create: `src/pages/ClientPortal.tsx`
- Create: `src/hooks/useClientPortal.ts`

**Interfaces:**
- Consumes: `Site.shareToken`, Firestore collections (sites, inspections, shifts, payments, sharedContracts, inspectionTemplates)
- Produces: `useClientPortal(token)` returns `{ site, client, inspections, shifts, payments, quote, templates: InspectionItem[], loading, error }`
- Produces: `ClientPortal` page component with loading/error/not-found states

- [ ] **Step 1: Create `useClientPortal` hook**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/hooks/useClientPortal.ts`:

```
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Site, Inspection, InspectionItem, Shift, Payment, Quote } from '../types';

interface PortalData {
  site: Site | null;
  client: any | null;
  inspections: Inspection[];
  templates: InspectionItem[];
  shifts: Shift[];
  payments: Payment[];
  quote: Quote | null;
  loading: boolean;
  error: string | null;
}

export function useClientPortal(token: string | undefined): PortalData {
  const [data, setData] = useState<PortalData>({
    site: null, client: null, inspections: [], templates: [],
    shifts: [], payments: [], quote: null,
    loading: true, error: null,
  });

  useEffect(() => {
    if (!token) {
      setData(prev => ({ ...prev, loading: false, error: 'Invalid link' }));
      return;
    }

    async function load() {
      try {
        // 1. Find site by shareToken
        const sitesSnap = await getDocs(query(collection(db, 'sites'), where('shareToken', '==', token)));
        if (sitesSnap.empty) {
          setData(prev => ({ ...prev, loading: false, error: 'Portal not found. The link may have expired.' }));
          return;
        }
        const site = { id: sitesSnap.docs[0].id, ...sitesSnap.docs[0].data() } as Site;

        // 2. Load client if clientId exists
        let client = null;
        if (site.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', site.clientId));
          if (clientSnap.exists()) client = { id: clientSnap.id, ...clientSnap.data() };
        }

        // 3. Load all inspection templates (for label/category lookup)
        const templSnap = await getDocs(collection(db, 'inspectionTemplates'));
        const templates = templSnap.docs.map(d => ({ id: d.id, ...d.data() } as InspectionItem));

        // 4. Load inspections
        const inspSnap = await getDocs(query(
          collection(db, 'inspections'),
          where('siteId', '==', site.id),
          orderBy('performedAt', 'desc'),
          limit(10)
        ));
        const inspections = inspSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection));

        // 5. Load shifts
        const shiftSnap = await getDocs(query(
          collection(db, 'shifts'),
          where('siteId', '==', site.id),
          orderBy('clockInTime', 'desc'),
          limit(10)
        ));
        const shifts = shiftSnap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));

        // 6. Load payments
        const paySnap = await getDocs(query(
          collection(db, 'payments'),
          where('siteId', '==', site.id),
          orderBy('createdAt', 'desc'),
          limit(10)
        ));
        const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

        // 7. Load quote from sharedContracts
        const contractSnap = await getDoc(doc(db, 'sharedContracts', token));
        const quote = contractSnap.exists()
          ? { id: contractSnap.id, ...contractSnap.data() } as Quote
          : null;

        setData({ site, client, inspections, templates, shifts, payments, quote, loading: false, error: null });
      } catch (err) {
        setData(prev => ({ ...prev, loading: false, error: 'Failed to load portal data.' }));
      }
    }

    load();
  }, [token]);

  return data;
}
```

- [ ] **Step 2: Create ClientPortal page shell**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/pages/ClientPortal.tsx`:

```
import { useParams } from 'react-router-dom';
import { useClientPortal } from '../hooks/useClientPortal';
import { Building2 } from 'lucide-react';

export function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const { site, client, inspections, templates, shifts, payments, quote, loading, error } = useClientPortal(token);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Portal Unavailable</h2>
          <p className="text-sm text-gray-500">Invalid link</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Portal Unavailable</h2>
          <p className="text-sm text-gray-500">{error || 'Portal not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Cards rendered here — populated in Tasks 3-5 */}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```
git add src/pages/ClientPortal.tsx src/hooks/useClientPortal.ts
git commit -m "feat: add ClientPortal page shell and useClientPortal hook"
```

---

### Task 3: PortalHeader + CleanCheckCard + CleanCheckReportView

**Files:**
- Create: `src/components/portal/PortalHeader.tsx`
- Create: `src/components/portal/CleanCheckCard.tsx`
- Create: `src/components/portal/CleanCheckReportView.tsx`
- Modify: `src/pages/ClientPortal.tsx` (add header + CleanCheck card to the return block)

**Interfaces:**
- Consumes: `{ site, client, inspections }` from useClientPortal
- Consumes: `getPhoto(key: string)` from `../../utils/photoStore`
- Produces: `PortalHeader` — logo, site name, score badge
- Produces: `CleanCheckCard` — score summary, expandable
- Produces: `CleanCheckReportView` — items grouped by category with ratings, notes, photos, sign-off

- [ ] **Step 1: Create PortalHeader**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/components/portal/PortalHeader.tsx`:

```
import { Star, Shield } from 'lucide-react';
import type { Site, Inspection } from '../../types';

interface Props {
  site: Site;
  latestInspection: Inspection | null;
}

function getScore(inspection: Inspection | null): { pct: number; label: string; color: string } {
  if (!inspection) return { pct: 0, label: 'N/A', color: 'text-gray-400 bg-gray-100' };
  const pass = inspection.items.filter(i => i.rating === 'pass').length;
  const pct = Math.round((pass / inspection.items.length) * 100);
  if (pct >= 90) return { pct, label: `${pct}%`, color: 'text-emerald-700 bg-emerald-100' };
  if (pct >= 70) return { pct, label: `${pct}%`, color: 'text-amber-700 bg-amber-100' };
  return { pct, label: `${pct}%`, color: 'text-red-700 bg-red-100' };
}

export function PortalHeader({ site, latestInspection }: Props) {
  const score = getScore(latestInspection);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          GTA<span className="text-emerald-600">Scrub</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{site.name}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${score.color}`}>
          {score.label}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create CleanCheckCard**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/components/portal/CleanCheckCard.tsx`:

```
import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatDate } from '../../utils/formatters';
import { CleanCheckReportView } from './CleanCheckReportView';
import type { Inspection, InspectionItem } from '../../types';

interface Props {
  inspections: Inspection[];
  templates: InspectionItem[];
}

export function CleanCheckCard({ inspections, templates }: Props) {
  const [expanded, setExpanded] = useState(false);
  const latest = inspections[0] || null;

  const passCount = latest ? latest.items.filter(i => i.rating === 'pass').length : 0;
  const failCount = latest ? latest.items.filter(i => i.rating === 'fail').length : 0;
  const needsCount = latest ? latest.items.filter(i => i.rating === 'pass_needs').length : 0;
  const total = latest ? latest.items.length : 0;
  const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;

  const inspector = null; // Portal doesn't show inspector name yet

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">CleanCheck</h2>
          </div>

          {!latest ? (
            <p className="text-sm text-gray-400">No inspection yet — first one coming soon.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-4 mb-3">
                <span className={`text-3xl font-bold ${
                  pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {pct}%
                </span>
                <div className="flex gap-3 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={14} /> {passCount}
                  </span>
                  {needsCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle size={14} /> {needsCount}
                    </span>
                  )}
                  {failCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle size={14} /> {failCount}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Inspector: {inspector?.name || 'Unknown'} · {formatDate(latest.performedAt)}
              </p>
            </>
          )}
        </div>

        {latest && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            {expanded ? 'Close' : 'View Report'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && latest && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <CleanCheckReportView inspection={latest} templates={templates} />
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Create CleanCheckReportView**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/components/portal/CleanCheckReportView.tsx`:

```
import { useEffect, useState, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { getPhoto } from '../../utils/photoStore';
import type { Inspection, InspectionItem } from '../../types';

interface Props {
  inspection: Inspection;
  templates: InspectionItem[];
}

export function CleanCheckReportView({ inspection, templates }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const results = await Promise.all(
        (inspection.photoIds || []).map(id => getPhoto(id))
      );
      setPhotos(results.filter((p): p is string => p !== null));
    }
    load();
  }, [inspection.photoIds]);

  const itemsWithMeta = useMemo(() => {
    return inspection.items.map(result => {
      const tmpl = templates.find(t => t.id === result.itemId);
      return { ...result, label: tmpl?.label || 'Unknown', category: tmpl?.category || 'Other' };
    });
  }, [inspection.items, templates]);

  const grouped = new Map<string, typeof itemsWithMeta>();
  for (const item of itemsWithMeta) {
    const cat = item.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([category, items]) => (
        <div key={category}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{category}</p>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
              {item.rating === 'pass' ? (
                <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
              ) : item.rating === 'pass_needs' ? (
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 font-medium">{item.label}</p>
                  <span className={`text-xs font-medium ${
                    item.rating === 'pass' ? 'text-green-600' :
                    item.rating === 'pass_needs' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {item.rating === 'pass' ? 'Pass' : item.rating === 'pass_needs' ? 'Needs Work' : 'Fail'}
                  </span>
                </div>
                {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {inspection.notes && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Overall Notes</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{inspection.notes}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Photo Evidence ({photos.length})</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((photo, idx) => (
              <img key={idx} src={photo} alt="" className="rounded-lg object-cover w-full h-24 cursor-pointer" />
            ))}
          </div>
        </div>
      )}

      {inspection.clientSigned && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Signed off by {inspection.signedByName || 'client'}</span>
            <span className="text-xs text-gray-400">
              {inspection.clientSignedAt ? formatDate(inspection.clientSignedAt) : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire into ClientPortal page**

Replace the return block in `/home/ahrazmalik/Documents/New OpenCode Project/src/pages/ClientPortal.tsx` with:

```
import { PortalHeader } from '../components/portal/PortalHeader';
import { CleanCheckCard } from '../components/portal/CleanCheckCard';

// In the return block, replace the empty div:
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <PortalHeader site={site} latestInspection={inspections[0] || null} />
        <CleanCheckCard inspections={inspections} templates={templates} />
      </div>
    </div>
  );
```

- [ ] **Step 5: Commit**

```
git add src/components/portal/PortalHeader.tsx src/components/portal/CleanCheckCard.tsx src/components/portal/CleanCheckReportView.tsx src/pages/ClientPortal.tsx
git commit -m "feat: add PortalHeader, CleanCheckCard, and CleanCheckReportView"
```

---

### Task 4: Schedule, Invoices, Quote, and Profile Cards

**Files:**
- Create: `src/components/portal/ScheduleCard.tsx`
- Create: `src/components/portal/InvoicesCard.tsx`
- Create: `src/components/portal/QuoteCard.tsx`
- Create: `src/components/portal/ProfileCard.tsx`
- Modify: `src/pages/ClientPortal.tsx` (add remaining cards)

**Interfaces:**
- Consumes: `{ site, shifts, payments, quote, client }` from useClientPortal

- [ ] **Step 1: Create ScheduleCard**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/components/portal/ScheduleCard.tsx`:

```
import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatDate } from '../../utils/formatters';
import type { Shift, Site } from '../../types';

interface Props {
  site: Site;
  shifts: Shift[];
}

export function ScheduleCard({ site, shifts }: Props) {
  const [expanded, setExpanded] = useState(false);
  const nextShifts = shifts.filter(s => s.status === 'active');
  const nextShift = nextShifts[0] || null;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cleaning Schedule</h2>
          </div>

          {!nextShift ? (
            <p className="text-sm text-gray-400">No upcoming visits scheduled.</p>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                Next visit: <span className="font-medium">{nextShift.clockInTime ? formatDate(nextShift.clockInTime) : 'Scheduled'}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Frequency: {site.frequency} · {site.cleaningDays.map(d => d.charAt(0).toUpperCase() + d.slice(1,3)).join(', ')}
              </p>
            </>
          )}
        </div>

        {shifts.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            {expanded ? 'Close' : 'View Schedule'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {shifts.slice(0, 10).map(shift => (
            <div key={shift.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-600">{formatDate(shift.clockInTime)}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                shift.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {shift.status === 'completed' ? 'Completed' : 'Upcoming'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Create InvoicesCard**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/components/portal/InvoicesCard.tsx`:

```
import { useState } from 'react';
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCAD, formatDate } from '../../utils/formatters';
import type { Payment } from '../../types';

interface Props {
  payments: Payment[];
}

export function InvoicesCard({ payments }: Props) {
  const [expanded, setExpanded] = useState(false);
  const unpaid = payments.filter(p => !p.isPaid);
  const balance = unpaid.reduce((sum, p) => sum + p.amount, 0);
  const lastPaid = payments.filter(p => p.isPaid).sort((a, b) =>
    new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  )[0] || null;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Invoices & Payments</h2>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm text-gray-500">Balance:</span>
            <span className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCAD(balance)}
            </span>
          </div>

          {lastPaid && (
            <p className="text-xs text-gray-400">
              Last payment: {formatCAD(lastPaid.amount)} on {formatDate(lastPaid.paidAt || lastPaid.createdAt)}
            </p>
          )}
        </div>

        {payments.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            {expanded ? 'Close' : 'View Invoices'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {payments.slice(0, 10).map(payment => (
            <div key={payment.id} className="flex items-center justify-between py-1.5 text-sm">
              <div>
                <span className="text-gray-700">{formatCAD(payment.amount)}</span>
                <span className="text-gray-400 ml-2 text-xs">{formatDate(payment.createdAt)}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                payment.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {payment.isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Create QuoteCard**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/components/portal/QuoteCard.tsx`:

```
import { FileText, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCAD } from '../../utils/formatters';
import type { Quote } from '../../types';

interface Props {
  quote: Quote | null;
}

export function QuoteCard({ quote }: Props) {
  if (!quote) return null;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Your Cleaning Plan</h2>
          </div>

          <div className="space-y-1 mb-3">
            {(quote.lineItems || []).slice(0, 3).map((item, i) => (
              <p key={i} className="text-sm text-gray-600">
                {item.description}
                {item.visitsPerWeek > 0 && (
                  <span className="text-gray-400 text-xs ml-1">· {item.visitsPerWeek}x/week</span>
                )}
              </p>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-600">{formatCAD(quote.totalMonthly)}/mo</span>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              {quote.status === 'accepted' ? (
                <><CheckCircle size={12} /> Accepted</>
              ) : (
                <><Clock size={12} /> Pending</>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create ProfileCard**

Create `/home/ahrazmalik/Documents/New OpenCode Project/src/components/portal/ProfileCard.tsx`:

```
import { Building2, MapPin, Phone, User } from 'lucide-react';
import { Card } from '../ui/Card';
import type { Site } from '../../types';

interface Props {
  site: Site;
  clientName?: string;
}

export function ProfileCard({ site, clientName }: Props) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={18} className="text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Business Profile</h2>
      </div>

      <div className="space-y-2 text-sm">
        <p className="font-medium text-gray-800">{site.name}</p>
        <p className="flex items-center gap-1.5 text-gray-500">
          <MapPin size={14} />
          {site.address}, {site.city}, {site.province} {site.postalCode}
        </p>
        {site.contactName && (
          <p className="flex items-center gap-1.5 text-gray-500">
            <User size={14} />
            {site.contactName}
          </p>
        )}
        {site.contactPhone && (
          <p className="flex items-center gap-1.5 text-gray-500">
            <Phone size={14} />
            {site.contactPhone}
          </p>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Wire all cards into ClientPortal**

Replace the return block in `src/pages/ClientPortal.tsx` with the complete page:

```
import { PortalHeader } from '../components/portal/PortalHeader';
import { CleanCheckCard } from '../components/portal/CleanCheckCard';
import { ScheduleCard } from '../components/portal/ScheduleCard';
import { InvoicesCard } from '../components/portal/InvoicesCard';
import { QuoteCard } from '../components/portal/QuoteCard';
import { ProfileCard } from '../components/portal/ProfileCard';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <PortalHeader site={site} latestInspection={inspections[0] || null} />
        <CleanCheckCard inspections={inspections} templates={templates} />
        <ScheduleCard site={site} shifts={shifts} />
        <InvoicesCard payments={payments} />
        <QuoteCard quote={quote} />
        <ProfileCard site={site} />
      </div>
    </div>
  );
```

- [ ] **Step 6: Commit**

```
git add src/components/portal/ScheduleCard.tsx src/components/portal/InvoicesCard.tsx src/components/portal/QuoteCard.tsx src/components/portal/ProfileCard.tsx src/pages/ClientPortal.tsx
git commit -m "feat: add Schedule, Invoices, Quote, and Profile cards to client portal"
```

---

### Task 5: Demo Mode (Sales Pitch Data)

**Files:**
- Modify: `src/hooks/useClientPortal.ts` (add demo data generation)
- Modify: `src/pages/ClientPortal.tsx` (pass demo param)

**Interfaces:**
- Consumes: `token` from URL params + `?demo=true` search param
- Produces: realistic mock data when `demo=true` and no real site found

- [ ] **Step 1: Add demo data generator to useClientPortal**

Replace the "not found" case in `useClientPortal.ts` (inside the `load` function, after `sitesSnap.empty` check) with a demo fallback:

```
// Inside load(), after sitesSnap.empty check:
if (sitesSnap.empty) {
  const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
  if (isDemo) {
    const demoData = generateDemoData(token);
    setData({ ...demoData, loading: false, error: null });
    return;
  }
  setData(prev => ({ ...prev, loading: false, error: 'Portal not found. The link may have expired.' }));
  return;
}
```

Then add the `generateDemoData` function at the bottom of the file (before the export):

```
function generateDemoData(token: string): PortalData {
  const demoItems: InspectionItem[] = [
    { id: 'demo-item-0', label: 'Floor Cleaning', category: 'Floors', order: 0 },
    { id: 'demo-item-1', label: 'Surface Sanitization', category: 'Washrooms', order: 1 },
    { id: 'demo-item-2', label: 'High Dusting', category: 'Dusting', order: 2 },
    { id: 'demo-item-3', label: 'Sink Area', category: 'Kitchen', order: 3 },
    { id: 'demo-item-4', label: 'Waste Removal', category: 'General', order: 4 },
    { id: 'demo-item-5', label: 'Glass Cleaning', category: 'Windows', order: 5 },
  ];

  const demoInspection: Inspection = {
    id: 'demo-insp-1',
    siteId: 'demo-site',
    templateId: 'demo-template',
    templateLabel: 'Standard Clean',
    performedById: 'demo-inspector',
    performedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    items: [
      { itemId: 'demo-item-0', rating: 'pass', notes: 'Floors swept and mopped, no residue' },
      { itemId: 'demo-item-1', rating: 'pass', notes: 'All surfaces sanitized' },
      { itemId: 'demo-item-2', rating: 'pass_needs', notes: 'Light dust on top shelves' },
      { itemId: 'demo-item-3', rating: 'fail', notes: 'Sink not fully dried' },
      { itemId: 'demo-item-4', rating: 'pass', notes: 'Garbage bins emptied' },
      { itemId: 'demo-item-5', rating: 'pass', notes: 'Glass surfaces streak-free' },
    ],
    notes: 'Great cleaning overall. Minor touch-up needed on high dusting.',
    photoIds: [],
    clientSigned: true,
    clientSignedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    signedByName: 'Dr. Sarah Johnson',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  };

  const site: Site = {
    id: 'demo-site',
    name: 'Demo Medical Clinic',
    address: '123 Main Street',
    city: 'Brampton',
    province: 'ON',
    postalCode: 'L6V 1A1',
    areaTags: ['brampton'],
    type: 'clinic',
    contactName: 'Dr. Sarah Johnson',
    contactPhone: '(905) 555-0123',
    contractRate: 450,
    frequency: 'weekly',
    cleaningDays: ['monday', 'thursday'],
    scheduleStart: '18:00',
    scheduleEnd: '20:00',
    assignedUserIds: [],
    accessNotes: 'Side door entrance, code #1234',
    status: 'active',
    checklist: [],
    clientId: null,
    isSubSite: false,
    shareToken: token,
    createdAt: new Date().toISOString(),
  };

  const inspections: Inspection[] = [demoInspection];
  ];

  const shifts: Shift[] = [
    {
      id: 'demo-shift-1',
      userId: 'demo-cleaner',
      siteId: 'demo-site',
      clockInTime: new Date(Date.now() + 86400000).toISOString(),
      clockInPhotoDataUrl: '',
      clockOutTime: null,
      clockOutPhotoDataUrl: null,
      durationMinutes: null,
      checklistCompletions: [],
      notes: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-shift-2',
      userId: 'demo-cleaner',
      siteId: 'demo-site',
      clockInTime: new Date(Date.now() - 86400000 * 4).toISOString(),
      clockInPhotoDataUrl: '',
      clockOutTime: new Date(Date.now() - 86400000 * 4 + 7200000).toISOString(),
      clockOutPhotoDataUrl: '',
      durationMinutes: 120,
      checklistCompletions: [],
      notes: '',
      status: 'completed',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ];

  const payments: Payment[] = [
    { id: 'demo-pay-1', siteId: 'demo-site', amount: 450, date: new Date(Date.now() - 86400000 * 5).toISOString(), method: 'etransfer', forPeriod: 'March 2026', isPaid: true, notes: 'Monthly payment', createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'demo-pay-2', siteId: 'demo-site', amount: 450, date: new Date(Date.now() - 86400000 * 2).toISOString(), method: 'etransfer', forPeriod: 'April 2026', isPaid: false, notes: 'Due Apr 1', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  ];

  const quote: Quote = {
    id: 'demo-quote',
    clientId: null,
    prospectName: 'Demo Medical Clinic',
    prospectAddress: '123 Main Street',
    prospectCity: 'Brampton',
    prospectProvince: 'ON',
    prospectPostalCode: 'L6V 1A1',
    prospectPhone: '(905) 555-0123',
    lineItems: [
      { description: 'Office Cleaning', visitsPerWeek: 3, amountPerVisit: 85, monthlyAmount: 255 },
      { description: 'Washroom Sanitization', visitsPerWeek: 5, amountPerVisit: 25, monthlyAmount: 125 },
      { description: 'Floor Care', visitsPerWeek: 1, amountPerVisit: 70, monthlyAmount: 70 },
    ],
    totalMonthly: 450,
    status: 'accepted',
    validUntil: '',
    notes: '',
    createdBy: '',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    shareToken: token,
    acceptedAt: new Date(Date.now() - 86400000 * 55).toISOString(),
  };

  return { site, client: null, inspections, templates: demoItems, shifts, payments, quote, loading: false, error: null };
}
```

Also add the import for `Shift` and `Quote` types if not already present at the top of the file:
```
import type { Site, Inspection, Shift, Payment, Quote } from '../types';
```

- [ ] **Step 2: Commit**

```
git add src/hooks/useClientPortal.ts
git commit -m "feat: add demo mode with sample data for sales pitches"
```

---

### Task 6: Final Integration & Route Fix

**Files:**
- Modify: `src/pages/ClientPortal.tsx` (clean up, ensure all cards render)
- Verify: `src/App.tsx` auto-logout exclusion for `/portal/` (line 56)

**Interfaces:**
- Consumes: all previous tasks
- Produces: working public route at `/portal/:token`

- [ ] **Step 1: Add `/portal/` to auto-logout exclusion in App.tsx**

In `/home/ahrazmalik/Documents/New OpenCode Project/src/App.tsx`, line 56, the `useEffect` checks `!location.pathname.startsWith('/login')`. The portal needs to be excluded too (it's public, no auth required).

Old (line 56):
```
if (state.isInitialized && !state.session && location.pathname !== '/login' && !window.location.hash.startsWith('#/share/') && !window.location.hash.startsWith('#/quote/')) {
```

New:
```
if (state.isInitialized && !state.session && location.pathname !== '/login' && !window.location.hash.startsWith('#/share/') && !window.location.hash.startsWith('#/quote/') && !window.location.pathname.startsWith('/portal/')) {
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```
git add src/pages/ClientPortal.tsx src/App.tsx
git commit -m "chore: finalize client portal integration and public route exclusion"
```
