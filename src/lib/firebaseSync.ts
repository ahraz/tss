import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  User, Site, Shift, Payment, Expense, PayrollRecord, Task, Client, Quote, AppSettings, AppAction,
  SupplyItem, SiteInventory, Inspection, InspectionItem, IncidentReport, CallLogEntry, Lead
} from '../types';

/**
 * Shared helper to convert a Firestore snapshot into a typed object,
 * preferring the `id` field from the document data over the snapshot key.
 */
function docToObj<T extends { id?: string }>(snap: { id: string; data(): Record<string, any> }): T {
  const data = snap.data();
  return { ...data, id: data?.id ?? snap.id } as T;
}
export function sanitizeForFirestore<T>(val: T): any {
  if (val === undefined || val === null) {
    return null;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore);
  }
  if (typeof val === 'object') {
    const res: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        // Convert undefined to null so Firestore keeps/clears the field
        res[key] = sanitizeForFirestore(val[key]);
      }
    }
    return res;
  }
  return val;
}

export async function fetchAllCollectionsOnce() {
  const [
    usersSnap,
    sitesSnap,
    shiftsSnap,
    paymentsSnap,
    expensesSnap,
    payrollSnap,
    tasksSnap,
    clientsSnap,
    quotesSnap,
    supplyItemsSnap,
    siteInventorySnap,
    inspectionsSnap,
    inspectionTemplatesSnap,
    incidentReportsSnap,
    callLogsSnap,
    leadsSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'sites')),
    getDocs(collection(db, 'shifts')),
    getDocs(collection(db, 'payments')),
    getDocs(collection(db, 'expenses')),
    getDocs(collection(db, 'payroll')),
    getDocs(collection(db, 'tasks')),
    getDocs(collection(db, 'clients')),
    getDocs(collection(db, 'quotes')),
    getDocs(collection(db, 'supplyItems')),
    getDocs(collection(db, 'siteInventory')),
    getDocs(collection(db, 'inspections')),
    getDocs(collection(db, 'inspectionTemplates')),
    getDocs(collection(db, 'incidentReports')),
    getDocs(collection(db, 'callLogs')),
    getDocs(collection(db, 'leads')),
  ]);

  const users = usersSnap.docs.map(d => docToObj<User>(d));
  const sites = sitesSnap.docs.map(d => docToObj<Site>(d));
  const shifts = shiftsSnap.docs.map(d => docToObj<Shift>(d));
  const payments = paymentsSnap.docs.map(d => docToObj<Payment>(d));
  const expenses = expensesSnap.docs.map(d => docToObj<Expense>(d));
  const payroll = payrollSnap.docs.map(d => docToObj<PayrollRecord>(d));
  const tasks = tasksSnap.docs.map(d => docToObj<Task>(d));
  const clients = clientsSnap.docs.map(d => docToObj<Client>(d));
  const quotes = quotesSnap.docs.map(d => docToObj<Quote>(d));
  const supplyItems = supplyItemsSnap.docs.map(d => docToObj<SupplyItem>(d));
  const siteInventory = siteInventorySnap.docs.map(d => docToObj<SiteInventory>(d));
  const inspections = inspectionsSnap.docs.map(d => docToObj<Inspection>(d));
  const inspectionTemplates = inspectionTemplatesSnap.docs.map(d => docToObj<InspectionItem>(d));
  const incidentReports = incidentReportsSnap.docs.map(d => docToObj<IncidentReport>(d));
  const callLogs = callLogsSnap.docs.map(d => docToObj<CallLogEntry>(d));
  const leads = leadsSnap.docs.map(d => docToObj<Lead>(d));

  const settingsSnap = await getDoc(doc(db, 'settings', 'current'));
  const settings = settingsSnap.exists() ? (settingsSnap.data() as AppSettings) : null;

  return { users, sites, shifts, payments, expenses, payroll, tasks, clients, quotes, supplyItems, siteInventory, inspections, inspectionTemplates, incidentReports, callLogs, leads, settings };
}

/**
 * Sets up real-time onSnapshot listeners for all Firestore collections.
 * Dispatches BULK update actions whenever a change is made, keeping the UI instantly updated.
 */
