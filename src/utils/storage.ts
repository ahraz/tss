// ============================================================
// TSS Cleaners — localStorage Utilities
// ============================================================

import type {
  User, Site, Shift, Payment, Expense, PayrollRecord, Task, AppSettings, Session
} from '../types';

// --- Storage Keys ---
const KEYS = {
  users: 'cleanops_users',
  sites: 'cleanops_sites',
  shifts: 'cleanops_shifts',
  payments: 'cleanops_payments',
  expenses: 'cleanops_expenses',
  payroll: 'cleanops_payroll',
  tasks: 'cleanops_tasks',
  settings: 'cleanops_settings',
  session: 'cleanops_session',
} as const;

// --- Generic Read/Write ---

export function getData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    console.error(`Failed to read key "${key}" from localStorage`);
    return null;
  }
}

export function setData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded! Consider clearing old photo data.');
      throw new Error('Storage quota exceeded. Please clear old data in Settings.');
    }
    throw e;
  }
}

// --- Typed Getters/Setters ---

export const getUsers = () => getData<User[]>(KEYS.users) ?? [];
export const setUsers = (v: User[]) => setData(KEYS.users, v);

export const getSites = () => getData<Site[]>(KEYS.sites) ?? [];
export const setSites = (v: Site[]) => setData(KEYS.sites, v);

export const getShifts = () => getData<Shift[]>(KEYS.shifts) ?? [];
export const setShifts = (v: Shift[]) => setData(KEYS.shifts, v);

export const getPayments = () => getData<Payment[]>(KEYS.payments) ?? [];
export const setPayments = (v: Payment[]) => setData(KEYS.payments, v);

export const getExpenses = () => getData<Expense[]>(KEYS.expenses) ?? [];
export const setExpenses = (v: Expense[]) => setData(KEYS.expenses, v);

export const getPayroll = () => getData<PayrollRecord[]>(KEYS.payroll) ?? [];
export const setPayroll = (v: PayrollRecord[]) => setData(KEYS.payroll, v);

export const getTasks = () => getData<Task[]>(KEYS.tasks) ?? [];
export const setTasks = (v: Task[]) => setData(KEYS.tasks, v);

export const getSettings = () => getData<AppSettings>(KEYS.settings);
export const setSettings = (v: AppSettings) => setData(KEYS.settings, v);

export const getSession = () => getData<Session>(KEYS.session);
export const setSession = (v: Session | null) => {
  if (v === null) localStorage.removeItem(KEYS.session);
  else setData(KEYS.session, v);
};

// --- Storage Size ---

export function getStorageUsage(): { usedBytes: number; usedMB: string; isNearLimit: boolean } {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += (localStorage.getItem(key) || '').length * 2; // UTF-16 = 2 bytes per char
    }
  }
  return {
    usedBytes: total,
    usedMB: (total / (1024 * 1024)).toFixed(2),
    isNearLimit: total > 4 * 1024 * 1024, // warn at 4MB
  };
}

// --- Photo Cleanup ---

export function clearOldPhotos(days: number = 30): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString();
  let cleared = 0;

  const shifts = getShifts();
  const updated = shifts.map(s => {
    if (s.createdAt < cutoffISO) {
      if (s.clockInPhotoDataUrl) { cleared++; }
      if (s.clockOutPhotoDataUrl) { cleared++; }
      return {
        ...s,
        clockInPhotoDataUrl: '',
        clockOutPhotoDataUrl: s.clockOutPhotoDataUrl ? '' : null,
      };
    }
    return s;
  });
  if (cleared > 0) setShifts(updated);

  const expenses = getExpenses();
  const updatedExpenses = expenses.map(e => {
    if (e.createdAt < cutoffISO && e.receiptPhotoDataUrl) {
      cleared++;
      return { ...e, receiptPhotoDataUrl: null };
    }
    return e;
  });
  if (cleared > 0) setExpenses(updatedExpenses);

  return cleared;
}

