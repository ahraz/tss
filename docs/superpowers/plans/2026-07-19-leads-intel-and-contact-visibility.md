# Leads Intel & Contact Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface lead contact details (email, website, address) at all times and add competitor intelligence tracking to the LeadCard.

**Architecture:** Three new optional fields on the `Lead` type map to new Google Sheet columns P-R. The LeadCard layout reorders to show contact info in the always-visible area. A collapsible "Intel" section shows competitor info. Email editing state becomes per-lead (record keyed by placeId) instead of a single shared value. Loading state and flickering bugs in LeadsPage are fixed inline.

**Tech Stack:** React, TypeScript, Firebase, Google Sheets API

## Global Constraints

- All new `Lead` fields are optional (`?`) — no migration required for existing leads
- Google Sheet column registry uses 0-indexed positions
- Firestore `setDoc` with `merge: true` handles new fields automatically
- Static helper functions must be moved outside React components
- Button text changes must match spec exactly

---

### Task 1: Add new fields to Lead type + email edit state type

**Files:**
- Modify: `src/types/index.ts:521-538`

**Interfaces:**
- Consumes: existing `Lead` interface
- Produces: `Lead` with `currentCleaner`, `competitorNotes`, `lastContactedAt` fields

- [ ] Add three optional fields to the `Lead` interface

```typescript
export interface Lead {
  id?: string;
  rowIndex: number;
  type: string;
  phone: string;
  businessName: string;
  types: string;
  rating: string;
  address: string;
  reviews: string;
  website: string;
  placeId: string;
  gpsCoordinates: string;
  email?: string;
  currentCleaner?: string;
  competitorNotes?: string;
  lastContactedAt?: string;
  latestCall?: CallLogEntry | null;
}
```

- [ ] Verify file reads cleanly

Run: `npx tsc --noEmit src/types/index.ts --skipLibCheck 2>&1 | head -5`
Expected: no errors or warnings

- [ ] Commit

```bash
git add src/types/index.ts
git commit -m "feat(leads): add currentCleaner, competitorNotes, lastContactedAt to Lead type"
```

---

### Task 2: Update Google Sheets COLUMNS registry

**Files:**
- Modify: `src/lib/googleSheets.ts:18-34`

**Interfaces:**
- Consumes: `COLUMNS` registry object, `fetchLeadsFromSheet()` mapping, `scrapeLeadsFromMaps()` write range
- Produces: Updated registry with columns P, Q, R; expanded fetch range from `A:O` to `A:R`

- [ ] Add P, Q, R columns to the COLUMNS registry

Edit lines 18-34 — add three new entries after O:

```typescript
const COLUMNS: Record<string, { index: number; label: string }> = {
  A: { index: 0,  label: 'Business Type' },
  B: { index: 1,  label: 'Phone' },
  C: { index: 2,  label: 'Business Name' },
  D: { index: 3,  label: 'Google Types' },
  E: { index: 4,  label: 'Rating' },
  F: { index: 5,  label: 'Address' },
  G: { index: 6,  label: 'Reviews' },
  H: { index: 7,  label: 'Website' },
  I: { index: 8,  label: 'Email' },
  J: { index: 9,  label: 'GPS Coordinates' },
  K: { index: 10, label: 'Call Status' },
  L: { index: 11, label: 'Called By' },
  M: { index: 12, label: 'Last Called' },
  N: { index: 13, label: 'Notes' },
  O: { index: 14, label: 'Place ID' },
  P: { index: 15, label: 'Current Cleaner' },
  Q: { index: 16, label: 'Competitor Notes' },
  R: { index: 17, label: 'Last Contacted' },
};
```

- [ ] Update the fetch range in `fetchLeadsFromSheet()` from `A:O` to `A:R`

