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
  phone?: string;
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
  isPaid: boolean;
  paidDate: string | null;
  notes: string;
  createdAt: string;
}

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
}

// --- Action Types ---

export type AppAction =
  // Session
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'LOGOUT' }
  // Initialize
  | { type: 'INITIALIZE'; payload: Omit<AppState, 'isInitialized'> }
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
  // Data Management
  | { type: 'IMPORT_DATA'; payload: Omit<AppState, 'isInitialized' | 'session'> }
  | { type: 'CLEAR_ALL_DATA' };
