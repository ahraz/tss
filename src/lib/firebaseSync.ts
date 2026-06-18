import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  User, Site, Shift, Payment, Expense, PayrollRecord, Task, Client, Quote, AppSettings, AppAction,
  SupplyItem, SiteInventory, Inspection, InspectionItem, IncidentReport
} from '../types';
import { loadAllState } from '../utils/storage';

/**
 * Recursively removes any undefined fields from objects/arrays to satisfy Firestore's strict schema rules.
 */
export function sanitizeForFirestore<T>(val: T): any {
  if (val === undefined) {
    return null;
  }
  if (val === null) {
    return null;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore);
  }
  if (typeof val === 'object') {
    const res: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        const value = val[key];
        if (value !== undefined) {
          res[key] = sanitizeForFirestore(value);
        } else {
          // Persist null so Firestore keeps the field key. Otherwise setDoc
          // drops the key entirely, and the next read loses the field.
          res[key] = null;
        }
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
  ]);

  const mapDoc = <T extends { id?: string }>(snap: { id: string; data(): Record<string, any> }): T => {
    const data = snap.data();
    return { ...data, id: data?.id ?? snap.id } as T;
  };

  const users = usersSnap.docs.map(d => mapDoc<User>(d));
  const sites = sitesSnap.docs.map(d => mapDoc<Site>(d));
  const shifts = shiftsSnap.docs.map(d => mapDoc<Shift>(d));
  const payments = paymentsSnap.docs.map(d => mapDoc<Payment>(d));
  const expenses = expensesSnap.docs.map(d => mapDoc<Expense>(d));
  const payroll = payrollSnap.docs.map(d => mapDoc<PayrollRecord>(d));
  const tasks = tasksSnap.docs.map(d => mapDoc<Task>(d));
  const clients = clientsSnap.docs.map(d => mapDoc<Client>(d));
  const quotes = quotesSnap.docs.map(d => mapDoc<Quote>(d));
  const supplyItems = supplyItemsSnap.docs.map(d => mapDoc<SupplyItem>(d));
  const siteInventory = siteInventorySnap.docs.map(d => mapDoc<SiteInventory>(d));
  const inspections = inspectionsSnap.docs.map(d => mapDoc<Inspection>(d));
  const inspectionTemplates = inspectionTemplatesSnap.docs.map(d => mapDoc<InspectionItem>(d));
  const incidentReports = incidentReportsSnap.docs.map(d => mapDoc<IncidentReport>(d));

  const settingsSnap = await getDoc(doc(db, 'settings', 'current'));
  const settings = settingsSnap.exists() ? (settingsSnap.data() as AppSettings) : null;

  return { users, sites, shifts, payments, expenses, payroll, tasks, clients, quotes, supplyItems, siteInventory, inspections, inspectionTemplates, incidentReports, settings };
}

/**
 * Force-pushes all local data to Firestore, overwriting existing documents.
 * This ensures rich profile fields (photoId, email, skills, etc.) and new
 * collections (supplyItems, incidentReports, etc.) are all present in Firestore.
 * Runs only once — guarded by a data version flag.
 */
export async function migrateLocalToFirebase(): Promise<void> {
  const version = localStorage.getItem('cleanops_data_version');
  if (version === '2') return; // already migrated

  try {
    const localData = loadAllState();

    const pushCollection = async <T extends { id: string }>(colName: string, items: T[]) => {
      if (items.length === 0) return;
      console.log(`Pushing ${items.length} ${colName} to Firestore...`);
      for (const item of items) {
        await setDoc(doc(db, colName, item.id), sanitizeForFirestore(item));
      }
    };

    // Push ALL local data to Firestore regardless of what's already there
    await pushCollection('users', localData.users);
    await pushCollection('sites', localData.sites);
    await pushCollection('shifts', localData.shifts);
    await pushCollection('payments', localData.payments);
    await pushCollection('expenses', localData.expenses);
    await pushCollection('payroll', localData.payroll);
    await pushCollection('tasks', localData.tasks);
    await pushCollection('clients', localData.clients);
    await pushCollection('quotes', localData.quotes);
    await pushCollection('supplyItems', localData.supplyItems);
    await pushCollection('siteInventory', localData.siteInventory);
    await pushCollection('inspections', localData.inspections);
    await pushCollection('inspectionTemplates', localData.inspectionTemplates);
    await pushCollection('incidentReports', localData.incidentReports);

    if (localData.settings) {
      await setDoc(doc(db, 'settings', 'current'), sanitizeForFirestore(localData.settings));
    }

    localStorage.setItem('cleanops_data_version', '2');
    console.log('Firestore migration complete — all local data pushed to cloud.');
  } catch (error) {
    console.error('Error migrating local data to Firebase:', error);
  }
}