Edit line 177:
```typescript
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:R`,
```

- [ ] Add the three new field mappings in the lead object builder (after the `email` line, before `placeId`)

Edit the `fetchLeadsFromSheet` function — add the three new fields in the `leads.push({...})` block around lines 196-209:

```typescript
    leads.push({
      rowIndex: i + 1,
      type: row[COLUMNS.A.index] || '',
      phone: row[COLUMNS.B.index] || '',
      businessName: row[COLUMNS.C.index] || '',
      types: row[COLUMNS.D.index] || '',
      rating: row[COLUMNS.E.index] || '',
      address: row[COLUMNS.F.index] || '',
      reviews: row[COLUMNS.G.index] || '',
      website: row[COLUMNS.H.index] || '',
      email: row[COLUMNS.I.index]?.trim() || undefined,
      gpsCoordinates: row[COLUMNS.J.index] || '',
      placeId: row[COLUMNS.O.index] || String(i + 1),
      currentCleaner: row[COLUMNS.P.index]?.trim() || undefined,
      competitorNotes: row[COLUMNS.Q.index]?.trim() || undefined,
      lastContactedAt: row[COLUMNS.R.index]?.trim() || undefined,
    });
```

Note: `gpsCoordinates` stays before `placeId` — move the `email` line above it to keep the ordering matching the COLUMNS order, but keep `currentCleaner`/`competitorNotes`/`lastContactedAt` after `placeId`.

- [ ] Update the scrape write range from `A:O` to `A:R`

Edit line 479:
```typescript
    const range = `Results!A${lastRow + 1}:R${lastRow + newRows.length}`;
```

And in the `newRows.push` call around line 427, add three trailing nulls for columns P, Q, R:
```typescript
          newRows.push([
            category,                                // A: type
            details.phone,                           // B: phone
            place.name,                              // C: title
            JSON.stringify(place.types || []),       // D: types
            String(place.rating || ''),              // E: rating
            place.formatted_address || '',           // F: address
            details.reviews,                         // G: reviews
            details.website,                         // H: website
            null,                                    // I: email
            gps,                                     // J: gpsCoordinates
            null, null, null, null,                   // K-N: legacy
            place.place_id,                           // O: place ID
            null, null, null,                          // P-R: new intel fields
          ]);
```

Also update similar ranges in other places that hardcode `A:O`:
- `fetchSheetValues(token, 'Results!A:O')` at line 380 → change to `'Results!A:R'`
- `backfillPlaceIds` range at line 541 → change to `'Results!A:R'`

- [ ] Verify no TypeScript errors

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -10`
Expected: no errors

- [ ] Commit

```bash
git add src/lib/googleSheets.ts
git commit -m "feat(leads): add columns P-R for competitor intel in sheets registry"
```

---

### Task 3: Refactor LeadCard — move static functions out + fix email state conflict

**Files:**
- Modify: `src/components/leads/LeadCard.tsx`

**Interfaces:**
- Consumes: `Lead`, `CallLogEntry`, `CallOutcome`, `EmailLog`, `QuoteLineItem`, `CleaningFrequency` types; `generateId` util
- Produces: Refactored `LeadCard` with static functions externalized, per-lead email editing state

- [ ] Move `getLineItemsForType` outside the component (before `export function LeadCard`)

Cut lines 49-65 and place them before the component declaration:

```typescript
function getLineItemsForType(businessType: string): QuoteLineItem[] {
  const base = (desc: string): QuoteLineItem => ({
    id: generateId(),
    description: desc,
    siteId: null,
    frequency: 'weekly' as CleaningFrequency,
    amountPerVisit: 0,
    visitsPerWeek: 1,
    monthlyAmount: 0,
  });
  const t = businessType.toLowerCase();
  if (t.includes('dental')) return [base('Medical-grade disinfection'), base('Exam room cleaning'), base('Reception area'), base('Floor care')];
  if (t.includes('medical')) return [base('Medical-grade disinfection'), base('Waiting room'), base('Exam rooms'), base('Sanitization')];
  if (t.includes('physio') || t.includes('vet')) return [base('Treatment area cleaning'), base('Reception'), base('Floor care'), base('Sanitization')];
  if (t.includes('law') || t.includes('account') || t.includes('real estate') || t.includes('insurance')) return [base('Reception area'), base('Conference rooms'), base('Office cleaning'), base('Window cleaning')];
  return [base('Workstation cleaning'), base('Reception'), base('Floor care'), base('Breakroom')];
}
```