export function subscribeToCollections(
  dispatch: (action: AppAction) => void,
  onError?: (source: string, err: unknown) => void
) {

  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const list: User[] = [];
      snapshot.forEach(doc => list.push(docToObj<User>(doc)));
      dispatch({ type: 'SET_USERS', payload: list });
    },
    (err) => onError?.('users', err)
  );

  const unsubSites = onSnapshot(
    collection(db, 'sites'),
    (snapshot) => {
      const list: Site[] = [];
      snapshot.forEach(doc => list.push(docToObj<Site>(doc)));
      dispatch({ type: 'SET_SITES', payload: list });
    },
    (err) => onError?.('sites', err)
  );

  const unsubShifts = onSnapshot(
    collection(db, 'shifts'),
    (snapshot) => {
      const list: Shift[] = [];
      snapshot.forEach(doc => list.push(docToObj<Shift>(doc)));
      dispatch({ type: 'SET_SHIFTS', payload: list });
    },
    (err) => onError?.('shifts', err)
  );

  const unsubPayments = onSnapshot(
    collection(db, 'payments'),
    (snapshot) => {
      const list: Payment[] = [];
      snapshot.forEach(doc => list.push(docToObj<Payment>(doc)));
      dispatch({ type: 'SET_PAYMENTS', payload: list });
    },
    (err) => onError?.('payments', err)
  );

  const unsubExpenses = onSnapshot(
    collection(db, 'expenses'),
    (snapshot) => {
      const list: Expense[] = [];
      snapshot.forEach(doc => list.push(docToObj<Expense>(doc)));
      dispatch({ type: 'SET_EXPENSES', payload: list });
    },
    (err) => onError?.('expenses', err)
  );

  const unsubPayroll = onSnapshot(
    collection(db, 'payroll'),
    (snapshot) => {
      const list: PayrollRecord[] = [];
      snapshot.forEach(doc => list.push(docToObj<PayrollRecord>(doc)));
      dispatch({ type: 'SET_PAYROLL', payload: list });
    },
    (err) => onError?.('payroll', err)
  );

  const unsubTasks = onSnapshot(
    collection(db, 'tasks'),
    (snapshot) => {
      const list: Task[] = [];
      snapshot.forEach(doc => list.push(docToObj<Task>(doc)));
      dispatch({ type: 'SET_TASKS', payload: list });
    },
    (err) => onError?.('tasks', err)
  );

  const unsubClients = onSnapshot(
    collection(db, 'clients'),
    (snapshot) => {
      const list: Client[] = [];
      snapshot.forEach(doc => list.push(docToObj<Client>(doc)));
      dispatch({ type: 'SET_CLIENTS', payload: list });
    },
    (err) => onError?.('clients', err)
  );

  const unsubQuotes = onSnapshot(
    collection(db, 'quotes'),
    (snapshot) => {
      const list: Quote[] = [];
      snapshot.forEach(doc => list.push(docToObj<Quote>(doc)));
      dispatch({ type: 'SET_QUOTES', payload: list });
    },
    (err) => onError?.('quotes', err)
  );

  const unsubSettings = onSnapshot(
    doc(db, 'settings', 'current'),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppSettings;
        dispatch({ type: 'SET_SETTINGS', payload: data });
      }
    },
    (err) => onError?.('settings', err)
  );

  // New collections
  const unsubSupplyItems = onSnapshot(
    collection(db, 'supplyItems'),
    (snapshot) => {
      const list: SupplyItem[] = [];
      snapshot.forEach(doc => list.push(docToObj<SupplyItem>(doc)));
      dispatch({ type: 'SET_SUPPLY_ITEMS', payload: list });
    },
    (err) => onError?.('supplyItems', err)
  );

  const unsubSiteInventory = onSnapshot(
    collection(db, 'siteInventory'),
    (snapshot) => {
      const list: SiteInventory[] = [];
      snapshot.forEach(doc => list.push(docToObj<SiteInventory>(doc)));
      dispatch({ type: 'SET_SITE_INVENTORY', payload: list });
    },
    (err) => onError?.('siteInventory', err)
  );

  const unsubInspections = onSnapshot(
    collection(db, 'inspections'),
    (snapshot) => {
      const list: Inspection[] = [];
      snapshot.forEach(doc => list.push(docToObj<Inspection>(doc)));
      dispatch({ type: 'SET_INSPECTIONS', payload: list });
    },
    (err) => onError?.('inspections', err)
  );

  const unsubInspectionTemplates = onSnapshot(
    collection(db, 'inspectionTemplates'),
    (snapshot) => {
      const list: InspectionItem[] = [];
      snapshot.forEach(doc => list.push(docToObj<InspectionItem>(doc)));
      dispatch({ type: 'SET_INSPECTION_TEMPLATES', payload: list });
    },
    (err) => onError?.('inspectionTemplates', err)
  );

  const unsubIncidentReports = onSnapshot(
    collection(db, 'incidentReports'),
    (snapshot) => {
      const list: IncidentReport[] = [];
      snapshot.forEach(doc => list.push(docToObj<IncidentReport>(doc)));
      dispatch({ type: 'SET_INCIDENT_REPORTS', payload: list });
    },
    (err) => onError?.('incidentReports', err)
  );

  const unsubCallLogs = onSnapshot(
    collection(db, 'callLogs'),
    (snapshot) => {
      const list: CallLogEntry[] = [];
      snapshot.forEach(doc => list.push(docToObj<CallLogEntry>(doc)));
      dispatch({ type: 'SET_CALL_LOGS', payload: list });
    },
    (err) => onError?.('callLogs', err)
  );

  const unsubLeads = onSnapshot(
    collection(db, 'leads'),
    (snapshot) => {
      const list: Lead[] = [];
      snapshot.forEach(doc => list.push(docToObj<Lead>(doc)));
      dispatch({ type: 'SET_LEADS', payload: list });
    },
    (err) => onError?.('leads', err)
  );

  // Return unsubscribe cleanup function
  return () => {
    unsubUsers();
    unsubSites();
    unsubShifts();
    unsubPayments();
    unsubExpenses();
    unsubPayroll();
    unsubTasks();
    unsubClients();
    unsubQuotes();
    unsubSettings();
    unsubSupplyItems();
    unsubSiteInventory();
    unsubInspections();
    unsubInspectionTemplates();
    unsubIncidentReports();
    unsubCallLogs();
    unsubLeads();
  };
}

