# Quotes Module Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Quotes module with versioning, improved PDF generation, form validation, and bug fixes.

**Architecture:** Incremental enhancement of existing React components. Add version tracking to quotes, replace html2canvas with @react-pdf/renderer, add react-hook-form validation, and fix identified bugs.

**Tech Stack:** React 19, TypeScript, Firebase Firestore, @react-pdf/renderer, react-hook-form

## Global Constraints

- React 19 + TypeScript + Vite
- Firebase Firestore for backend
- Tailwind CSS for styling
- Maintain existing code patterns and conventions
- No breaking changes to existing functionality

---

## File Structure

### New Files
- `src/types/quote-version.ts` - Version types and helpers
- `src/components/quotes/QuoteVersionHistory.tsx` - Version history UI
- `src/components/quotes/QuoteVersionCompare.tsx` - Version comparison modal
- `src/components/quotes/QuotePdfDocument.tsx` - PDF document component
- `src/components/quotes/QuotePdfPreview.tsx` - PDF preview modal
- `src/utils/quote-validation.ts` - Validation schemas

### Modified Files
- `src/types/index.ts` - Export version types
- `src/pages/QuoteDetailPage.tsx` - Add versioning, PDF preview
- `src/pages/QuotesPage.tsx` - Add version indicator
- `src/pages/TemplatesPage.tsx` - Fix line item IDs
- `src/components/quotes/CleaningEstimator.tsx` - Fix template line item IDs
- `src/context/AppContext.tsx` - Add real-time quote listener

---

## Task 1: Add Version Types and Helpers

**Files:**
- Create: `src/types/quote-version.ts`
- Modify: `src/types/index.ts:1-50`

**Interfaces:**
- Consumes: Existing `Quote` type from `src/types/index.ts`
- Produces: `QuoteVersion` type, `createVersion()` helper

- [ ] **Step 1: Create version types file**

```typescript
// src/types/quote-version.ts
import type { Quote } from './index';

export interface QuoteVersion {
  id: string;
  version: number;
  snapshot: Omit<Quote, 'versions'>;
  changedBy: string;
  changedAt: string;
  changeNote?: string;
}

export function createVersion(
  quote: Quote,
  changedBy: string,
  changeNote?: string
): QuoteVersion {
  const { versions, ...snapshot } = quote;
  return {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    version: (quote.currentVersion || 0) + 1,
    snapshot,
    changedBy,
    changedAt: new Date().toISOString(),
    changeNote,
  };
}

export function addVersionToQuote(
  quote: Quote,
  version: QuoteVersion
): Quote {
  return {
    ...quote,
    currentVersion: version.version,
    versions: [...(quote.versions || []), version],
  };
}
```

- [ ] **Step 2: Export from types/index.ts**

Add to `src/types/index.ts` after existing exports:
```typescript
export type { QuoteVersion } from './quote-version';
export { createVersion, addVersionToQuote } from './quote-version';
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/types/quote-version.ts src/types/index.ts
git commit -m "feat: add quote version types and helpers"
```

---

## Task 2: Add Version History Component

**Files:**
- Create: `src/components/quotes/QuoteVersionHistory.tsx`

**Interfaces:**
- Consumes: `QuoteVersion` type, `formatDate()` from utils
- Produces: `QuoteVersionHistory` component

- [ ] **Step 1: Create version history component**