- [ ] Move `leadTypeToRate` outside the component (before the component, after `getLineItemsForType`)

Cut lines 85-94 and place them after `getLineItemsForType`:

```typescript
function leadTypeToRate(leadType: string): { rate: number; facility: string } {
  const t = (leadType || '').toLowerCase();
  if (t.includes('dental')) return { rate: 0.55, facility: 'Dental Clinic' };
  if (t.includes('medical') || t.includes('physio') || t.includes('vet')) return { rate: 0.55, facility: 'Medical Clinic' };
  if (t.includes('law') || t.includes('account') || t.includes('real estate') || t.includes('insurance')) return { rate: 0.36, facility: 'Office' };
  if (t.includes('retail')) return { rate: 0.30, facility: 'Retail' };
  if (t.includes('warehouse')) return { rate: 0.22, facility: 'Warehouse' };
  if (t.includes('restaurant')) return { rate: 0.44, facility: 'Restaurant' };
  return { rate: 0.36, facility: 'Commercial' };
}
```

- [ ] Remove the `freqMult` object from inside the component (line 83) and make it a module-level constant before the component

Add before the component:
```typescript
const FREQ_MULT: Record<number, number> = { 1: 0.25, 2: 0.42, 3: 0.58, 4: 0.72, 5: 0.87, 6: 1.0, 7: 1.13 };
```

Remove line 83: `const freqMult: Record<number, number> = { ... };` from inside the component.
Update references inside the component: change `freqMult` to `FREQ_MULT`.

- [ ] Update `LeadCard` props — replace `emailValue` string with `emailEditValues: Record<string, string>` map

Change the Props interface:
```typescript
interface Props {
  lead: Lead;
  leadKey: string;
  latestCall: CallLogEntry | null;
  calledToday: boolean;
  hasBeenEmailed: boolean;
  isExpanded: boolean;
  leadCallLogs: CallLogEntry[];
  emailLogsByLead: Map<string, EmailLog[]>;
  editingEmailFor: string | null;
  emailEditValues: Record<string, string>;
  copyingLeadId: string | null;
  editingCallLogId: string | null;
  onToggleExpand: () => void;
  onStartEditEmail: () => void;
  onSaveEmail: (leadId: string) => void;
  onCancelEditEmail: () => void;
  onEmailValueChange: (leadId: string, v: string) => void;
  onCopyEmail: (lead: Lead) => void;
  onMarkEmailSent: (lead: Lead) => void;
  onChangeOutcome: (log: CallLogEntry, newOutcome: CallOutcome) => void;
  onSetEditingCallLogId: (id: string | null) => void;
  onCallClick: (lead: Lead) => void;
}
```

Update the destructuring in the component:
```typescript
export function LeadCard({
  lead, leadKey: lk, latestCall, calledToday, hasBeenEmailed, isExpanded, leadCallLogs, emailLogsByLead,
  editingEmailFor, emailEditValues, copyingLeadId, editingCallLogId,
  onToggleExpand, onStartEditEmail, onSaveEmail, onCancelEditEmail, onEmailValueChange,
  onCopyEmail, onMarkEmailSent, onChangeOutcome, onSetEditingCallLogId, onCallClick,
}: Props) {
```

Update the email input value reference (line 198):
```typescript
<input type="email" value={emailEditValues[lk] || ''} onChange={e => onEmailValueChange(lk, e.target.value)}
```

