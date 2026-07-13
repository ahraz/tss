// ============================================================
// GTA Scrub — Type Definitions
// ============================================================

import type { QuoteVersion } from './quote-version';

// --- Enums & Literal Types ---

export type UserRole = 'owner' | 'partner' | 'employee';

export type SiteType = 'clinic' | 'office' | 'plaza' | 'retail' | 'warehouse' | 'other';
export type SiteStatus = 'active' | 'paused' | 'cancelled';
export type CleaningFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export interface AvailabilitySlot {
  start: string;   // "09:00"
  end: string;     // "17:00"
  allDay?: boolean;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type ShiftStatus = 'active' | 'completed';

export type PaymentMethod = 'etransfer' | 'cheque' | 'cash' | 'other';

export type ExpenseCategory = 'supplies' | 'fuel' | 'equipment' | 'insurance' | 'phone' | 'other';

export type TaskPriority = 'low' | 'medium' | 'urgent';
export type TaskStatus = 'todo' | 'inprogress' | 'done';

export type PayPeriod = 'biweekly' | 'monthly';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

// --- Inventory ---
export type SupplyCategory = 'paper' | 'chemical' | 'plastic' | 'equipment' | 'safety' | 'other';
export type SupplyUnit = 'each' | 'roll' | 'bottle' | 'box' | 'case' | 'litre' | 'kg';

export interface SupplyItem {
  id: string;
  name: string;
  category: SupplyCategory;
  unit: SupplyUnit;
  /** Reorder when stock reaches this level */
  reorderAt: number;
  /** Default per-visit consumption estimate */
  perVisitUsage: number;
  notes?: string;
}

export interface SiteInventory {
  id: string;
  siteId: string;
  itemId: string;
  quantity: number;
  lastRestocked: string | null;
  notes?: string;
}

// --- Quality / Inspection ---
export type InspectionRating = 'pass' | 'pass_needs' | 'fail';

export interface InspectionItem {
  id: string;
  label: string;
  category: string;       // e.g. "Floors", "Washrooms", "Kitchen", "Dusting"
  order: number;
}

export interface InspectionResult {
  itemId: string;
  rating: InspectionRating;
  notes: string;
}

export interface Inspection {
  id: string;
  siteId: string;
  templateId: string;
  templateLabel: string;
  performedById: string;
  performedAt: string;
  items: InspectionResult[];
  /** Overall notes from the inspector */
  notes: string;
  /** Photo evidence stored in IndexedDB */
  photoIds: string[];
  /** Whether client signed off */
  clientSigned: boolean;
  clientSignedAt: string | null;
  signedByName: string | null;
  createdAt: string;
}

// --- Incident / Accident ---
export type IncidentSeverity = 'minor' | 'moderate' | 'major' | 'critical';

export interface IncidentReport {
  id: string;
  siteId: string;
  reportedById: string;
  occurredAt: string;
  severity: IncidentSeverity;
  description: string;
  /** What was the immediate action taken */
  actionTaken: string;
  /** Witness information */
  witnessName?: string;
  witnessPhone?: string;
  witnessStatement?: string;
  /** Photos stored in IndexedDB */
  photoIds: string[];
  /** Was medical attention required */
  medicalAttention: boolean;
  medicalDetails?: string;
  /** Was property damaged */
  propertyDamage: boolean;
  propertyDamageDetails?: string;
  /** Follow-up task ID (if created) */
  followUpTaskId?: string;
  status: 'open' | 'investigating' | 'resolved';
  resolvedAt: string | null;
  resolvedById: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

// --- Entity Interfaces ---

export interface Client {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  contactName: string;
  contactPhone: string;
  contractRate: number;
  frequency: CleaningFrequency;
  cleaningDays: DayOfWeek[];
  status: SiteStatus;
  notes: string;
  contractPdf?: string;
  contractSignature?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  avatarInitials: string;
  avatarColor: string;
  hourlyRate: number;
  // Contact
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  // Employment
  jobTitle?: string;
  hireDate?: string;
  employeeId?: string;
  sin?: string;             // Tax ID / SIN — sensitive, for payroll only
  bankingInfo?: string;     // Stored encrypted or as note; for direct deposit
  // Emergency contact
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  // Skills & certifications
  skills?: string[];        // e.g. ["High Dusting", "Carpet Cleaning", "Floor Buffing"]
  // Availability (day → time-slot, or absent = unavailable)
  availability?: Partial<Record<DayOfWeek, AvailabilitySlot>>;
  // Driver info
  driversLicense?: string;
  vehicleInfo?: string;
  // Languages
  languages?: string[];
  // Documents (key = label, value = photoStore key)
  documents?: Record<string, string>;
  // Uniform & equipment
  tshirtSize?: string;
  equipmentIssued?: string; // e.g. "Uniform x2, Safety vest, Mop bucket"
  // Management
  notes?: string;
  performanceRating?: number; // 1–5
  // Legacy: photo stored in IndexedDB (photoStore key) or Firebase Storage URL
  photoId?: string;
  // New: photo data URL stored directly in Firestore (cross-browser, no Storage needed)
  photoData?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  order: number;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  areaTags: string[];
  type: SiteType;
  contactName: string;
  contactPhone: string;
  contractRate: number;
  frequency: CleaningFrequency;
  cleaningDays: DayOfWeek[];
  scheduleStart: string;  // HH:mm format, e.g. "17:00"
  scheduleEnd: string;    // HH:mm format, e.g. "19:00"
  assignedUserIds: string[];
  accessNotes: string;
  status: SiteStatus;
  checklist: ChecklistItem[];
  clientId: string | null;
  isSubSite: boolean;
  createdAt: string;
}

export interface ChecklistCompletion {
  itemId: string;
  completed: boolean;
}

export interface Shift {
  id: string;
  userId: string;
  siteId: string;
  clockInTime: string;
  clockInPhotoDataUrl: string;
  clockOutTime: string | null;
  clockOutPhotoDataUrl: string | null;
  durationMinutes: number | null;
  checklistCompletions: ChecklistCompletion[];
  notes: string;
  status: ShiftStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  siteId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  forPeriod: string;
  isPaid: boolean;
  notes: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  siteId: string | null;
  receiptPhotoDataUrl: string | null;
  notes: string;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  hoursWorked: number;
  hourlyRate: number;
  grossAmount: number;
  status: 'calculated' | 'approved' | 'paid';
  isPaid: boolean;
  paidDate: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  payPeriodLabel: string;
  shiftIds: string[];
  notes: string;
  createdAt: string;
}

export type PayrollStatus = 'calculated' | 'approved' | 'paid';

export interface QuoteLineItem {
  id: string;
  description: string;
  siteId: string | null;
  frequency: CleaningFrequency;
  amountPerVisit: number;
  visitsPerWeek: number;
  monthlyAmount: number;
}

export interface Quote {
  id: string;
  clientId: string | null;
  prospectName: string;
  prospectAddress: string;
  prospectCity: string;
  prospectProvince: string;
  prospectPostalCode: string;
  prospectPhone: string;
  lineItems: QuoteLineItem[];
  totalMonthly: number;
  status: QuoteStatus;
  validUntil: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentVersion?: number;
  versions?: QuoteVersion[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedUserId: string | null;
  siteId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  isRecurring: boolean;
  recurringFrequency: CleaningFrequency | null;
  completedAt: string | null;
  completedNote?: string;     // Note about how the task was completed
  createdAt: string;
}

// --- Facility Type ---
export type FacilityType =
  | 'medical_clinic'
  | 'dental_clinic'
  | 'office'
  | 'retail'
  | 'pharmacy'
  | 'warehouse'
  | 'restaurant'
  | 'other';

export const FACILITY_LABELS: Record<FacilityType, string> = {
  medical_clinic: 'Medical Clinic',
  dental_clinic: 'Dental Clinic',
  office: 'Office',
  retail: 'Retail',
  pharmacy: 'Pharmacy',
  warehouse: 'Warehouse',
  restaurant: 'Restaurant',
  other: 'Other',
};

// --- Template-driven pricing ---

/** A line item specific to a business type (e.g. "Patient Rooms", "Offices", "Dining Area") */
export interface TemplateLineItem {
  id: string;
  label: string;
  ratePerUnit: number;
  defaultQty: number;
  included: boolean;
}

/** A flat-rate add-on service */
export interface TemplateAddon {
  id: string;
  label: string;
  price: number;
}

/**
 * Estimation template tied to a business type.
 * Each business type defines its own set of line items.
 */
export interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  facilityType: FacilityType;
  /** Base rate charged per square foot (multiplied by frequency multiplier) */
  baseRatePerSqft: number;
  /** Default sq ft pre-filled in the estimator */
  defaultSqft: number;
  /** Default visits per week */
  defaultDays: number;
  /** Frequency multipliers keyed by visits/week. 6×/week = 1.0 baseline */
  frequencyMultipliers: Record<number, number>;
  /** Line items specific to this business type */
  lineItems: TemplateLineItem[];
  /** Flat-rate add-on services */
  addons: TemplateAddon[];
  createdAt: string;
}

/** Default line items for each business type */
const DEFAULT_LINE_ITEMS: Record<FacilityType, Omit<TemplateLineItem, 'id'>[]> = {
  medical_clinic: [
    { label: 'Patient / Treatment Rooms', ratePerUnit: 40, defaultQty: 7, included: true },
    { label: 'Washrooms', ratePerUnit: 50, defaultQty: 2, included: true },
    { label: 'Reception Area', ratePerUnit: 55, defaultQty: 1, included: true },
  ],
  dental_clinic: [
    { label: 'Treatment Rooms', ratePerUnit: 40, defaultQty: 5, included: true },
    { label: 'Washrooms', ratePerUnit: 50, defaultQty: 2, included: true },
    { label: 'Reception / Waiting', ratePerUnit: 55, defaultQty: 1, included: true },
    { label: 'X-Ray / Lab', ratePerUnit: 25, defaultQty: 1, included: false },
  ],
  office: [
    { label: 'Private Offices', ratePerUnit: 35, defaultQty: 6, included: true },
    { label: 'Conference Rooms', ratePerUnit: 45, defaultQty: 2, included: true },
    { label: 'Breakroom', ratePerUnit: 30, defaultQty: 1, included: true },
    { label: 'Washrooms', ratePerUnit: 50, defaultQty: 2, included: true },
    { label: 'Reception', ratePerUnit: 55, defaultQty: 1, included: true },
  ],
  retail: [
    { label: 'Sales Floor', ratePerUnit: 40, defaultQty: 1, included: true },
    { label: 'Fitting Rooms', ratePerUnit: 20, defaultQty: 4, included: true },
    { label: 'Washrooms', ratePerUnit: 50, defaultQty: 1, included: true },
    { label: 'Stock / Backroom', ratePerUnit: 30, defaultQty: 1, included: false },
  ],
  pharmacy: [
    { label: 'Retail Floor', ratePerUnit: 35, defaultQty: 1, included: true },
    { label: 'Consult Rooms', ratePerUnit: 30, defaultQty: 2, included: true },
    { label: 'Washrooms', ratePerUnit: 50, defaultQty: 1, included: true },
    { label: 'Back Office', ratePerUnit: 25, defaultQty: 1, included: false },
  ],
  warehouse: [
    { label: 'Warehouse Floor', ratePerUnit: 50, defaultQty: 1, included: true },
    { label: 'Offices', ratePerUnit: 35, defaultQty: 2, included: true },
    { label: 'Breakroom', ratePerUnit: 30, defaultQty: 1, included: true },
    { label: 'Washrooms', ratePerUnit: 50, defaultQty: 2, included: true },
    { label: 'Loading Bay', ratePerUnit: 40, defaultQty: 1, included: false },
  ],
  restaurant: [
    { label: 'Dining Area', ratePerUnit: 45, defaultQty: 1, included: true },
    { label: 'Kitchen', ratePerUnit: 65, defaultQty: 1, included: true },
    { label: 'Washrooms', ratePerUnit: 50, defaultQty: 2, included: true },
    { label: 'Bar Area', ratePerUnit: 35, defaultQty: 1, included: false },
    { label: 'Storage / Walk-in', ratePerUnit: 25, defaultQty: 1, included: false },
  ],
  other: [
    { label: 'Rooms', ratePerUnit: 35, defaultQty: 3, included: true },
    { label: 'Washrooms', ratePerUnit: 50, defaultQty: 2, included: true },
    { label: 'Breakroom', ratePerUnit: 30, defaultQty: 1, included: false },
  ],
};

/** Default add-ons available for all templates */
const DEFAULT_TEMPLATE_ADDONS: TemplateAddon[] = [
  { id: 'breakroom', label: 'Breakroom / Kitchen', price: 40 },
  { id: 'windows', label: 'Monthly Window Clean', price: 80 },
  { id: 'deepclean', label: 'Monthly Deep Clean', price: 120 },
];

let _itemIdCounter = 0;
function itemId(): string {
  _itemIdCounter++;
  return `li-${_itemIdCounter}-${Date.now()}`;
}

/** Generate a default template for a given facility type */
export function createTemplateForFacility(ft: FacilityType, name?: string): Omit<QuoteTemplate, 'id'> & { id?: string } {
  const baseRate: Record<FacilityType, number> = {
    medical_clinic: 0.40, dental_clinic: 0.42, office: 0.30, retail: 0.28,
    pharmacy: 0.35, warehouse: 0.20, restaurant: 0.45, other: 0.30,
  };
  return {
    id: '',
    name: name || FACILITY_LABELS[ft],
    description: `${name || FACILITY_LABELS[ft]} — cleaning estimate`,
    facilityType: ft,
    baseRatePerSqft: baseRate[ft],
    defaultSqft: 1500,
    defaultDays: 6,
    frequencyMultipliers: { 1: 0.25, 2: 0.42, 3: 0.58, 4: 0.72, 5: 0.87, 6: 1.0, 7: 1.13 },
    lineItems: DEFAULT_LINE_ITEMS[ft].map(d => ({ ...d, id: itemId() })),
    addons: DEFAULT_TEMPLATE_ADDONS.map(a => ({ ...a })),
    createdAt: new Date().toISOString(),
  };
}

/** Seed data: one default template per business type (used on first load) */
export function getDefaultTemplates(): Omit<QuoteTemplate, 'id'>[] {
  return (Object.keys(FACILITY_LABELS) as FacilityType[]).map(ft =>
    createTemplateForFacility(ft)
  );
}

export interface AppSettings {
  businessName: string;
  ownerName: string;
  currency: string;
  payPeriod: PayPeriod;
  dataVersion: number;
  seeded?: boolean;
}

// --- Leads / Call Tracking ---

export type CallOutcome = 'completed' | 'no_answer' | 'wrong_number' | 'callback';

export interface Lead {
  /** Firestore document ID (automatically added by docToObj helper) */
  id?: string;
  rowIndex: number;        // 1-based row in sheet (for write-back)
  type: string;
  phone: string;
  businessName: string;    // title
  types: string;
  rating: string;
  address: string;
  reviews: string;
  website: string;
  placeId: string;
  gpsCoordinates: string;
  email?: string;          // user-added email for outreach
  // Computed / derived
  latestCall?: CallLogEntry | null;
}

export interface CallLogEntry {
  id: string;
  leadId: string;           // = placeId (unique identifier for the lead)
  businessName: string;
  phone: string;
  sheetRowIndex: number;    // for writing back to sheet
  calledById: string;
  calledByName: string;
  calledAt: string;         // ISO timestamp
  outcome: CallOutcome;
  notes: string;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  leadId: string;
  businessName: string;
  email: string;
  sheetRowIndex: number;
  sentById: string;
  sentByName: string;
  sentAt: string;           // ISO timestamp
  createdAt: string;
}

export interface Session {
  userId: string;
  loggedInAt: string;
}

// --- App State ---

export interface AppState {
  users: User[];
  sites: Site[];
  shifts: Shift[];
  payments: Payment[];
  expenses: Expense[];
  payroll: PayrollRecord[];
  tasks: Task[];
  clients: Client[];
  quotes: Quote[];
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  session: Session | null;
  isInitialized: boolean;
  // New feature stores
  supplyItems: SupplyItem[];
  siteInventory: SiteInventory[];
  inspections: Inspection[];
  inspectionTemplates: InspectionItem[];
  incidentReports: IncidentReport[];
  callLogs: CallLogEntry[];
  emailLogs: EmailLog[];
  leads: Lead[];
  sharedContracts: SharedContract[];
}

// --- Action Types ---

export type AppAction =
  // Session
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'LOGOUT' }
  // Initialize
  | { type: 'INITIALIZE'; payload: Partial<Omit<AppState, 'isInitialized'>> }
  // Real-time Sync Bulk Setters
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_SITES'; payload: Site[] }
  | { type: 'SET_SHIFTS'; payload: Shift[] }
  | { type: 'SET_PAYMENTS'; payload: Payment[] }
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'SET_PAYROLL'; payload: PayrollRecord[] }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  // Users
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'DELETE_USER'; payload: string }
  // Sites
  | { type: 'ADD_SITE'; payload: Site }
  | { type: 'UPDATE_SITE'; payload: Site }
  | { type: 'DELETE_SITE'; payload: string }
  // Shifts
  | { type: 'ADD_SHIFT'; payload: Shift }
  | { type: 'UPDATE_SHIFT'; payload: Shift }
  | { type: 'DELETE_SHIFT'; payload: string }
  // Payments
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'UPDATE_PAYMENT'; payload: Payment }
  | { type: 'DELETE_PAYMENT'; payload: string }
  // Expenses
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  // Payroll
  | { type: 'ADD_PAYROLL'; payload: PayrollRecord }
  | { type: 'UPDATE_PAYROLL'; payload: PayrollRecord }
  | { type: 'DELETE_PAYROLL'; payload: string }
  // Tasks
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  // Clients
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  // Quotes
  | { type: 'SET_QUOTES'; payload: Quote[] }
  | { type: 'ADD_QUOTE'; payload: Quote }
  | { type: 'UPDATE_QUOTE'; payload: Quote }
  | { type: 'DELETE_QUOTE'; payload: string }
  // Settings
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  // Inventory
  | { type: 'SET_SUPPLY_ITEMS'; payload: SupplyItem[] }
  | { type: 'ADD_SUPPLY_ITEM'; payload: SupplyItem }
  | { type: 'UPDATE_SUPPLY_ITEM'; payload: SupplyItem }
  | { type: 'DELETE_SUPPLY_ITEM'; payload: string }
  | { type: 'SET_SITE_INVENTORY'; payload: SiteInventory[] }
  | { type: 'ADD_SITE_INVENTORY'; payload: SiteInventory }
  | { type: 'UPDATE_SITE_INVENTORY'; payload: SiteInventory }
  | { type: 'DELETE_SITE_INVENTORY'; payload: string }
  // Inspections
  | { type: 'SET_INSPECTIONS'; payload: Inspection[] }
  | { type: 'ADD_INSPECTION'; payload: Inspection }
  | { type: 'UPDATE_INSPECTION'; payload: Inspection }
  | { type: 'DELETE_INSPECTION'; payload: string }
  | { type: 'SET_INSPECTION_TEMPLATES'; payload: InspectionItem[] }
  | { type: 'ADD_INSPECTION_TEMPLATE'; payload: InspectionItem }
  | { type: 'DELETE_INSPECTION_TEMPLATE'; payload: string }
  // Incidents
  | { type: 'SET_INCIDENT_REPORTS'; payload: IncidentReport[] }
  | { type: 'ADD_INCIDENT_REPORT'; payload: IncidentReport }
  | { type: 'UPDATE_INCIDENT_REPORT'; payload: IncidentReport }
  | { type: 'DELETE_INCIDENT_REPORT'; payload: string }
  // Call Logs
  | { type: 'SET_CALL_LOGS'; payload: CallLogEntry[] }
  | { type: 'ADD_CALL_LOG'; payload: CallLogEntry }
  | { type: 'UPDATE_CALL_LOG'; payload: CallLogEntry }
  // Email Logs
  | { type: 'SET_EMAIL_LOGS'; payload: EmailLog[] }
  | { type: 'ADD_EMAIL_LOG'; payload: EmailLog }
  // Leads (from Google Sheets, synced to Firestore)
  | { type: 'SET_LEADS'; payload: Lead[] }
  | { type: 'UPDATE_LEAD_EMAIL'; payload: { leadId: string; email: string } }
  // Quote Templates
  | { type: 'SET_QUOTE_TEMPLATES'; payload: QuoteTemplate[] }
  | { type: 'ADD_QUOTE_TEMPLATE'; payload: QuoteTemplate }
  | { type: 'DELETE_QUOTE_TEMPLATE'; payload: string }
  // Shared Contracts
  | { type: 'SET_SHARED_CONTRACTS'; payload: SharedContract[] }
  | { type: 'ADD_SHARED_CONTRACT'; payload: SharedContract }
  | { type: 'UPDATE_SHARED_CONTRACT'; payload: Partial<SharedContract> & { id: string } }
  // Data Management
  | { type: 'IMPORT_DATA'; payload: Omit<AppState, 'isInitialized' | 'session'> }
  | { type: 'CLEAR_ALL_DATA' };

export type { QuoteVersion } from './quote-version';
export { createVersion, addVersionToQuote } from './quote-version';
import type { SharedContract } from './sharedContract';
export type { SharedContract } from './sharedContract';
export { generateShareToken } from './sharedContract';