```tsx
// src/components/quotes/QuoteVersionHistory.tsx
import React from 'react';
import { Clock, User, RotateCcw } from 'lucide-react';
import type { QuoteVersion } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface Props {
  versions: QuoteVersion[];
  currentVersion: number;
  onRestore: (version: QuoteVersion) => void;
  onCompare: (v1: QuoteVersion, v2: QuoteVersion) => void;
}

export function QuoteVersionHistory({ versions, currentVersion, onRestore, onCompare }: Props) {
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  if (sortedVersions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        No version history yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedVersions.map((v, idx) => (
        <div
          key={v.id}
          className={`p-3 rounded-xl border ${
            v.version === currentVersion
              ? 'border-blue-200 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                label={`v${v.version}`}
                variant={v.version === currentVersion ? 'info' : 'default'}
              />
              {v.version === currentVersion && (
                <span className="text-xs text-blue-600 font-medium">Current</span>
              )}
            </div>
            <div className="flex gap-1">
              {idx < sortedVersions.length - 1 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onCompare(v, sortedVersions[idx + 1])}
                >
                  Compare
                </Button>
              )}
              {v.version !== currentVersion && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={RotateCcw}
                  onClick={() => onRestore(v)}
                >
                  Restore
                </Button>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDate(v.changedAt)} {formatTime(v.changedAt)}
            </span>
            <span className="flex items-center gap-1">
              <User size={12} />
              {v.changedBy}
            </span>
          </div>
          {v.changeNote && (
            <p className="mt-1 text-xs text-gray-600">{v.changeNote}</p>
          )}
          <div className="mt-2 text-sm font-medium text-gray-900">
            ${v.snapshot.totalMonthly.toFixed(2)}/mo
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/quotes/QuoteVersionHistory.tsx
git commit -m "feat: add quote version history component"
```

---

## Task 3: Add Version Comparison Modal

**Files:**
- Create: `src/components/quotes/QuoteVersionCompare.tsx`

**Interfaces:**
- Consumes: `QuoteVersion` type
- Produces: `QuoteVersionCompare` component

- [ ] **Step 1: Create version comparison component**

```tsx
// src/components/quotes/QuoteVersionCompare.tsx
import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { formatCAD } from '../../utils/formatters';
import type { QuoteVersion } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  versionA: QuoteVersion;
  versionB: QuoteVersion;
}

