# TSS Cleaners — Data Model & Database Reference

Last updated: 2026-06-20

## Database Location

**Firebase Project:** `tssc-4d214`
**Firestore Database:** (default) — `https://tssc-4d214.firebaseio.com`
**Auth Provider:** Firebase Auth (anonymous)
**Console URL:** https://console.firebase.google.com/project/tssc-4d214/firestore

Firebase config (`src/lib/firebase.ts`):
- Project ID: `tssc-4d214`
- Storage bucket: `tssc-4d214.firebasestorage.app`
- API Key: `AIzaSyClhLy1NtGRGCk70-6XcECbkzT86DgEao0`

> **⚠️ Note:** Firebase Storage bucket exists but is NOT used. All file uploads (photos, documents) are stored as **base64 data URLs directly in Firestore documents**.

## Firestore Collections → TypeScript Types

| # | Collection Name | TypeScript Type | Source File | Sync Listener |
|---|----------------|-----------------|-------------|---------------|
| 1 | `users` | `User` | types/index.ts:144 | ✅ |
| 2 | `sites` | `Site` | types/index.ts:198 | ✅ |
| 3 | `shifts` | `Shift` | types/index.ts:228 | ✅ |
| 4 | `payments` | `Payment` | types/index.ts:243 | ✅ |
| 5 | `expenses` | `Expense` | types/index.ts:255 | ✅ |
| 6 | `payroll` | `PayrollRecord` | types/index.ts:267 | ✅ |
| 7 | `tasks` | `Task` | types/index.ts:317 | ✅ |
| 8 | `clients` | `Client` | types/index.ts:127 | ✅ |
| 9 | `quotes` | `Quote` | types/index.ts:298 | ✅ |
| 10 | `supplyItems` | `SupplyItem` | types/index.ts:36 | ✅ |
| 11 | `siteInventory` | `SiteInventory` | types/index.ts:48 | ✅ |
| 12 | `inspections` | `Inspection` | types/index.ts:73 | ✅ |
| 13 | `inspectionTemplates` | `InspectionItem` | types/index.ts:60 | ✅ |
| 14 | `incidentReports` | `IncidentReport` | types/index.ts:95 | ✅ |
| 15 | `callLogs` | `CallLogEntry` | types/index.ts:362 | ✅ |
| 16 | `leads` | `Lead` | types/index.ts:344 | ✅ |
| 17 | `settings` (single doc) | `AppSettings` | types/index.ts:332 | ✅ (doc listener on `settings/current`) |

**Total: 16 collections + 1 singleton document**

## Detailed Collection Schemas

### 1. `users`
```typescript
{
  id: string,                    // e.g. "user-owner-001"
  name: string,                  // "Ahraz Malik"
  role: 'owner' | 'partner' | 'employee',
  pin: string,                   // 4-digit PIN for login
  avatarInitials: string,
  avatarColor: string,
  hourlyRate: number,
  isActive: boolean,
  createdAt: string,             // ISO date
  // Optional fields:
  phone?: string,
  email?: string,
  address?: string,
  dateOfBirth?: string,
  jobTitle?: string,
  hireDate?: string,
  employeeId?: string,
  sin?: string,                  // Sensitive — for payroll
  bankingInfo?: string,
  emergencyName?: string,
  emergencyPhone?: string,
  emergencyRelation?: string,
  skills?: string[],
  availability?: Record<DayOfWeek, { start: string, end: string, allDay?: boolean }>,
  driversLicense?: string,
  vehicleInfo?: string,
  languages?: string[],
  documents?: Record<string, string>,  // label → data URL
  tshirtSize?: string,
  equipmentIssued?: string,
  notes?: string,
  performanceRating?: number,    // 1–5 (owner-set only)
  photoId?: string,              // Legacy IndexedDB key
  photoData?: string             // Current: base64 data URL
}
```

### 2. `sites`
```typescript
{
  id: string,
  name: string,
  address: string,
  city: string,
  province: string,
  postalCode: string,
  areaTags: string[],
  type: 'clinic' | 'office' | 'plaza' | 'retail' | 'warehouse' | 'other',
  contactName: string,
  contactPhone: string,
  contractRate: number,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly',
  cleaningDays: DayOfWeek[],
  scheduleStart: string,         // "17:00"
  scheduleEnd: string,           // "19:00"
  assignedUserIds: string[],
  accessNotes: string,
  status: 'active' | 'paused' | 'cancelled',
  checklist: { id, label, order }[],
  clientId: string | null,
  isSubSite: boolean,
  createdAt: string
}
```

### 3. `shifts`
```typescript
{
  id: string,
  userId: string,
  siteId: string,
  clockInTime: string,
  clockInPhotoDataUrl: string,   // base64
  clockOutTime: string | null,
  clockOutPhotoDataUrl: string | null,
  durationMinutes: number | null,
  checklistCompletions: { itemId, completed }[],
  notes: string,
  status: 'active' | 'completed',
  createdAt: string
}
```

### 4. `payments`
```typescript
{
  id: string,
  siteId: string,
  amount: number,
  date: string,
  method: 'etransfer' | 'cheque' | 'cash' | 'other',
  forPeriod: string,
  isPaid: boolean,
  notes: string,
  createdAt: string
}
```

### 5. `expenses`
```typescript
{
  id: string,
  description: string,
  amount: number,
  category: 'supplies' | 'fuel' | 'equipment' | 'insurance' | 'phone' | 'other',
  date: string,
  siteId: string | null,
  receiptPhotoDataUrl: string | null,  // base64
  notes: string,
  createdAt: string
}
```

