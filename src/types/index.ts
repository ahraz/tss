// ============================================================
// TSS Cleaners — Type Definitions
// ============================================================

// --- Enums & Literal Types ---

export type UserRole = 'owner' | 'partner' | 'employee';

export type SiteType = 'clinic' | 'office' | 'plaza' | 'retail' | 'warehouse' | 'other';
export type SiteStatus = 'active' | 'paused' | 'cancelled';
export type CleaningFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
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
  // Availability (day → "morning" | "afternoon" | "evening" | "unavailable")
  availability?: Partial<Record<DayOfWeek, 'morning' | 'afternoon' | 'evening' | 'unavailable'>>;
  // Documents (key = label, value = photoStore key)
  documents?: Record<string, string>;
  // Uniform & equipment
  tshirtSize?: string;
  equipmentIssued?: string; // e.g. "Uniform x2, Safety vest, Mop bucket"
  // Management
  notes?: string;
  performanceRating?: number; // 1–5
  // Photo stored in IndexedDB (photoStore key)
  photoId?: string;
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
  createdAt: string;
}

export interface AppSettings {
  businessName: string;
  ownerName: string;
  currency: string;
  payPeriod: PayPeriod;
  dataVersion: number;
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
  settings: AppSettings;
  session: Session | null;
  isInitialized: boolean;
  // New feature stores
  supplyItems: SupplyItem[];
  siteInventory: SiteInventory[];
  inspections: Inspection[];
  inspectionTemplates: InspectionItem[];
  incidentReports: IncidentReport[];
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
  | { type: 'UPDATE_USER'; payload: User }
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
  // Data Management
  | { type: 'IMPORT_DATA'; payload: Omit<AppState, 'isInitialized' | 'session'> }
  | { type: 'CLEAR_ALL_DATA' };