// --- Export / Import ---

export function exportAllData(): string {
  const data: Record<string, unknown> = {};
  Object.entries(KEYS).forEach(([, key]) => {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      data[key] = JSON.parse(raw);
    }
  });
  return JSON.stringify(data, null, 2);
}

export function importAllData(json: string): void {
  const data = JSON.parse(json) as Record<string, unknown>;
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
}

export function clearAllData(): void {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// --- Generate UUID ---

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// --- Seed Data ---

export function initializeStorage(): void {
  // Only seed if no users exist yet
  if (getData<User[]>(KEYS.users) !== null) return;

  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: 'user-owner-001',
      name: 'Ahraz Malik',
      role: 'owner',
      pin: '1234',
      avatarInitials: 'AM',
      avatarColor: 'bg-blue-600',
      hourlyRate: 0,
      isActive: true,
      createdAt: now,
    },
    {
      id: 'user-partner-001',
      name: 'Harpreet Kaur',
      role: 'partner',
      pin: '2345',
      avatarInitials: 'HK',
      avatarColor: 'bg-purple-600',
      hourlyRate: 0,
      isActive: true,
      createdAt: now,
    },
    {
      id: 'user-employee-001',
      name: 'Mandeep Gill',
      role: 'employee',
      pin: '3456',
      avatarInitials: 'MG',
      avatarColor: 'bg-green-600',
      hourlyRate: 18.50,
      isActive: true,
      createdAt: now,
    },
  ];

  const sites: Site[] = [
    {
      id: 'site-001',
      name: 'Brampton Medical Clinic',
      address: '123 Queen St W',
      city: 'Brampton',
      province: 'ON',
      postalCode: 'L6X 1A1',
      type: 'clinic',
      contactName: 'Dr. Patel',
      contactPhone: '905-555-0101',
      contractRate: 280,
      frequency: 'weekly',
      cleaningDays: ['monday', 'thursday'],
      assignedUserIds: ['user-employee-001'],
      accessNotes: 'Key code: 4521. Park at rear. Do not enter exam rooms.',
      status: 'active',
      checklist: [
        { id: 'cl-001', label: 'Vacuum all floors', order: 1 },
        { id: 'cl-002', label: 'Mop tile floors', order: 2 },
        { id: 'cl-003', label: 'Clean and sanitize washrooms', order: 3 },
        { id: 'cl-004', label: 'Empty all trash bins', order: 4 },
        { id: 'cl-005', label: 'Wipe reception desk', order: 5 },
        { id: 'cl-006', label: 'Clean glass doors', order: 6 },
      ],
      createdAt: now,
    },
    {
      id: 'site-002',
      name: 'Gateway Plaza Office',
      address: '456 Bovaird Dr E, Unit 7',
      city: 'Brampton',
      province: 'ON',
      postalCode: 'L6Z 2N8',
      type: 'office',
      contactName: 'Sandra Mills',
      contactPhone: '905-555-0202',
      contractRate: 180,
      frequency: 'biweekly',
      cleaningDays: ['wednesday'],
      assignedUserIds: ['user-employee-001', 'user-partner-001'],
      accessNotes: 'Buzz unit 7. Sandra leaves key under mat after 5pm.',
      status: 'active',
      checklist: [
        { id: 'cl-007', label: 'Vacuum carpets', order: 1 },
        { id: 'cl-008', label: 'Wipe all desks', order: 2 },
        { id: 'cl-009', label: 'Clean kitchen area', order: 3 },
        { id: 'cl-010', label: 'Empty trash', order: 4 },
      ],
      createdAt: now,
    },
    {
      id: 'site-003',
      name: 'Heartland Dental',
      address: '789 Sandalwood Pkwy W',
      city: 'Brampton',
      province: 'ON',
      postalCode: 'L7A 1A9',
      type: 'clinic',
      contactName: 'Dr. Wong',
      contactPhone: '905-555-0303',
      contractRate: 320,
      frequency: 'weekly',
      cleaningDays: ['tuesday', 'friday'],
      assignedUserIds: ['user-employee-001'],
      accessNotes: 'After-hours cleaning only. Alarm code 7823.',
      status: 'active',
      checklist: [
        { id: 'cl-011', label: 'Sanitize all surfaces', order: 1 },
        { id: 'cl-012', label: 'Mop entire floor', order: 2 },
        { id: 'cl-013', label: 'Clean washrooms', order: 3 },
        { id: 'cl-014', label: 'Wipe waiting room chairs', order: 4 },
        { id: 'cl-015', label: 'Empty trash and replace liners', order: 5 },
      ],
      createdAt: now,
    },
  ];

  // Seed some sample shifts from the past week
  const daysAgo = (d: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    return dt;
  };

  const shifts: Shift[] = [
    {
      id: 'shift-001',
      userId: 'user-employee-001',
      siteId: 'site-001',
      clockInTime: new Date(daysAgo(3).setHours(18, 0, 0)).toISOString(),
      clockInPhotoDataUrl: '',
      clockOutTime: new Date(daysAgo(3).setHours(20, 30, 0)).toISOString(),
      clockOutPhotoDataUrl: '',
      durationMinutes: 150,
      checklistCompletions: [
        { itemId: 'cl-001', completed: true },
        { itemId: 'cl-002', completed: true },
        { itemId: 'cl-003', completed: true },
        { itemId: 'cl-004', completed: true },
        { itemId: 'cl-005', completed: true },
        { itemId: 'cl-006', completed: true },
      ],
      notes: '',
      status: 'completed',
      createdAt: daysAgo(3).toISOString(),
    },
    {
      id: 'shift-002',
      userId: 'user-employee-001',
      siteId: 'site-003',
      clockInTime: new Date(daysAgo(2).setHours(19, 0, 0)).toISOString(),
      clockInPhotoDataUrl: '',
      clockOutTime: new Date(daysAgo(2).setHours(21, 15, 0)).toISOString(),
      clockOutPhotoDataUrl: '',
      durationMinutes: 135,
      checklistCompletions: [
        { itemId: 'cl-011', completed: true },
        { itemId: 'cl-012', completed: true },
        { itemId: 'cl-013', completed: true },
        { itemId: 'cl-014', completed: true },
        { itemId: 'cl-015', completed: false },
      ],
      notes: 'Ran out of trash liners',
      status: 'completed',
      createdAt: daysAgo(2).toISOString(),
    },
    {
      id: 'shift-003',
      userId: 'user-partner-001',
      siteId: 'site-002',
      clockInTime: new Date(daysAgo(1).setHours(17, 30, 0)).toISOString(),
      clockInPhotoDataUrl: '',
      clockOutTime: new Date(daysAgo(1).setHours(19, 0, 0)).toISOString(),
      clockOutPhotoDataUrl: '',
      durationMinutes: 90,
      checklistCompletions: [
        { itemId: 'cl-007', completed: true },
        { itemId: 'cl-008', completed: true },
        { itemId: 'cl-009', completed: true },
        { itemId: 'cl-010', completed: true },
      ],
      notes: '',
      status: 'completed',
      createdAt: daysAgo(1).toISOString(),
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay-001',
      siteId: 'site-001',
      amount: 280,
      date: daysAgo(5).toISOString().split('T')[0],
      method: 'etransfer',
      forPeriod: 'Week of ' + daysAgo(7).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }),
      isPaid: true,
      notes: '',
      createdAt: daysAgo(5).toISOString(),
    },
    {
      id: 'pay-002',
      siteId: 'site-003',
      amount: 320,
      date: daysAgo(3).toISOString().split('T')[0],
      method: 'cheque',
      forPeriod: 'Week of ' + daysAgo(7).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }),
      isPaid: true,
      notes: 'Cheque #4521',
      createdAt: daysAgo(3).toISOString(),
    },
    {
      id: 'pay-003',
      siteId: 'site-002',
      amount: 180,
      date: daysAgo(1).toISOString().split('T')[0],
      method: 'etransfer',
      forPeriod: 'Biweekly ending ' + daysAgo(1).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }),
      isPaid: false,
      notes: 'Awaiting payment',
      createdAt: daysAgo(1).toISOString(),
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-001',
      description: 'Cleaning supplies from Costco',
      amount: 87.45,
      category: 'supplies',
      date: daysAgo(6).toISOString().split('T')[0],
      siteId: null,
      receiptPhotoDataUrl: null,
      notes: 'Lysol wipes, mop heads, trash bags',
      createdAt: daysAgo(6).toISOString(),
    },
    {
      id: 'exp-002',
      description: 'Gas for van',
      amount: 65.00,
      category: 'fuel',
      date: daysAgo(4).toISOString().split('T')[0],
      siteId: null,
      receiptPhotoDataUrl: null,
      notes: '',
      createdAt: daysAgo(4).toISOString(),
    },
  ];

  const tasks: Task[] = [
    {
      id: 'task-001',
      title: 'Restock cleaning supplies',
      description: 'Buy Lysol wipes, mop heads, trash bags (large and small), bleach',
      assignedUserId: 'user-owner-001',
      siteId: null,
      priority: 'medium',
      status: 'todo',
      dueDate: null,
      isRecurring: false,
      recurringFrequency: null,
      completedAt: null,
      createdAt: now,
    },
    {
      id: 'task-002',
      title: 'Renew insurance policy',
      description: 'Contact broker before end of month',
      assignedUserId: 'user-owner-001',
      siteId: null,
      priority: 'urgent',
      status: 'todo',
      dueDate: null,
      isRecurring: false,
      recurringFrequency: null,
      completedAt: null,
      createdAt: now,
    },
    {
      id: 'task-003',
      title: 'Deep clean Heartland Dental washrooms',
      description: 'Monthly deep clean including grout scrubbing',
      assignedUserId: 'user-employee-001',
      siteId: 'site-003',
      priority: 'medium',
      status: 'inprogress',
      dueDate: null,
      isRecurring: false,
      recurringFrequency: null,
      completedAt: null,
      createdAt: now,
    },
  ];

  const settings: AppSettings = {
    businessName: 'TSS Cleaners',
    ownerName: 'Ahraz Malik',
    currency: 'CAD',
    payPeriod: 'biweekly',
    dataVersion: 1,
  };

  setUsers(users);
  setSites(sites);
  setShifts(shifts);
  setPayments(payments);
  setExpenses(expenses);
  setPayroll([]);
  setTasks(tasks);
  setSettings(settings);
}

// --- Load All State ---

export function loadAllState() {
  return {
    users: getUsers(),
    sites: getSites(),
    shifts: getShifts(),
    payments: getPayments(),
    expenses: getExpenses(),
    payroll: getPayroll(),
    tasks: getTasks(),
    settings: getSettings() || {
      businessName: 'TSS Cleaners',
      ownerName: 'Ahraz Malik',
      currency: 'CAD',
      payPeriod: 'biweekly' as const,
      dataVersion: 1,
    },
    session: getSession(),
  };
}

// --- Persist State ---

export function persistState(state: {
  users: User[];
  sites: Site[];
  shifts: Shift[];
  payments: Payment[];
  expenses: Expense[];
  payroll: PayrollRecord[];
  tasks: Task[];
  settings: AppSettings;
}) {
  setUsers(state.users);
  setSites(state.sites);
  setShifts(state.shifts);
  setPayments(state.payments);
  setExpenses(state.expenses);
  setPayroll(state.payroll);
  setTasks(state.tasks);
  setSettings(state.settings);
}