/**
 * Sets up real-time onSnapshot listeners for all Firestore collections.
 * Dispatches BULK update actions whenever a change is made, keeping the UI instantly updated.
 */
export function subscribeToCollections(
  dispatch: (action: AppAction) => void,
  onError?: (source: string, err: unknown) => void
) {
  const ensureId = <T extends { id?: string }>(snap: { id: string; data(): Record<string, any> }): T => {
    const data = snap.data();
    return { ...data, id: data?.id ?? snap.id } as T;
  };

  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const list: User[] = [];
      snapshot.forEach(doc => list.push(ensureId<User>(doc)));
      dispatch({ type: 'SET_USERS', payload: list });
    },
    (err) => onError?.('users', err)
  );

  const unsubSites = onSnapshot(
    collection(db, 'sites'),
    (snapshot) => {
      const list: Site[] = [];
      snapshot.forEach(doc => list.push(ensureId<Site>(doc)));
      dispatch({ type: 'SET_SITES', payload: list });
    },
    (err) => onError?.('sites', err)
  );

  const unsubShifts = onSnapshot(
    collection(db, 'shifts'),
    (snapshot) => {
      const list: Shift[] = [];
      snapshot.forEach(doc => list.push(ensureId<Shift>(doc)));
      dispatch({ type: 'SET_SHIFTS', payload: list });
    },
    (err) => onError?.('shifts', err)
  );

  const unsubPayments = onSnapshot(
    collection(db, 'payments'),
    (snapshot) => {
      const list: Payment[] = [];
      snapshot.forEach(doc => list.push(ensureId<Payment>(doc)));
      dispatch({ type: 'SET_PAYMENTS', payload: list });
    },
    (err) => onError?.('payments', err)
  );

  const unsubExpenses = onSnapshot(
    collection(db, 'expenses'),
    (snapshot) => {
      const list: Expense[] = [];
      snapshot.forEach(doc => list.push(ensureId<Expense>(doc)));
      dispatch({ type: 'SET_EXPENSES', payload: list });
    },
    (err) => onError?.('expenses', err)
  );

  const unsubPayroll = onSnapshot(
    collection(db, 'payroll'),
    (snapshot) => {
      const list: PayrollRecord[] = [];
      snapshot.forEach(doc => list.push(ensureId<PayrollRecord>(doc)));
      dispatch({ type: 'SET_PAYROLL', payload: list });
    },
    (err) => onError?.('payroll', err)
  );

  const unsubTasks = onSnapshot(
    collection(db, 'tasks'),
    (snapshot) => {
      const list: Task[] = [];
      snapshot.forEach(doc => list.push(ensureId<Task>(doc)));
      dispatch({ type: 'SET_TASKS', payload: list });
    },
    (err) => onError?.('tasks', err)
  );

  const unsubClients = onSnapshot(
    collection(db, 'clients'),
    (snapshot) => {
      const list: Client[] = [];
      snapshot.forEach(doc => list.push(ensureId<Client>(doc)));
      dispatch({ type: 'SET_CLIENTS', payload: list });
    },
    (err) => onError?.('clients', err)
  );

  const unsubQuotes = onSnapshot(
    collection(db, 'quotes'),
    (snapshot) => {
      const list: Quote[] = [];
      snapshot.forEach(doc => list.push(ensureId<Quote>(doc)));
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
      snapshot.forEach(doc => list.push(ensureId<SupplyItem>(doc)));
      dispatch({ type: 'SET_SUPPLY_ITEMS', payload: list });
    },
    (err) => onError?.('supplyItems', err)
  );

  const unsubSiteInventory = onSnapshot(
    collection(db, 'siteInventory'),
    (snapshot) => {
      const list: SiteInventory[] = [];
      snapshot.forEach(doc => list.push(ensureId<SiteInventory>(doc)));
      dispatch({ type: 'SET_SITE_INVENTORY', payload: list });
    },
    (err) => onError?.('siteInventory', err)
  );

  const unsubInspections = onSnapshot(
    collection(db, 'inspections'),
    (snapshot) => {
      const list: Inspection[] = [];
      snapshot.forEach(doc => list.push(ensureId<Inspection>(doc)));
      dispatch({ type: 'SET_INSPECTIONS', payload: list });
    },
    (err) => onError?.('inspections', err)
  );

  const unsubInspectionTemplates = onSnapshot(
    collection(db, 'inspectionTemplates'),
    (snapshot) => {
      const list: InspectionItem[] = [];
      snapshot.forEach(doc => list.push(ensureId<InspectionItem>(doc)));
      dispatch({ type: 'SET_INSPECTION_TEMPLATES', payload: list });
    },
    (err) => onError?.('inspectionTemplates', err)
  );

  const unsubIncidentReports = onSnapshot(
    collection(db, 'incidentReports'),
    (snapshot) => {
      const list: IncidentReport[] = [];
      snapshot.forEach(doc => list.push(ensureId<IncidentReport>(doc)));
      dispatch({ type: 'SET_INCIDENT_REPORTS', payload: list });
    },
    (err) => onError?.('incidentReports', err)
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
        await setDoc(doc(db, 'users', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_USER':
        await deleteDoc(doc(db, 'users', action.payload));
        break;

      // Sites
      case 'ADD_SITE':
      case 'UPDATE_SITE':
        await setDoc(doc(db, 'sites', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_SITE':
        await deleteDoc(doc(db, 'sites', action.payload));
        break;

      // Shifts
      case 'ADD_SHIFT':
      case 'UPDATE_SHIFT':
        await setDoc(doc(db, 'shifts', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_SHIFT':
        await deleteDoc(doc(db, 'shifts', action.payload));
        break;

      // Payments
      case 'ADD_PAYMENT':
      case 'UPDATE_PAYMENT':
        await setDoc(doc(db, 'payments', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_PAYMENT':
        await deleteDoc(doc(db, 'payments', action.payload));
        break;

      // Expenses
      case 'ADD_EXPENSE':
      case 'UPDATE_EXPENSE':
        await setDoc(doc(db, 'expenses', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_EXPENSE':
        await deleteDoc(doc(db, 'expenses', action.payload));
        break;

      // Payroll
      case 'ADD_PAYROLL':
      case 'UPDATE_PAYROLL':
        await setDoc(doc(db, 'payroll', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_PAYROLL':
        await deleteDoc(doc(db, 'payroll', action.payload));
        break;

      // Tasks
      case 'ADD_TASK':
      case 'UPDATE_TASK':
        await setDoc(doc(db, 'tasks', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_TASK':
        await deleteDoc(doc(db, 'tasks', action.payload));
        break;

      // Clients
      case 'ADD_CLIENT':
      case 'UPDATE_CLIENT':
        await setDoc(doc(db, 'clients', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_CLIENT':
        await deleteDoc(doc(db, 'clients', action.payload));
        break;

      // Quotes
      case 'ADD_QUOTE':
      case 'UPDATE_QUOTE':
        await setDoc(doc(db, 'quotes', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_QUOTE':
        await deleteDoc(doc(db, 'quotes', action.payload));
        break;

      // Settings
      case 'UPDATE_SETTINGS':
        if (currentSettings) {
          await setDoc(doc(db, 'settings', 'current'), sanitizeForFirestore({ ...currentSettings, ...action.payload }));
        }
        break;

      // Inventory
      case 'ADD_SUPPLY_ITEM':
      case 'UPDATE_SUPPLY_ITEM':
        await setDoc(doc(db, 'supplyItems', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_SUPPLY_ITEM':
        await deleteDoc(doc(db, 'supplyItems', action.payload));
        break;
      case 'ADD_SITE_INVENTORY':
      case 'UPDATE_SITE_INVENTORY':
        await setDoc(doc(db, 'siteInventory', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_SITE_INVENTORY':
        await deleteDoc(doc(db, 'siteInventory', action.payload));
        break;

      // Inspections
      case 'ADD_INSPECTION':
      case 'UPDATE_INSPECTION':
        await setDoc(doc(db, 'inspections', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_INSPECTION':
        await deleteDoc(doc(db, 'inspections', action.payload));
        break;
      case 'ADD_INSPECTION_TEMPLATE':
        await setDoc(doc(db, 'inspectionTemplates', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_INSPECTION_TEMPLATE':
        await deleteDoc(doc(db, 'inspectionTemplates', action.payload));
        break;

      // Incidents
      case 'ADD_INCIDENT_REPORT':
      case 'UPDATE_INCIDENT_REPORT':
        await setDoc(doc(db, 'incidentReports', action.payload.id), sanitizeForFirestore(action.payload));
        break;
      case 'DELETE_INCIDENT_REPORT':
        await deleteDoc(doc(db, 'incidentReports', action.payload));
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
        await setDoc(doc(db, 'settings', 'current'), sanitizeForFirestore(action.payload.settings));
        break;

      case 'CLEAR_ALL_DATA':
        const collectionsToClear = ['users', 'sites', 'shifts', 'payments', 'expenses', 'payroll', 'tasks', 'clients', 'quotes', 'supplyItems', 'siteInventory', 'inspections', 'inspectionTemplates', 'incidentReports'];
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