export function QuoteVersionCompare({ isOpen, onClose, versionA, versionB }: Props) {
  const older = versionA.version < versionB.version ? versionA : versionB;
  const newer = versionA.version < versionB.version ? versionB : versionA;

  const oldItems = new Map(older.snapshot.lineItems.map(li => [li.id, li]));
  const newItems = new Map(newer.snapshot.lineItems.map(li => [li.id, li]));

  const added = newer.snapshot.lineItems.filter(li => !oldItems.has(li.id));
  const removed = older.snapshot.lineItems.filter(li => !newItems.has(li.id));
  const changed = newer.snapshot.lineItems.filter(li => {
    const old = oldItems.get(li.id);
    return old && (
      old.description !== li.description ||
      old.amountPerVisit !== li.amountPerVisit ||
      old.visitsPerWeek !== li.visitsPerWeek ||
      old.monthlyAmount !== li.monthlyAmount
    );
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare Versions" size="lg">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <Badge label={`v${older.version}`} variant="default" />
            <span className="ml-2 text-sm text-gray-500">Older</span>
          </div>
          <div>
            <Badge label={`v${newer.version}`} variant="info" />
            <span className="ml-2 text-sm text-gray-500">Newer</span>
          </div>
        </div>

        {added.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-700 mb-2">Added</h4>
            {added.map(li => (
              <div key={li.id} className="p-2 bg-green-50 rounded-lg text-sm">
                {li.description} - {formatCAD(li.monthlyAmount)}/mo
              </div>
            ))}
          </div>
        )}

        {removed.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-700 mb-2">Removed</h4>
            {removed.map(li => (
              <div key={li.id} className="p-2 bg-red-50 rounded-lg text-sm">
                {li.description} - {formatCAD(li.monthlyAmount)}/mo
              </div>
            ))}
          </div>
        )}

        {changed.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-700 mb-2">Changed</h4>
            {changed.map(li => {
              const old = oldItems.get(li.id)!;
              return (
                <div key={li.id} className="p-2 bg-amber-50 rounded-lg text-sm">
                  <div className="font-medium">{li.description}</div>
                  <div className="text-xs text-gray-500">
                    {old.amountPerVisit} → {li.amountPerVisit} per visit,{' '}
                    {old.visitsPerWeek} → {li.visitsPerWeek} visits/week
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t pt-3 flex justify-between text-sm font-semibold">
          <span>Total Change</span>
          <span>
            {formatCAD(older.snapshot.totalMonthly)} → {formatCAD(newer.snapshot.totalMonthly)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/quotes/QuoteVersionCompare.tsx
git commit -m "feat: add quote version comparison modal"
```

---

## Task 4: Integrate Versioning into QuoteDetailPage

**Files:**
- Modify: `src/pages/QuoteDetailPage.tsx`

**Interfaces:**
- Consumes: `createVersion`, `addVersionToQuote` from types
- Produces: Version creation on status change and line item modifications

- [ ] **Step 1: Add version imports**

Add to imports in `src/pages/QuoteDetailPage.tsx`:
```typescript
import { createVersion, addVersionToQuote } from '../types';
import { QuoteVersionHistory } from '../components/quotes/QuoteVersionHistory';
import { QuoteVersionCompare } from '../components/quotes/QuoteVersionCompare';
```

- [ ] **Step 2: Add version state**

Add after existing state declarations:
```typescript
const [showVersionHistory, setShowVersionHistory] = useState(false);
const [compareVersions, setCompareVersions] = useState<{
  v1: QuoteVersion;
  v2: QuoteVersion;
} | null>(null);
```

- [ ] **Step 3: Update handleStatusChange**

Replace existing `handleStatusChange`:
```typescript
const handleStatusChange = (status: QuoteStatus) => {
  const version = createVersion(quote, currentUser.id, `Status changed to ${status}`);
  const updatedQuote = addVersionToQuote(quote, version);
  dispatch({
    type: 'UPDATE_QUOTE',
    payload: { ...updatedQuote, status, updatedAt: new Date().toISOString() },
  });
};
```

- [ ] **Step 4: Update handleAddLineItem**

Replace existing `handleAddLineItem`:
```typescript
const handleAddLineItem = () => {
  // ... existing validation and item creation ...
  const version = createVersion(quote, currentUser.id, `Added line item: ${newItem.description}`);
  const updatedQuote = addVersionToQuote(quote, version);
  dispatch({
    type: 'UPDATE_QUOTE',
    payload: {
      ...updatedQuote,
      lineItems,
      totalMonthly,
      updatedAt: new Date().toISOString(),
    },
  });
  // ... reset form ...
};
```

- [ ] **Step 5: Update handleRemoveLineItem**

Replace existing `handleRemoveLineItem`:
```typescript
const handleRemoveLineItem = (itemId: string) => {
  const item = quote.lineItems.find(li => li.id === itemId);
  const version = createVersion(quote, currentUser.id, `Removed line item: ${item?.description}`);
  const updatedQuote = addVersionToQuote(quote, version);
  dispatch({
    type: 'UPDATE_QUOTE',
    payload: {
      ...updatedQuote,
      lineItems,
      totalMonthly,
      updatedAt: new Date().toISOString(),
    },
  });
};
```

- [ ] **Step 6: Add version history button**

Add to the actions section (near Print/Download buttons):
```tsx
<Button
  size="sm"
  icon={Clock}
  variant="secondary"
  onClick={() => setShowVersionHistory(true)}
>
  History (v{quote.currentVersion || 1})
</Button>
```

- [ ] **Step 7: Add version history panel**

Add before the closing `</AppShell>` tag:
```tsx
{/* Version History Panel */}
{showVersionHistory && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Version History</h3>
        <button onClick={() => setShowVersionHistory(false)}>×</button>
      </div>
      <div className="p-4 overflow-y-auto max-h-[60vh]">
        <QuoteVersionHistory
          versions={quote.versions || []}
          currentVersion={quote.currentVersion || 1}
          onRestore={(v) => {
            const restoredQuote = { ...v.snapshot, id: quote.id } as Quote;
            dispatch({ type: 'UPDATE_QUOTE', payload: restoredQuote });
            setShowVersionHistory(false);
            toast.success(`Restored to v${v.version}`);
          }}
          onCompare={(v1, v2) => setCompareVersions({ v1, v2 })}
        />
      </div>
    </div>
  </div>
)}

{/* Version Compare Modal */}
{compareVersions && (
  <QuoteVersionCompare
    isOpen={true}
    onClose={() => setCompareVersions(null)}
    versionA={compareVersions.v1}
    versionB={compareVersions.v2}
  />
)}
```

- [ ] **Step 8: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add src/pages/QuoteDetailPage.tsx
git commit -m "feat: integrate versioning into quote detail page"
```

---

## Task 5: Install @react-pdf/renderer

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: None
- Produces: @react-pdf/renderer dependency

- [ ] **Step 1: Install package**

Run: `npm install @react-pdf/renderer`
Expected: Package added to dependencies

- [ ] **Step 2: Verify installation**

Run: `npm ls @react-pdf/renderer`
Expected: Shows installed version

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @react-pdf/renderer"
```

---

## Task 6: Create PDF Document Component

**Files:**
- Create: `src/components/quotes/QuotePdfDocument.tsx`

**Interfaces:**
- Consumes: `Quote` type, `formatCAD()` from utils
- Produces: `QuotePdfDocument` component

- [ ] **Step 1: Create PDF document component**

```tsx
// src/components/quotes/QuotePdfDocument.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Quote } from '../../types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  totalSection: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  clientAddress: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 4,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
});

interface Props {
  quote: Quote;
  businessName: string;
}

export function QuotePdfDocument({ quote, businessName }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{businessName}</Text>
            <Text style={styles.subtitle}>Commercial Cleaning Services</Text>
          </View>
          <View style={styles.totalSection}>
            <Text style={styles.totalAmount}>${quote.totalMonthly.toFixed(2)}</Text>
            <Text style={styles.totalLabel}>/month</Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared For</Text>
          <Text style={styles.clientName}>{quote.prospectName}</Text>
          <Text style={styles.clientAddress}>{quote.prospectAddress}</Text>
          <Text style={styles.clientAddress}>
            {quote.prospectCity}, {quote.prospectProvince} {quote.prospectPostalCode}
          </Text>
          {quote.prospectPhone && (
            <Text style={styles.clientAddress}>{quote.prospectPhone}</Text>
          )}
        </View>

        {/* Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Frequency</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Visits</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Monthly</Text>
          </View>
          {quote.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                {item.frequency}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                {item.visitsPerWeek}x
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                ${item.amountPerVisit.toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                ${item.monthlyAmount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.tableCell}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{businessName}</Text>
          <Text style={styles.footerText}>
            This proposal is valid until {new Date(quote.validUntil).toLocaleDateString()}
          </Text>
          <Text style={styles.footerText}>Prices subject to change</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/quotes/QuotePdfDocument.tsx
git commit -m "feat: add PDF document component"
```

---

## Task 7: Create PDF Preview Modal

**Files:**
- Create: `src/components/quotes/QuotePdfPreview.tsx`

**Interfaces:**
- Consumes: `QuotePdfDocument` component, `Quote` type
- Produces: `QuotePdfPreview` component

- [ ] **Step 1: Create PDF preview component**

```tsx
// src/components/quotes/QuotePdfPreview.tsx
import React from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { Download, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { QuotePdfDocument } from './QuotePdfDocument';
import type { Quote } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  businessName: string;
}

export function QuotePdfPreview({ isOpen, onClose, quote, businessName }: Props) {
  const fileName = `Quote-${quote.prospectName.replace(/\s+/g, '_')}.pdf`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PDF Preview" size="xl">
      <div className="space-y-4">
        <div className="h-[600px] border rounded-lg overflow-hidden">
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <QuotePdfDocument quote={quote} businessName={businessName} />
          </PDFViewer>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <PDFDownloadLink
            document={<QuotePdfDocument quote={quote} businessName={businessName} />}
            fileName={fileName}
          >
            {({ loading }) => (
              <Button icon={Download} disabled={loading}>
                {loading ? 'Generating...' : 'Download PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/quotes/QuotePdfPreview.tsx
git commit -m "feat: add PDF preview modal"
```

---

## Task 8: Integrate PDF Preview into QuoteDetailPage

**Files:**
- Modify: `src/pages/QuoteDetailPage.tsx`

**Interfaces:**
- Consumes: `QuotePdfPreview` component
- Produces: PDF preview button and modal

- [ ] **Step 1: Add PDF preview import**

Add to imports:
```typescript
import { QuotePdfPreview } from '../components/quotes/QuotePdfPreview';
```

- [ ] **Step 2: Add PDF preview state**

Add after existing state:
```typescript
const [showPdfPreview, setShowPdfPreview] = useState(false);
```

- [ ] **Step 3: Replace Download PDF button**

Replace the existing Download PDF button:
```tsx
<Button
  size="sm"
  icon={Download}
  variant="secondary"
  onClick={() => setShowPdfPreview(true)}
>
  Download PDF
</Button>
```

- [ ] **Step 4: Add PDF preview modal**

Add before closing `</AppShell>`:
```tsx
{/* PDF Preview Modal */}
<QuotePdfPreview
  isOpen={showPdfPreview}
  onClose={() => setShowPdfPreview(false)}
  quote={quote}
  businessName={state.settings.businessName}
/>
```

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/QuoteDetailPage.tsx
git commit -m "feat: integrate PDF preview into quote detail page"
```

---

## Task 9: Add Form Validation

**Files:**
- Create: `src/utils/quote-validation.ts`

**Interfaces:**
- Consumes: `Quote` type
- Produces: Validation schemas and helpers

- [ ] **Step 1: Create validation utils**

```typescript
// src/utils/quote-validation.ts
import { z } from 'zod';

const canadianPostalCode = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const canadianPhone = /^(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

export const quoteFormSchema = z.object({
  prospectName: z.string().min(2, 'Name must be at least 2 characters'),
  prospectAddress: z.string().min(5, 'Address must be at least 5 characters'),
  prospectCity: z.string().min(2, 'City must be at least 2 characters'),
  prospectProvince: z.string().min(2, 'Province is required'),
  prospectPostalCode: z.string().regex(canadianPostalCode, 'Invalid postal code (e.g., L6P 1A1)'),
  prospectPhone: z.string().regex(canadianPhone, 'Invalid phone number (e.g., 905-555-0404)').optional().or(z.literal('')),
  clientId: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.string().refine((val) => {
    if (!val) return true;
    return new Date(val) > new Date();
  }, 'Valid until must be a future date'),
});

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  siteId: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  amountPerVisit: z.number().positive('Amount must be greater than 0'),
  visitsPerWeek: z.number().positive('Visits must be at least 1'),
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;
export type LineItemFormData = z.infer<typeof lineItemSchema>;

export function validateQuoteForm(data: unknown) {
  return quoteFormSchema.safeParse(data);
}

export function validateLineItem(data: unknown) {
  return lineItemSchema.safeParse(data);
}
```

- [ ] **Step 2: Install zod if needed**

Run: `npm ls zod`
Expected: If not installed, run `npm install zod`

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/utils/quote-validation.ts
git commit -m "feat: add quote form validation schemas"
```

---

## Task 10: Integrate Validation into QuotesPage

**Files:**
- Modify: `src/pages/QuotesPage.tsx`

**Interfaces:**
- Consumes: `validateQuoteForm` from utils
- Produces: Form validation with error messages

- [ ] **Step 1: Add validation import**

Add to imports:
```typescript
import { validateQuoteForm } from '../utils/quote-validation';
```

- [ ] **Step 2: Add validation state**

Add after existing state:
```typescript
const [formErrors, setFormErrors] = useState<Record<string, string>>({});
```

- [ ] **Step 3: Update handleCreateQuote**

Replace existing `handleCreateQuote`:
```typescript
const handleCreateQuote = () => {
  const result = validateQuoteForm(formData);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      errors[path] = issue.message;
    });
    setFormErrors(errors);
    return;
  }
  setFormErrors({});
  // ... existing creation logic ...
};
```

- [ ] **Step 4: Add error display to form fields**

Update the Input components to show errors. For example:
```tsx
<Input
  label="Prospect / Business Name"
  value={formData.prospectName}
  onChange={e => {
    setFormData({...formData, prospectName: e.target.value});
    if (formErrors.prospectName) {
      setFormErrors(prev => ({ ...prev, prospectName: '' }));
    }
  }}
  placeholder="e.g. Kennedy Medical Clinic"
  required
  error={formErrors.prospectName}
/>
```

- [ ] **Step 5: Add form-level error summary**

Add before the form fields:
```tsx
{Object.keys(formErrors).length > 0 && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
    <p className="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
    <ul className="text-sm text-red-700 list-disc list-inside">
      {Object.values(formErrors).filter(Boolean).map((error, i) => (
        <li key={i}>{error}</li>
      ))}
    </ul>
  </div>
)}
```

- [ ] **Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/QuotesPage.tsx
git commit -m "feat: integrate form validation into quotes page"
```

---

## Task 11: Fix Template Line Item IDs

**Files:**
- Modify: `src/pages/TemplatesPage.tsx`

**Interfaces:**
- Consumes: `generateId()` from storage utils
- Produces: Stable UUID-based IDs for line items

- [ ] **Step 1: Update newLineId function**

Replace the existing `newLineId` function:
```typescript
// Remove the counter-based function
// let lineIdCounter = 0;
// function newLineId(): string {
//   lineIdCounter++;
//   return `li-${lineIdCounter}-${Date.now()}`;
// }

// Use generateId instead
const newLineId = generateId;
```

- [ ] **Step 2: Update all usages**

Search for `newLineId()` calls and ensure they use the updated function. The function signature remains the same, so no other changes needed.

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/TemplatesPage.tsx
git commit -m "fix: use stable UUID for template line item IDs"
```

---

## Task 12: Fix CleaningEstimator Line Item IDs

**Files:**
- Modify: `src/components/quotes/CleaningEstimator.tsx`

**Interfaces:**
- Consumes: `generateId()` from storage utils
- Produces: Stable UUID-based IDs for generated line items

- [ ] **Step 1: Update line item ID generation**

In the `handleApply` function, replace:
```typescript
const baseId = generateId();
```

This is already correct. Verify that all ID generation uses `generateId()`.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/quotes/CleaningEstimator.tsx
git commit -m "fix: ensure stable IDs in cleaning estimator"
```

---

## Task 13: Add Real-time Quote Listener

**Files:**
- Modify: `src/context/AppContext.tsx`

**Interfaces:**
- Consumes: Firebase Firestore `onSnapshot`
- Produces: Real-time quote updates

- [ ] **Step 1: Add real-time listener**

In the `AppContext.tsx` file, find the useEffect that sets up Firestore listeners and add:

```typescript
// Quotes real-time listener
const unsubscribeQuotes = onSnapshot(
  collection(db, 'quotes'),
  (snapshot) => {
    const quotes = snapshot.docs.map(docToObj) as Quote[];
    dispatch({ type: 'SET_QUOTES', payload: quotes });
  },
  (error) => {
    console.error('Quotes listener error:', error);
  }
);
```

- [ ] **Step 2: Add cleanup**

Add to the cleanup function in the same useEffect:
```typescript
return () => {
  // ... existing cleanup ...
  unsubscribeQuotes();
};
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: add real-time quote listener"
```

---

## Task 14: Add Version Indicator to QuotesPage

**Files:**
- Modify: `src/pages/QuotesPage.tsx`

**Interfaces:**
- Consumes: `Quote` type with `currentVersion`
- Produces: Version badge on quote cards

- [ ] **Step 1: Add version badge to quote cards**

In the quote card rendering, add version indicator:
```tsx
<div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
    <FileText size={20} className="text-amber-600" />
  </div>
  <div>
    <h4 className="font-semibold text-gray-900">{quote.prospectName}</h4>
    <div className="flex items-center gap-2">
      <Badge label={quote.status} variant={statusColors[quote.status]} className="text-xs" />
      {quote.currentVersion && quote.currentVersion > 1 && (
        <Badge label={`v${quote.currentVersion}`} variant="default" className="text-xs" />
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/QuotesPage.tsx
git commit -m "feat: add version indicator to quote cards"
```

---

## Task 15: Final Integration Testing

**Files:**
- None (testing only)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified working feature

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linting**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Build project**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 4: Manual testing checklist**

- [ ] Create a new quote with validation errors
- [ ] Fix errors and create quote successfully
- [ ] Add line items and verify version is created
- [ ] Change quote status and verify version is created
- [ ] View version history
- [ ] Compare two versions
- [ ] Restore a previous version
- [ ] Download PDF and verify quality
- [ ] Test PDF preview modal

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: quotes module enhancement complete"
```

---

## Summary

**Total Tasks:** 15
**Estimated Time:** 4-6 hours
**Dependencies:** @react-pdf/renderer, zod (if not already installed)

**Key Features:**
1. Quote versioning with history and comparison
2. High-quality PDF generation with preview
3. Comprehensive form validation
4. Real-time quote updates
5. Bug fixes for template IDs