### 6. `payroll`
```typescript
{
  id: string,
  userId: string,
  periodStart: string,
  periodEnd: string,
  hoursWorked: number,
  hourlyRate: number,
  grossAmount: number,
  status: 'calculated' | 'approved' | 'paid',
  isPaid: boolean,
  paidDate: string | null,
  approvedAt: string | null,
  approvedById: string | null,
  payPeriodLabel: string,
  shiftIds: string[],
  notes: string,
  createdAt: string
}
```

### 7. `tasks`
```typescript
{
  id: string,
  title: string,
  description: string,
  assignedUserId: string | null,
  siteId: string | null,
  priority: 'low' | 'medium' | 'urgent',
  status: 'todo' | 'inprogress' | 'done',
  dueDate: string | null,
  isRecurring: boolean,
  recurringFrequency: CleaningFrequency | null,
  completedAt: string | null,
  createdAt: string
}
```

### 8. `clients`
```typescript
{
  id: string,
  name: string,
  address: string,
  city: string,
  province: string,
  postalCode: string,
  contactName: string,
  contactPhone: string,
  contractRate: number,
  frequency: CleaningFrequency,
  cleaningDays: DayOfWeek[],
  status: SiteStatus,
  notes: string,
  createdAt: string
}
```

### 9. `quotes`
```typescript
{
  id: string,
  clientId: string | null,
  prospectName: string,
  prospectAddress: string,
  prospectCity: string,
  prospectProvince: string,
  prospectPostalCode: string,
  prospectPhone: string,
  lineItems: QuoteLineItem[],
  totalMonthly: number,
  status: 'draft' | 'sent' | 'accepted' | 'rejected',
  validUntil: string,
  notes: string,
  createdBy: string,
  createdAt: string,
  updatedAt: string
}
```

### 10. `supplyItems`
```typescript
{
  id: string,
  name: string,
  category: 'paper' | 'chemical' | 'plastic' | 'equipment' | 'safety' | 'other',
  unit: 'each' | 'roll' | 'bottle' | 'box' | 'case' | 'litre' | 'kg',
  reorderAt: number,
  perVisitUsage: number,
  notes?: string
}
```

### 11. `siteInventory`
```typescript
{
  id: string,
  siteId: string,
  itemId: string,
  quantity: number,
  lastRestocked: string | null,
  notes?: string
}
```

### 12. `inspections`
```typescript
{
  id: string,
  siteId: string,
  templateId: string,
  templateLabel: string,
  performedById: string,
  performedAt: string,
  items: { itemId, rating, notes }[],
  notes: string,
  photoIds: string[],
  clientSigned: boolean,
  clientSignedAt: string | null,
  signedByName: string | null,
  createdAt: string
}
```

### 13. `inspectionTemplates`
```typescript
{
  id: string,
  label: string,
  category: string,
  order: number
}
```

### 14. `incidentReports`
```typescript
{
  id: string,
  siteId: string,
  reportedById: string,
  occurredAt: string,
  severity: 'minor' | 'moderate' | 'major' | 'critical',
  description: string,
  actionTaken: string,
  witnessName?: string,
  witnessPhone?: string,
  witnessStatement?: string,
  photoIds: string[],
  medicalAttention: boolean,
  medicalDetails?: string,
  propertyDamage: boolean,
  propertyDamageDetails?: string,
  followUpTaskId?: string,
  status: 'open' | 'investigating' | 'resolved',
  resolvedAt: string | null,
  resolvedById: string | null,
  resolutionNotes: string | null,
  createdAt: string
}
```

### 15. `callLogs`
```typescript
{
  id: string,
  leadId: string,
  businessName: string,
  phone: string,
  sheetRowIndex: number,
  calledById: string,
  calledByName: string,
  calledAt: string,
  outcome: 'completed' | 'no_answer' | 'wrong_number' | 'callback',
  notes: string,
  createdAt: string
}
```

### 16. `leads`
```typescript
{
  id?: string,                   // Auto-generated by docToObj
  rowIndex: number,
  type: string,
  phone: string,
  businessName: string,
  types: string,
  rating: string,
  address: string,
  reviews: string,
  website: string,
  placeId: string,
  gpsCoordinates: string,
  latestCall?: CallLogEntry | null
}
```

### 17. `settings/current` (singleton)
```typescript
{
  businessName: string,
  ownerName: string,
  currency: string,
  payPeriod: 'biweekly' | 'monthly',
  dataVersion: number
}
```

## Google Sheets Integration (Leads Only)

- **Spreadsheet ID:** `1-0wOhrEFX5EkiajX0gtNFsVSDCaPObt8rD94kQoK6XA`
- **Sheet Tab:** `Results`
- **OAuth Client ID:** `1065566722892-0qq7pm931g6cnd4l2e5emtigt4r0jqr3.apps.googleusercontent.com`
- **Flow:** Leads are imported from Google Sheets → stored in Firestore `leads` collection → call outcomes written back to the sheet

## Alignment Check: Frontend Types ↔ Database

**✅ All 16 Firestore collections have corresponding TypeScript interfaces.**
**✅ All collections have real-time `onSnapshot` listeners that dispatch SET_* actions.**
**✅ Reducer handles all SET_*/ADD_*/UPDATE_*/DELETE_* actions with proper state transitions.**
**✅ `syncActionToFirestore()` handles every mutating action and writes to the correct collection.**

### Known Gaps / Issues

| Issue | Details |
|-------|---------|
| `setDoc` without `merge: true` | ADD/UPDATE handlers overwrite entire documents instead of merging. Risk of data loss if concurrent writes occur. |
| No field-level validation | Firestore rules only check `request.auth != null`. No schema enforcement. |
| `inspectionTemplates` uses `InspectionItem` type | The collection stores individual template items, not full template documents. Type name is misleading. |
| `leads` imported from Sheets → Firestore | Import uses batch delete-then-recreate (not merge). Could lose call log associations if re-imported. |