- [ ] Update `LeadsPage.tsx` to pass the new props

In `LeadsPage.tsx`, change the email state:
```typescript
const [editingEmailFor, setEditingEmailFor] = useState<string | null>(null);
const [emailEditValues, setEmailEditValues] = useState<Record<string, string>>({});
```

Update `handleStartEditEmail`:
```typescript
const handleStartEditEmail = (lead: Lead) => {
  setEditingEmailFor(leadKey(lead));
  setEmailEditValues(prev => ({ ...prev, [leadKey(lead)]: lead.email || '' }));
};
```

Update `handleSaveEmail`:
```typescript
const handleSaveEmail = (leadId: string) => {
  const trimmed = (emailEditValues[leadId] || '').trim();
  if (trimmed) {
    dispatch({ type: 'UPDATE_LEAD_EMAIL', payload: { leadId, email: trimmed } });
    toast.success('Email saved');
  }
  setEditingEmailFor(null);
};
```

Update `handleCancelEditEmail`:
```typescript
const handleCancelEditEmail = () => {
  setEditingEmailFor(null);
};
```

Replace `onEmailValueChange={setEmailValue}` with:
```typescript
onEmailValueChange={(leadId, v) => setEmailEditValues(prev => ({ ...prev, [leadId]: v }))}
```

Replace `emailValue={emailValue}` with:
```typescript
emailEditValues={emailEditValues}
```

- [ ] Build check

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: no errors

- [ ] Commit

```bash
git add src/components/leads/LeadCard.tsx src/pages/LeadsPage.tsx
git commit -m "refactor(leads): extract static functions, fix email state conflict with per-lead map"
```

---

### Task 4: Redesign LeadCard layout — always-visible contact details + Intel section

**Files:**
- Modify: `src/components/leads/LeadCard.tsx`

**Interfaces:**
- Consumes: refactored `LeadCard` from Task 3 (static functions external, per-lead email state)
- Produces: Redesigned card with contact details always visible, website shown, collapsible intel section

- [ ] Redesign the main card content area (lines 176-350)

Replace the entire return JSX block (lines 176-422) with the new layout:

```typescript
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        {/* Contact info row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm">{lead.businessName || 'Unknown Business'}</h3>
              {statusBadge}
              {calledToday && <Badge label="Called Today" variant="success" className="text-[10px]" />}
              {hasBeenEmailed && lead.email && <Badge label="Emailed" variant="info" className="text-[10px]" />}
            </div>

            <div className="flex flex-col gap-0.5 mt-1.5 text-xs text-gray-600">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium">
                  <Phone size={12} />{lead.phone}
                </a>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                {editingEmailFor === lk ? (
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    <input type="email" value={emailEditValues[lk] || ''} onChange={e => onEmailValueChange(lk, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') onSaveEmail(lk); if (e.key === 'Escape') onCancelEditEmail(); }}
                      placeholder="email@example.com"
                      className="w-40 px-1.5 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus />
                    <button onClick={() => onSaveEmail(lk)} className="text-green-600 hover:text-green-700 ml-0.5"><CheckCircle2 size={12} /></button>
                    <button onClick={onCancelEditEmail} className="text-gray-400 hover:text-gray-600"><XCircle size={12} /></button>
                  </span>
                ) : lead.email ? (
                  <span className="flex items-center gap-1">
                    <Mail size={12} /><span className="truncate max-w-[180px]">{lead.email}</span>
                    <button onClick={onStartEditEmail} className="text-gray-400 hover:text-blue-500 ml-0.5"><ExternalLink size={10} /></button>
                  </span>
                ) : (
                  <button onClick={onStartEditEmail} className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors">
                    <Mail size={12} />Add email
                  </button>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 truncate max-w-[200px]">
                    <ExternalLink size={12} />{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {lead.rating && (
                  <span className="flex items-center gap-1 text-amber-500"><Star size={12} className="fill-amber-400" />{lead.rating}</span>
                )}
              </div>
              {lead.address && (
                <span className="flex items-center gap-1.5 text-gray-400 truncate max-w-[400px] sm:max-w-none">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="truncate sm:text-clip">{lead.address}</span>
                </span>
              )}
              {lead.type && <span className="text-gray-400">{lead.type}</span>}
            </div>

            {latestCall && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <User size={11} />
                Called by {latestCall.calledByName} · {new Date(latestCall.calledAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={`tel:${lead.phone}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              onClick={() => setTimeout(() => onCallClick(lead), 500)}>
              <Phone size={14} />Call
            </a>
            <button title="Quick Quote" onClick={handleQuickQuote}
              className="p-2 text-gray-400 hover:text-emerald-600 transition-colors">
              <Zap size={16} />
            </button>
            <button onClick={onToggleExpand} className="p-2 text-gray-400 hover:text-gray-600">
              <ChevronDown size={16} className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          </div>
        </div>

        {/* Intel section — collapsed by default */}
        <details className="group text-xs">
          <summary className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-700 select-none">
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            <span className="font-medium">Intel</span>
            {lead.latestCall?.calledAt && (
              <span className="text-gray-400 font-normal">
                · Last contacted {new Date(lead.latestCall.calledAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </summary>
          <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500 w-28 flex-shrink-0">Current cleaner</span>
              <span className="text-gray-700">{lead.currentCleaner || '—'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-500 w-28 flex-shrink-0">Notes</span>
              <span className="text-gray-700">{lead.competitorNotes || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500 w-28 flex-shrink-0">Last contacted</span>
              <span className="text-gray-700">
                {lead.lastContactedAt
                  ? new Date(lead.lastContactedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </span>
            </div>
          </div>
        </details>

        {/* Expanded section */}
        {isExpanded && (
          <div className="border-t border-gray-100 pt-3 mt-1">
            {lead.email && (
              <>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => onCopyEmail(lead)} disabled={copyingLeadId === lk}
                    className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50">
                    {copyingLeadId === lk ? <>Copying...</> : <><Copy size={15} />Copy Template</>}
                  </button>
                  <button onClick={() => onMarkEmailSent(lead)}
                    className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all">
                    <Mail size={15} />Mark as Sent
                  </button>
                </div>

                {(() => {
                  const logs = emailLogsByLead.get(lk);
                  if (!logs || logs.length === 0) return null;
                  return (
                    <>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email History</h4>
                      <div className="space-y-2">
                        {logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()).map(log => (
                          <div key={log.id} className="flex items-start gap-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 relative group">
                            <div className="p-1.5 rounded-full flex-shrink-0 bg-blue-100 text-blue-600"><Mail size={14} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-700">{log.sentByName} — Sent to {log.email}</p>
                              <p className="text-gray-400 mt-0.5">
                                {new Date(log.sentAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                            <button onClick={() => dispatch({ type: 'DELETE_EMAIL_LOG', payload: log.id })}
                              className="absolute top-1 right-1 p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <XCircle size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            )}

            <div className="flex gap-2 mb-3">
              <button onClick={handleQuickQuote}
                className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all">
                <Zap size={15} />Quick Quote
              </button>
              <button onClick={handleCreateQuote}
                className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all">
                <FileText size={15} />Full Quote
              </button>
            </div>

            {leadCallLogs.length > 0 && (
              <>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Call History</h4>
                <div className="space-y-2">
                  {leadCallLogs.sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime()).map(log => (
                    <div key={log.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="flex-1 flex items-start gap-3 bg-gray-50 rounded-lg p-2.5">
                        <button onClick={() => onSetEditingCallLogId(editingCallLogId === log.id ? null : log.id)}
                          className={`p-1.5 rounded-full flex-shrink-0 transition-colors ${
                            log.outcome === 'completed' ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : log.outcome === 'no_answer' ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : log.outcome === 'wrong_number' ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`} title="Click to change outcome">
                          {log.outcome === 'completed' ? <CheckCircle2 size={14} />
                            : log.outcome === 'no_answer' ? <XCircle size={14} />
                            : log.outcome === 'wrong_number' ? <AlertCircle size={14} />
                            : <RotateCcw size={14} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700">{log.calledByName} — {log.outcome.replace('_', ' ')}</p>
                          {editingCallLogId === log.id && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {OUTCOME_OPTIONS.filter(o => o.value !== log.outcome).map(opt => (
                                <button key={opt.value} onClick={() => onChangeOutcome(log, opt.value)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${opt.color}`}>{opt.label}</button>
                              ))}
                            </div>
                          )}
                          <p className="text-gray-400 mt-0.5">
                            {new Date(log.calledAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                          {log.notes && <p className="text-gray-500 mt-0.5 italic">"{log.notes}"</p>}
                        </div>
                      </div>
                      <button onClick={() => setDeleteLogId(log.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button onClick={() => setShowClearData(true)}
              className="w-full flex items-center justify-center gap-2 p-2.5 mt-3 bg-red-50 border-2 border-dashed border-red-200 rounded-xl text-sm font-medium text-red-700 hover:bg-red-100 hover:border-red-300 transition-all">
              <Trash2 size={15} />Clear Call Logs
            </button>
          </div>
        )}
      </div>

      {/* Quick Quote Modal */}
      <Modal isOpen={showQuickQuote} onClose={() => { setShowQuickQuote(false); setQqGeneratedQuoteId(null); }} title="Quick Quote" size="sm">
        <div className="space-y-5">
          {!qqGeneratedQuoteId ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Square Footage</label>
                <input type="number" value={qqSqft} onChange={e => setQqSqft(Math.max(100, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" min={100} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Visits per Week</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <button key={d} onClick={() => setQqDays(d)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        qqDays === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Estimated monthly</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(qqSqft * leadTypeToRate(lead.type).rate * (FREQ_MULT[qqDays] || 1.0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </p>
              </div>
              <Button onClick={handleGenerateQuickQuote} className="w-full">Generate Quote & Share</Button>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-sm font-semibold text-emerald-700">Quote generated!</p>
                <p className="text-xs text-gray-500 mt-1">Share this link with your prospect</p>
                <div className="mt-3 flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
                  <input type="text" value={qqShareUrl} readOnly
                    className="flex-1 text-xs text-gray-600 bg-transparent outline-none truncate" />
                  <button onClick={() => { navigator.clipboard.writeText(qqShareUrl); toast.success('Link copied'); }}
                    className="p-1.5 text-blue-600 hover:text-blue-700 flex-shrink-0">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <Button onClick={() => navigate(`/quotes/${qqGeneratedQuoteId}`)} className="w-full">Open Quote</Button>
            </>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteLogId}
        onClose={() => setDeleteLogId(null)}
        title="Delete Call Log"
        message="Remove this call log entry? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteLogId) dispatch({ type: 'DELETE_CALL_LOG', payload: deleteLogId }); }}
      />

      <ConfirmModal
        isOpen={showClearData}
        onClose={() => setShowClearData(false)}
        title="Clear Call Logs"
        message="Delete all call logs for this lead? Call history cannot be restored. Emails are kept."
        confirmLabel="Clear All"
        onConfirm={() => {
          leadCallLogs.forEach(log => dispatch({ type: 'DELETE_CALL_LOG', payload: log.id }));
        }}
      />
    </Card>
  );
```

Key changes from old layout:
- Contact details (phone, email, website, rating, address) always visible — not hidden behind expand
- Website is now rendered (was missing entirely)
- Intel section uses `<details>` HTML element for native collapsible with no JS state needed
- Address uses `truncate` on small screens with `max-w-[400px]` then full width on `sm:`
- Quick Quote button moved to inline with Call (as icon) for one-tap access
- "Clear All Lead Data" renamed to "Clear Call Logs"
- `freqMult` → `FREQ_MULT` (module-level constant from Task 3)
- Quick Quote modal uses `FREQ_MULT` constant

- [ ] Build check

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: no errors

- [ ] Commit

```bash
git add src/components/leads/LeadCard.tsx
git commit -m "feat(leads): redesign LeadCard with always-visible contact details and intel section"
```

---

### Task 5: Fix LeadsPage bugs — loading state, flickering, dead code

**Files:**
- Modify: `src/pages/LeadsPage.tsx`

**Interfaces:**
- Consumes: refactored `LeadCard` from Task 3/4 (updated props)
- Produces: LeadsPage with proper loading state, no flicker, no dead code

- [ ] Add `firestoreReady` based on `state.isInitialized`

`AppState` has `isInitialized: boolean` (set to `true` after `fetchAllCollectionsOnce` completes). Use it to gate the empty-state rendering.

Add state and effect:
```typescript
const [firestoreReady, setFirestoreReady] = useState(state.isInitialized);

useEffect(() => {
  if (state.isInitialized) {
    setFirestoreReady(true);
  }
}, [state.isInitialized]);
```

- [ ] Update the empty-state guard to show loading spinner until Firestore is ready

Replace the `if (!hasLeads)` block (lines 505-533) with:

```typescript
  if (!firestoreReady) {
    return (
      <AppShell pageTitle="Leads">
        <div className="page-container flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <RefreshCw size={32} className="animate-spin" />
            <p className="text-sm">Loading leads...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!hasLeads) {
    return (
      <AppShell pageTitle="Leads">
        <div className="page-container flex items-center justify-center min-h-[70vh]">
          <Card className="max-w-md w-full text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Database size={40} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Leads Call Center</h2>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                No leads found in your workspace. Connect to Google Sheets to import leads from your "Results" tab.
                Once imported, all owners will see the same leads — no need to connect again.
              </p>
              <Button
                icon={ExternalLink}
                onClick={handleConnect}
                disabled={authInProgress}
                size="lg"
                className="mt-4"
              >
                {authInProgress ? 'Connecting...' : 'Connect Google Sheets & Import'}
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }
```

- [ ] Remove dead code — `leadsFromFirestore` alias

Replace:
```typescript
  const leadsFromFirestore = state.leads;
  const hasLeads = leadsFromFirestore.length > 0;
```
With:
```typescript
  const hasLeads = state.leads.length > 0;
```

Replace line 45 `const leads = leadsFromFirestore;` with:
```typescript
  const leads = state.leads;
```

- [ ] Update the `handleSaveOutcome` to also update `lastContactedAt` on the lead

In `handleSaveOutcome`, after dispatching `ADD_CALL_LOG`, add:
```typescript
      dispatch({
        type: 'UPDATE_LEAD_EMAIL',
        payload: { leadId: outcomeLead.id || outcomeLead.placeId || String(outcomeLead.rowIndex), lastContactedAt: new Date().toISOString() }
      });
```

- [ ] Build check

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: no errors

- [ ] Commit

```bash
git add src/pages/LeadsPage.tsx
git commit -m "fix(leads): add loading state, prevent flicker, remove dead code"
```

---

### Task 6: Self-Review — verify all changes work together

- [ ] Run TypeScript check on all changed files

Run: `npx tsc --noEmit --skipLibCheck 2>&1`
Expected: no errors

- [ ] Verify the full flow

Run lint if available:
```bash
npx eslint src/pages/LeadsPage.tsx src/components/leads/LeadCard.tsx src/lib/googleSheets.ts src/types/index.ts --max-warnings=0 2>&1 || true
```

- [ ] Commit any remaining fixes

```bash
git add -A
git commit -m "chore: final cleanup after leads intel implementation"
```