/**
 * Handles database-modifying actions by executing async writes or deletes in Cloud Firestore.
 * By using this centralized helper, the rest of the app's components do not need to change!
 */
export async function syncActionToFirestore(action: AppAction, currentSettings?: AppSettings): Promise<void> {
  try {
    switch (action.type) {
      // Users
      case 'ADD_USER':
      case 'UPDATE_USER':
        if (!action.payload.id) return;
        await setDoc(doc(db, 'users', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_USER':
        await deleteDoc(doc(db, 'users', action.payload));
        break;

      // Sites
      case 'ADD_SITE':
      case 'UPDATE_SITE':
        await setDoc(doc(db, 'sites', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_SITE':
        await deleteDoc(doc(db, 'sites', action.payload));
        break;

      // Shifts
      case 'ADD_SHIFT':
      case 'UPDATE_SHIFT':
        await setDoc(doc(db, 'shifts', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_SHIFT':
        await deleteDoc(doc(db, 'shifts', action.payload));
        break;

      // Payments
      case 'ADD_PAYMENT':
      case 'UPDATE_PAYMENT':
        await setDoc(doc(db, 'payments', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_PAYMENT':
        await deleteDoc(doc(db, 'payments', action.payload));
        break;

      // Expenses
      case 'ADD_EXPENSE':
      case 'UPDATE_EXPENSE':
        await setDoc(doc(db, 'expenses', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_EXPENSE':
        await deleteDoc(doc(db, 'expenses', action.payload));
        break;

      // Payroll
      case 'ADD_PAYROLL':
      case 'UPDATE_PAYROLL':
        await setDoc(doc(db, 'payroll', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_PAYROLL':
        await deleteDoc(doc(db, 'payroll', action.payload));
        break;

      // Tasks
      case 'ADD_TASK':
      case 'UPDATE_TASK':
        await setDoc(doc(db, 'tasks', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_TASK':
        await deleteDoc(doc(db, 'tasks', action.payload));
        break;

      // Clients
      case 'ADD_CLIENT':
      case 'UPDATE_CLIENT':
        await setDoc(doc(db, 'clients', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_CLIENT':
        await deleteDoc(doc(db, 'clients', action.payload));
        break;

      // Quotes
      case 'ADD_QUOTE':
      case 'UPDATE_QUOTE':
        await setDoc(doc(db, 'quotes', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_QUOTE':
        await deleteDoc(doc(db, 'quotes', action.payload));
        break;

      // Settings
      case 'UPDATE_SETTINGS':
        if (currentSettings) {
          await setDoc(doc(db, 'settings', 'current'), sanitizeForFirestore({ ...currentSettings, ...action.payload }), { merge: true });
        }
        break;

      // Inventory
      case 'ADD_SUPPLY_ITEM':
      case 'UPDATE_SUPPLY_ITEM':
        await setDoc(doc(db, 'supplyItems', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_SUPPLY_ITEM':
        await deleteDoc(doc(db, 'supplyItems', action.payload));
        break;
      case 'ADD_SITE_INVENTORY':
      case 'UPDATE_SITE_INVENTORY':
        await setDoc(doc(db, 'siteInventory', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_SITE_INVENTORY':
        await deleteDoc(doc(db, 'siteInventory', action.payload));
        break;

      // Inspections
      case 'ADD_INSPECTION':
      case 'UPDATE_INSPECTION':
        await setDoc(doc(db, 'inspections', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_INSPECTION':
        await deleteDoc(doc(db, 'inspections', action.payload));
        break;
      case 'ADD_INSPECTION_TEMPLATE':
        await setDoc(doc(db, 'inspectionTemplates', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_INSPECTION_TEMPLATE':
        await deleteDoc(doc(db, 'inspectionTemplates', action.payload));
        break;

      // Incidents
      case 'ADD_INCIDENT_REPORT':
      case 'UPDATE_INCIDENT_REPORT':
        await setDoc(doc(db, 'incidentReports', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;
      case 'DELETE_INCIDENT_REPORT':
        await deleteDoc(doc(db, 'incidentReports', action.payload));
        break;

      // Call Logs
      case 'ADD_CALL_LOG':
      case 'UPDATE_CALL_LOG':
        await setDoc(doc(db, 'callLogs', action.payload.id), sanitizeForFirestore(action.payload), { merge: true });
        break;

      // Leads — bulk replace from Sheets import
      case 'SET_LEADS':
        const leadsBatch = writeBatch(db);
        // Delete all existing leads first (idempotent import)
        const existingLeads = await getDocs(collection(db, 'leads'));
        existingLeads.docs.forEach(d => leadsBatch.delete(d.ref));
        // Write all incoming leads
        for (const lead of action.payload) {
          const docRef = doc(db, 'leads', lead.placeId || lead.rowIndex.toString());
          leadsBatch.set(docRef, sanitizeForFirestore(lead));
        }
        await leadsBatch.commit();
        break;

      // Import data (Bulk setup)
      case 'IMPORT_DATA':
        for (const item of action.payload.users) {
          await setDoc(doc(db, 'users', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.sites) {
          await setDoc(doc(db, 'sites', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.shifts) {
          await setDoc(doc(db, 'shifts', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.payments) {
          await setDoc(doc(db, 'payments', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.expenses) {
          await setDoc(doc(db, 'expenses', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.payroll) {
          await setDoc(doc(db, 'payroll', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.tasks) {
          await setDoc(doc(db, 'tasks', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.clients) {
          await setDoc(doc(db, 'clients', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.quotes) {
          await setDoc(doc(db, 'quotes', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.supplyItems) {
          await setDoc(doc(db, 'supplyItems', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.siteInventory) {
          await setDoc(doc(db, 'siteInventory', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.inspections) {
          await setDoc(doc(db, 'inspections', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.inspectionTemplates) {
          await setDoc(doc(db, 'inspectionTemplates', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.incidentReports) {
          await setDoc(doc(db, 'incidentReports', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.callLogs) {
          await setDoc(doc(db, 'callLogs', item.id), sanitizeForFirestore(item));
        }
        for (const item of action.payload.leads) {
          const ref = doc(db, 'leads', item.placeId || item.rowIndex.toString());
          await setDoc(ref, sanitizeForFirestore(item));
        }
        await setDoc(doc(db, 'settings', 'current'), sanitizeForFirestore(action.payload.settings));
        break;

      case 'CLEAR_ALL_DATA':
        const collectionsToClear = ['users', 'sites', 'shifts', 'payments', 'expenses', 'payroll', 'tasks', 'clients', 'quotes', 'supplyItems', 'siteInventory', 'inspections', 'inspectionTemplates', 'incidentReports', 'callLogs', 'leads'];
        for (const colName of collectionsToClear) {
          const snap = await getDocs(collection(db, colName));
          for (const docObj of snap.docs) {
            await deleteDoc(doc(db, colName, docObj.id));
          }
        }
        await deleteDoc(doc(db, 'settings', 'current'));
        break;

      default:
        break;
    }
  } catch (error) {
    console.error('Error syncing action to Firestore:', error);
    throw error;
  }
}

// ─── First-time seed ─────────────────────────────────────────

const DEFAULT_USERS: User[] = [
  {
    id: 'user-owner-001',
    name: 'Ahraz Malik',
    role: 'owner',
    pin: '1234',
    avatarInitials: 'AM',
    avatarColor: 'bg-blue-600',
    hourlyRate: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-partner-yh',
    name: 'Yusuf Haque',
    role: 'partner',
    pin: '4321',
    avatarInitials: 'YH',
    avatarColor: 'bg-purple-600',
    hourlyRate: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-partner-sm',
    name: 'Shadan Malik',
    role: 'partner',
    pin: '4321',
    avatarInitials: 'SM',
    avatarColor: 'bg-green-600',
    hourlyRate: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-employee-001',
    name: 'Sandy',
    role: 'employee',
    pin: '3456',
    avatarInitials: 'S',
    avatarColor: 'bg-orange-600',
    hourlyRate: 18.50,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SITES: Site[] = [
  {
    id: 'site-001',
    name: 'Brampton Medical Clinic',
    address: '123 Queen St W',
    city: 'Brampton',
    province: 'ON',
    postalCode: 'L6X 1A1',
    areaTags: ['L6X', 'Brampton-North'],
    type: 'clinic',
    contactName: 'Dr. Patel',
    contactPhone: '905-555-0101',
    contractRate: 280,
    frequency: 'weekly',
    cleaningDays: ['monday', 'thursday'],
    scheduleStart: '17:00',
    scheduleEnd: '19:00',
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
    clientId: null,
    isSubSite: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-002',
    name: 'Gateway Plaza Office',
    address: '456 Bovaird Dr E, Unit 7',
    city: 'Brampton',
    province: 'ON',
    postalCode: 'L6Z 2N8',
    areaTags: ['L6Z', 'Brampton-East'],
    type: 'office',
    contactName: 'Sandra Mills',
    contactPhone: '905-555-0202',
    contractRate: 180,
    frequency: 'biweekly',
    cleaningDays: ['wednesday'],
    scheduleStart: '17:00',
    scheduleEnd: '19:00',
    assignedUserIds: ['user-employee-001', 'user-partner-yh'],
    accessNotes: 'Buzz unit 7. Sandra leaves key under mat after 5pm.',
    status: 'active',
    checklist: [
      { id: 'cl-007', label: 'Vacuum carpets', order: 1 },
      { id: 'cl-008', label: 'Wipe all desks', order: 2 },
      { id: 'cl-009', label: 'Clean kitchen area', order: 3 },
      { id: 'cl-010', label: 'Empty trash', order: 4 },
    ],
    clientId: null,
    isSubSite: false,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Seed default users and sites into Firestore if the database is empty.
 * This runs once on first load after localStorage removal.
 */
export async function seedIfEmpty(): Promise<void> {
  const settingsSnap = await getDoc(doc(db, 'settings', 'current'));
  const settings: AppSettings = settingsSnap.exists()
    ? (settingsSnap.data() as AppSettings)
    : {
        businessName: 'TSS Cleaners',
        ownerName: 'Ahraz Malik',
        currency: 'CAD',
        payPeriod: 'biweekly',
        dataVersion: 1,
      };

  for (const user of DEFAULT_USERS) {
    await setDoc(doc(db, 'users', user.id), sanitizeForFirestore(user));
  }
  for (const site of DEFAULT_SITES) {
    await setDoc(doc(db, 'sites', site.id), sanitizeForFirestore(site));
  }
  await setDoc(doc(db, 'settings', 'current'), sanitizeForFirestore(settings));

  console.log('✅ Seeded default data into Firestore');
}
